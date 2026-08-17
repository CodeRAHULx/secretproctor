const telemetryController = require('../controllers/telemetryController');
const threatController = require('../controllers/threatController');
const auditController = require('../controllers/auditController');
const sessionController = require('../controllers/sessionController');
const authController = require('../controllers/authController');

function handleApiRoutes(req, res) {
    // Intercept all /api/ endpoints to prevent static file fallthrough
    if (req.url.startsWith('/api/')) {
        if (req.url === '/api/auth/google/status' && req.method === 'GET') { authController.status(req, res); return true; }
        if (req.url === '/api/auth/google' && req.method === 'GET') { authController.startGoogle(req, res); return true; }
        if (req.url.startsWith('/api/auth/google/callback') && req.method === 'GET') { authController.googleCallback(req, res); return true; }
        if (req.url === '/api/auth/me' && req.method === 'GET') { authController.me(req, res); return true; }
        // 1. Session Verification & Authentication
        if (req.url === '/api/session/verify' && req.method === 'POST') {
            sessionController.verifySessionAccess(req, res);
            return true;
        }

        if (req.url === '/api/session/create' && req.method === 'POST') {
            sessionController.createSession(req, res);
            return true;
        }

        // 2. Real-Time Watchdog SSE Stream
        if (req.url === '/api/telemetry/stream') {
            telemetryController.streamTelemetry(req, res);
            return true;
        }

        // 3. Health & Status
        if (req.url === '/api/status' && req.method === 'GET') {
            telemetryController.getStatus(req, res);
            return true;
        }

        // 4. Kill Threat
        if (req.url === '/api/threat/kill' && req.method === 'POST') {
            threatController.killThreat(req, res);
            return true;
        }

        // 5. Save Audit Report
        if (req.url === '/api/audit/save' && req.method === 'POST') {
            auditController.exportAuditReport(req, res);
            return true;
        }

        // Default 404 for unknown API endpoints
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
        return true;
    }

    return false;
}

module.exports = handleApiRoutes;
