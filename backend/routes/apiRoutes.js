const telemetryController = require('../controllers/telemetryController');
const threatController = require('../controllers/threatController');
const auditController = require('../controllers/auditController');
const sessionController = require('../controllers/sessionController');
const authController = require('../controllers/authController');
const aiController = require('../controllers/aiController');

function setCorsHeaders(req, res) {
    const allowedOrigins = [
        'https://securemeet-privatedoc.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000'
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (process.env.NODE_ENV !== 'production') {
        // In development, allow any origin
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

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

        // ── Health Check ──────────────────────────────────────────────────────
        if (pathname === '/api/health' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development'
            }));
            return true;
        }

        // ── Auth ──────────────────────────────────────────────────────────────
        if (pathname === '/api/auth/google/status' && req.method === 'GET') {
            authController.status(req, res); return true;
        }
        if (pathname === '/api/auth/google' && req.method === 'GET') {
            authController.startGoogle(req, res); return true;
        }
        if (pathname.startsWith('/api/auth/google/callback') && req.method === 'GET') {
            authController.googleCallback(req, res); return true;
        }
        if (pathname === '/api/auth/me' && req.method === 'GET') {
            authController.me(req, res); return true;
        }
        if (pathname === '/api/auth/logout' && (req.method === 'POST' || req.method === 'GET')) {
            authController.logout(req, res); return true;
        }

        // ── Session & Room ────────────────────────────────────────────────────
        if (pathname === '/api/session/verify' && req.method === 'POST') {
            sessionController.verifySessionAccess(req, res); return true;
        }
        if (pathname === '/api/session/create' && req.method === 'POST') {
            sessionController.createSession(req, res); return true;
        }
        if (pathname === '/api/room/join' && req.method === 'POST') {
            sessionController.joinRoom(req, res); return true;
        }
        if (pathname === '/api/room/events' && req.method === 'GET') {
            sessionController.roomEvents(req, res); return true;
        }
        if (pathname === '/api/room/admit' && req.method === 'POST') {
            sessionController.admitGuest(req, res); return true;
        }
        if (pathname === '/api/room/signal' && req.method === 'POST') {
            sessionController.sendSignal(req, res); return true;
        }
        if (pathname === '/api/room/chat' && req.method === 'POST') {
            sessionController.sendChat(req, res); return true;
        }
        if (pathname === '/api/room/screenshare' && req.method === 'POST') {
            sessionController.screenShare(req, res); return true;
        }
        if (pathname === '/api/room/media' && req.method === 'POST') {
            sessionController.updateMedia(req, res); return true;
        }
        if (pathname === '/api/room/leave' && req.method === 'POST') {
            sessionController.leaveRoom(req, res); return true;
        }
        if (pathname === '/api/room/end' && req.method === 'POST') {
            sessionController.endMeeting(req, res); return true;
        }
        if (pathname === '/api/room/transfer-host' && req.method === 'POST') {
            sessionController.transferHost(req, res); return true;
        }

        // ── AI Features ───────────────────────────────────────────────────────
        if (pathname === '/api/ai/translate' && req.method === 'POST') {
            aiController.translate(req, res); return true;
        }
        if (pathname === '/api/ai/memo' && req.method === 'POST') {
            aiController.memo(req, res); return true;
        }
        if (pathname === '/api/ai/suggest' && req.method === 'POST') {
            aiController.suggest(req, res); return true;
        }
        if (pathname === '/api/ai/status' && req.method === 'GET') {
            aiController.status(req, res); return true;
        }

        // ── Proctor & Forensics ───────────────────────────────────────────────
        if (pathname === '/api/telemetry/stream') {
            telemetryController.streamTelemetry(req, res); return true;
        }
        if (pathname === '/api/status' && req.method === 'GET') {
            telemetryController.getStatus(req, res); return true;
        }
        if (pathname === '/api/threat/kill' && req.method === 'POST') {
            threatController.killThreat(req, res); return true;
        }
        if (pathname === '/api/audit/save' && req.method === 'POST') {
            auditController.exportAuditReport(req, res); return true;
        }

        // 404 for unknown /api/ paths
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `API endpoint not found: ${pathname}` }));
        return true;
    }

    return false;
}

module.exports = handleApiRoutes;
