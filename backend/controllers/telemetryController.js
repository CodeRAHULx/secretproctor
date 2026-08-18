const nativeWatchdogService = require('../services/nativeWatchdogService');
const meetingRoomService = require('../services/meetingRoomService');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');

class TelemetryController {
    streamTelemetry(req, res) {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        // Send current cached state
        const initialData = `data: ${JSON.stringify({
            timestamp: new Date().toISOString(),
            hasThreat: nativeWatchdogService.currentThreats.length > 0,
            threats: nativeWatchdogService.currentThreats
        })}\n\n`;
        res.write(initialData);

        nativeWatchdogService.subscribe(res);

        req.on('close', () => {
            nativeWatchdogService.unsubscribe(res);
        });
    }

    reportTelemetry(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const report = JSON.parse(body || '{}');
                const { roomId, userId, connectionId, threats = [], checks = [], source = 'client' } = report;

                if (!roomId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: 'roomId is required' }));
                }

                const hasThreat = Array.isArray(threats) && threats.length > 0;

                // Broadcast to room listeners (especially the host)
                meetingRoomService._broadcast(roomId, {
                    type: 'telemetry_report',
                    roomId,
                    userId,
                    connectionId,
                    source,
                    hasThreat,
                    threats,
                    checks,
                    timestamp: new Date().toISOString()
                });

                // If threat detected, log forensic incident
                if (hasThreat) {
                    const logDir = config.PATHS.AUDIT_LOGS_DIR;
                    if (!fs.existsSync(logDir)) {
                        fs.mkdirSync(logDir, { recursive: true });
                    }
                    const incident = {
                        timestamp: new Date().toISOString(),
                        roomId,
                        userId,
                        source,
                        threats,
                        checks
                    };
                    const logPath = path.join(logDir, `threat_${roomId}_${Date.now()}.json`);
                    try {
                        fs.writeFileSync(logPath, JSON.stringify(incident, null, 2), 'utf-8');
                    } catch {}
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, receivedThreats: threats.length }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    }

    getStatus(req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            service: 'SecureMeet Anti-Cheat Engine',
            activeThreats: nativeWatchdogService.currentThreats.length
        }));
    }
}

module.exports = new TelemetryController();
