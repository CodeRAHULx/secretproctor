const sessionManager = require('../services/sessionManager');
const googleAuthService = require('../services/googleAuthService');

const parseCookies = header => Object.fromEntries((header || '').split(';').filter(Boolean).map(part => {
    const index = part.indexOf('=');
    if (index === -1) return [part.trim(), ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
}));

class SessionController {
    verifySessionAccess(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { sessionId, passcode, role, participantName } = JSON.parse(body || '{}');
                const cookies = parseCookies(req.headers.cookie);
                const user = googleAuthService.getSession(cookies.securemeet_auth);

                const result = sessionManager.verifyAccess(sessionId, passcode, role, participantName, user);

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
                const cookies = parseCookies(req.headers.cookie);
                const user = googleAuthService.getSession(cookies.securemeet_auth);

                const session = sessionManager.createSession({ ...data, createdBy: user });
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
