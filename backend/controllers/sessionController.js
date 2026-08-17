const sessionManager = require('../services/sessionManager');
const googleAuthService = require('../services/googleAuthService');
const meetingRoomService = require('../services/meetingRoomService');

const parseCookies = header => Object.fromEntries((header || '').split(';').filter(Boolean).map(part => {
    const index = part.indexOf('=');
    if (index === -1) return [part.trim(), ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
}));

class SessionController {
    // Legacy verify endpoint for backwards compatibility
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

    // Modern Multi-Participant Room & Signaling Endpoints
    joinRoom(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { roomId, user } = JSON.parse(body || '{}');
                const cookies = parseCookies(req.headers.cookie);
                const authUser = googleAuthService.getSession(cookies.securemeet_auth);
                // Keep the frontend tabClientId as the canonical id; only fill in
                // name/email/picture from the authenticated Google session if present.
                const effectiveUser = { ...(authUser || {}), ...(user || {}) };

                const result = meetingRoomService.joinRoom(roomId, effectiveUser);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    }

    roomEvents(req, res) {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const roomId = url.searchParams.get('roomId');
        const userId = url.searchParams.get('userId');

        if (!roomId || !userId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing roomId or userId' }));
            return;
        }

        meetingRoomService.registerSSE(roomId, userId, res);
    }

    admitGuest(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { roomId, guestId, action } = JSON.parse(body || '{}');
                const result = meetingRoomService.admitGuest(roomId, guestId, action);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    }

    sendSignal(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { roomId, signal } = JSON.parse(body || '{}');
                const result = meetingRoomService.sendSignal(roomId, signal);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    }

    sendChat(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { roomId, message } = JSON.parse(body || '{}');
                const result = meetingRoomService.addMessage(roomId, message);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    }

    leaveRoom(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { roomId, userId } = JSON.parse(body || '{}');
                meetingRoomService.leaveRoom(roomId, userId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    }
}

module.exports = new SessionController();
