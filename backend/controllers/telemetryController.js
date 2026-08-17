const nativeWatchdogService = require('../services/nativeWatchdogService');

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
