const sessionManager = require('../services/sessionManager');

class SessionController {
    verifySessionAccess(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { sessionId, passcode, role, participantName } = JSON.parse(body || '{}');
                const result = sessionManager.verifyAccess(sessionId, passcode, role, participantName);

                if (result.authorized) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } else {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                }
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ authorized: false, error: 'Malformed request payload.' }));
            }
        });
    }

    createSession(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const session = sessionManager.createSession(data);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, session }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    }
}

module.exports = new SessionController();
