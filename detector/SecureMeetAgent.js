#!/usr/bin/env node

/**
 * SecureMeet Candidate Proctoring Agent
 * Runs on the candidate's Windows PC, monitors local processes/windows,
 * and streams real-time telemetry to the SecureMeet cloud server.
 */

const https = require('https');
const http = require('http');
const readline = require('readline');
const { scanForThreats } = require('./detector');

const DEFAULT_SERVER_URL = process.env.SECUREMEET_SERVER || 'https://secretproctor-production.up.railway.app';

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
    console.log(`\n[Agent] Scanning local processes and display capture tools...\n`);

    const userId = `agent_${userName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    setInterval(async () => {
        try {
            const threats = await scanForThreats();
            const hasThreat = threats && threats.length > 0;

            if (hasThreat) {
                console.log(`⚠️ [THREAT DETECTED] ${threats.length} suspicious process(es) found:`);
                threats.forEach(t => console.log(`   - ${t.title || t.name} (PID: ${t.pid})`));
            }

            await sendTelemetryReport(serverUrl, {
                roomId,
                userId,
                connectionId: `agent_conn_${process.pid}`,
                source: 'windows-native-agent',
                threats,
                checks: [
                    ['Display affinity', hasThreat ? 'Detected' : 'Clean', hasThreat ? 'fail' : 'ok'],
                    ['Agent Status', 'Connected', 'ok']
                ]
            });
        } catch (err) {
            // Keep monitoring continuously
        }
    }, 2000);
}

main().catch(console.error);
