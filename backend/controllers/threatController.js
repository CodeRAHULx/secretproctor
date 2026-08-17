const nativeWatchdogService = require('../services/nativeWatchdogService');

class ThreatController {
    async killThreat(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const result = await nativeWatchdogService.killProcess(data.pid);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, result }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    }
}

module.exports = new ThreatController();
