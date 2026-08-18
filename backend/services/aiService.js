const https = require('https');
const http = require('http');
const logger = require('../utils/logger');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-1.5-flash-latest';
// In production, Python AI service is optional. If not set, falls back to Gemini API
const PYTHON_AI_URL = process.env.PYTHON_AI_URL || '';

function callPythonService(endpoint, body) {
    return new Promise((resolve, reject) => {
        // If Python AI URL is not configured, skip the service call
        if (!PYTHON_AI_URL) {
            return reject(new Error('Python AI service not configured'));
        }

        const url = new URL(endpoint, PYTHON_AI_URL);
        const data = JSON.stringify(body);
        const protocol = url.protocol === 'https:' ? https : http;

        const req = protocol.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            },
            timeout: 2500
        }, (res) => {
            let resData = '';
            res.on('data', chunk => { resData += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(resData)); } catch { reject(new Error('Invalid JSON')); }
                } else {
                    reject(new Error(`Python service status ${res.statusCode}`));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(data);
        req.end();
    });
}

function geminiDirectRequest(prompt) {
    return new Promise((resolve, reject) => {
        if (!GEMINI_API_KEY) {
            return reject(new Error('GEMINI_API_KEY is not configured in backend/.env'));
        }

        const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) return reject(new Error(parsed.error.message || 'Gemini API error'));
                    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    resolve(text.trim());
                } catch {
                    reject(new Error('Failed to parse Gemini response'));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

class AIService {
    async translate(text, targetLanguage = 'English') {
        // Try Python AI Microservice first
        try {
            const pyRes = await callPythonService('/api/v1/translate', { text, targetLanguage });
            if (pyRes && pyRes.translated) return pyRes;
        } catch (e) {
            // Python service not running or timed out; fall through to Node Gemini direct
        }

        const prompt = `You are a real-time meeting chat translator.
Translate the following message to ${targetLanguage}. 
If it is already in ${targetLanguage}, return it unchanged.
Only return the translated text, nothing else.

Message: "${text}"`;

        const translated = await geminiDirectRequest(prompt);
        return { original: text, translated, targetLanguage };
    }

    async generateMemo(messages, roomId) {
        if (!messages || messages.length === 0) {
            return { error: 'No messages to summarize' };
        }

        // Try Python AI Microservice first
        try {
            const pyRes = await callPythonService('/api/v1/memo', { roomId, messages });
            if (pyRes && pyRes.memo) return pyRes;
        } catch (e) {
            // Fall through to Node Gemini direct
        }

        const chatTranscript = messages
            .map(m => `[${m.timestamp || ''}] ${m.senderName}: ${m.text}`)
            .join('\n');

        const prompt = `You are a professional meeting assistant. Below is a chat transcript from a live video meeting session (Room: ${roomId}).

Please create a structured meeting memo including:
1. **Meeting Summary** (2-3 sentences describing what was discussed)
2. **Key Points** (bullet list of main topics/decisions)
3. **Action Items** (if any were mentioned)
4. **Participants** (list names that appeared)
5. **Sentiment** (overall tone: collaborative, tense, productive, etc.)

Keep it professional and concise.

---
CHAT TRANSCRIPT:
${chatTranscript}
---`;

        const memo = await geminiDirectRequest(prompt);
        return {
            roomId,
            generatedAt: new Date().toISOString(),
            messageCount: messages.length,
            memo
        };
    }

    get isConfigured() {
        return Boolean(GEMINI_API_KEY);
    }
}

module.exports = new AIService();
