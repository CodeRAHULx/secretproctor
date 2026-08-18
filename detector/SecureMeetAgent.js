#!/usr/bin/env node

/**
 * SecureMeet Candidate Proctoring Agent
 * Runs on the candidate's Windows PC, monitors local processes/windows,
 * and streams real-time telemetry to the SecureMeet cloud server.
 */

const https = require('https');
const http = require('http');
const readline = require('readline');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { scanForThreats } = require('./detector');

const DEFAULT_SERVER_URL = process.env.SECUREMEET_SERVER || 'https://secretproctor-production.up.railway.app';

// Path to compiled native C++ display affinity detector
const NATIVE_EXE = path.join(__dirname, '../native/bin/display_affinity_detector.exe');

async function sendTelemetryReport(serverUrl, payload) {
    return new Promise((resolve, reject) => {
        try {
            const urlObj = new URL(`${serverUrl.replace(/\/+$/, '')}/api/telemetry/report`);
            const isHttps = urlObj.protocol === 'https:';
            const client = isHttps ? https : http;

            const postData = JSON.stringify(payload);
            const req = client.request(urlObj, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 5000
            }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    resolve(data);
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Report request timed out'));
            });

            req.write(postData);
            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

async function scanNativeDisplayAffinity() {
    return new Promise((resolve) => {
        if (!fs.existsSync(NATIVE_EXE)) {
            return resolve([]);
        }

        exec(`"${NATIVE_EXE}" --json`, { timeout: 4000 }, (error, stdout) => {
            if (error && error.code === 2) return resolve([]);
            try {
                const text = (stdout || '').trim();
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    const rawThreats = parsed.threats || [];
                    const mapped = rawThreats.map(t => ({
                        title: t.title || t.windowTitle || 'Invisible Stealth Window',
                        pid: t.pid || t.processId || 0,
                        path: t.path || t.executablePath || 'WDA_EXCLUDEFROMCAPTURE',
                        affinity: t.affinity || 'WDA_EXCLUDEFROMCAPTURE',
                        type: 'invisible_screen_stealth'
                    }));
                    return resolve(mapped);
                }
            } catch {}
            resolve([]);
        });
    });
}

function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function main() {
    console.log('=============================================================');
    console.log('  🛡️  SecureMeet: Candidate Desktop Proctoring Agent         ');
    console.log('  👁️  Invisible Screen & Display Affinity Watchdog Active    ');
    console.log('=============================================================');

    let roomId = process.argv[2];
    let userName = process.argv[3];
    let serverUrl = process.argv[4] || DEFAULT_SERVER_URL;

    if (!roomId) {
        roomId = await prompt('Enter Meeting / Room Code: ');
    }

    if (!roomId) {
        console.error('❌ Room Code is required.');
        process.exit(1);
    }

    if (!userName) {
        userName = await prompt('Enter Candidate Name (optional, press Enter): ') || 'Candidate-Agent';
    }

    console.log(`\nConnecting agent to: ${serverUrl}`);
    console.log(`Monitoring Room: ${roomId}`);
    console.log(`Candidate Name: ${userName}`);
    
    if (fs.existsSync(NATIVE_EXE)) {
        console.log(`[Engine] C++ Win32 Display Affinity Engine: ACTIVE (${NATIVE_EXE})`);
    } else {
        console.log(`[Engine] Node.js Process & Screen Engine: ACTIVE`);
    }
    
    console.log(`\n[Agent] Scanning for Invisible Windows (WDA_EXCLUDEFROMCAPTURE), OBS, & Screen Captures...\n`);

    const userId = `agent_${userName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    setInterval(async () => {
        try {
            // 1. Scan for invisible / stealth display affinity windows
            const affinityThreats = await scanNativeDisplayAffinity();

            // 2. Scan for blacklisted background processes (OBS, AI tools, Screen Recorders)
            const processThreats = await scanForThreats();

            // Combine threats
            const allThreats = [...affinityThreats, ...processThreats];
            const hasThreat = allThreats.length > 0;
            const hasInvisibleWindow = affinityThreats.length > 0;

            if (hasInvisibleWindow) {
                console.log(`🚨 [STEALTH WINDOW DETECTED] Invisible overlay found via WDA_EXCLUDEFROMCAPTURE!`);
                affinityThreats.forEach(t => console.log(`   - "${t.title}" (PID: ${t.pid})`));
            } else if (hasThreat) {
                console.log(`⚠️ [THREAT DETECTED] ${allThreats.length} suspicious process(es) found:`);
                allThreats.forEach(t => console.log(`   - ${t.title || t.name} (PID: ${t.pid})`));
            }

            await sendTelemetryReport(serverUrl, {
                roomId,
                userId,
                connectionId: `agent_conn_${process.pid}`,
                source: 'windows-native-agent',
                threats: allThreats,
                checks: [
                    ['Display affinity', hasInvisibleWindow ? 'Invisible Screen Detected' : 'Clean', hasInvisibleWindow ? 'fail' : 'ok'],
                    ['Processes', hasThreat ? 'Suspicious Process' : 'Clean', hasThreat ? 'fail' : 'ok'],
                    ['Agent Status', 'Connected', 'ok']
                ]
            });
        } catch (err) {
            // Keep monitoring continuously
        }
    }, 2000);
}

main().catch(console.error);
