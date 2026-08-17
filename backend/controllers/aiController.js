const aiService = require('../services/aiService');
const meetingRoomService = require('../services/meetingRoomService');

class AIController {
    translate(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { text, targetLanguage } = JSON.parse(body || '{}');
                if (!text) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'text is required' }));
                }

                if (!aiService.isConfigured) {
                    // Graceful fallback: return original if no API key
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        original: text,
                        translated: text,
                        targetLanguage: targetLanguage || 'English',
                        note: 'AI translation unavailable (GEMINI_API_KEY not set)'
                    }));
                }

                const result = await aiService.translate(text, targetLanguage || 'English');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    }

    memo(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { roomId, messages } = JSON.parse(body || '{}');

                // If roomId given, get messages from live room
                let chatMessages = messages;
                if (roomId && !chatMessages) {
                    const room = meetingRoomService.rooms.get(roomId.trim().toLowerCase());
                    chatMessages = room ? room.messages : [];
                }

                if (!aiService.isConfigured) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({
                        error: null,
                        memo: 'AI memo unavailable — add GEMINI_API_KEY to backend/.env to enable this feature.',
                        messageCount: chatMessages?.length || 0
                    }));
                }

                const result = await aiService.generateMemo(chatMessages || [], roomId || 'unknown');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    }

    suggest(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { lastMessage, context } = JSON.parse(body || '{}');
                if (!aiService.isConfigured) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ suggestion: '' }));
                }
                const result = await aiService.suggestReply(lastMessage || '', context || '');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    }

    status(_req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ configured: aiService.isConfigured }));
    }
}

module.exports = new AIController();
