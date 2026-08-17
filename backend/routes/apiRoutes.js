const telemetryController = require('../controllers/telemetryController');
const threatController = require('../controllers/threatController');
const auditController = require('../controllers/auditController');
const sessionController = require('../controllers/sessionController');
const authController = require('../controllers/authController');

function setCorsHeaders(req, res) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

function handleApiRoutes(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Handle CORS preflight
    if (pathname.startsWith('/api/') && req.method === 'OPTIONS') {
        setCorsHeaders(req, res);
        res.writeHead(204);
        res.end();
        return true;
    }

    // Intercept all /api/ endpoints
    if (pathname.startsWith('/api/')) {
        setCorsHeaders(req, res);

        // Auth routes
        if (pathname === '/api/auth/google/status' && req.method === 'GET') { authController.status(req, res); return true; }
        if (pathname === '/api/auth/google' && req.method === 'GET') { authController.startGoogle(req, res); return true; }
        if (pathname.startsWith('/api/auth/google/callback') && req.method === 'GET') { authController.googleCallback(req, res); return true; }
        if (pathname === '/api/auth/me' && req.method === 'GET') { authController.me(req, res); return true; }
        if (pathname === '/api/auth/logout' && (req.method === 'POST' || req.method === 'GET')) { authController.logout(req, res); return true; }

        // Session & Room Endpoints
        if (pathname === '/api/session/verify' && req.method === 'POST') {
            sessionController.verifySessionAccess(req, res);
            return true;
        }

        if (pathname === '/api/session/create' && req.method === 'POST') {
            sessionController.createSession(req, res);
            return true;
        }

        if (pathname === '/api/room/join' && req.method === 'POST') {
            sessionController.joinRoom(req, res);
            return true;
        }

        if (pathname === '/api/room/events' && req.method === 'GET') {
            sessionController.roomEvents(req, res);
            return true;
        }

        if (pathname === '/api/room/admit' && req.method === 'POST') {
            sessionController.admitGuest(req, res);
            return true;
        }

        if (pathname === '/api/room/signal' && req.method === 'POST') {
            sessionController.sendSignal(req, res);
            return true;
        }

        if (pathname === '/api/room/chat' && req.method === 'POST') {
            sessionController.sendChat(req, res);
            return true;
        }

        if (pathname === '/api/room/leave' && req.method === 'POST') {
            sessionController.leaveRoom(req, res);
            return true;
        }

        // Real-Time Watchdog SSE Stream
        if (pathname === '/api/telemetry/stream') {
            telemetryController.streamTelemetry(req, res);
            return true;
        }

        // Health & Status
        if (pathname === '/api/status' && req.method === 'GET') {
            telemetryController.getStatus(req, res);
            return true;
        }

        // Kill Threat Process
        if (pathname === '/api/threat/kill' && req.method === 'POST') {
            threatController.killThreat(req, res);
            return true;
        }

        // Save Audit Report
        if (pathname === '/api/audit/save' && req.method === 'POST') {
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
