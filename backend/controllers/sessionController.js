const crypto = require('crypto');
const sessionManager = require('../services/sessionManager');
const googleAuthService = require('../services/googleAuthService');
const meetingRoomService = require('../services/meetingRoomService');

const parseCookies = header => Object.fromEntries((header || '').split(';').filter(Boolean).map(part => {
    const index = part.indexOf('=');
    if (index === -1) return [part.trim(), ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
}));

function readBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => resolve(body));
    });
}

class SessionController {
    verifySessionAccess(req, res) {
        readBody(req).then(body => {
            try {
                const { sessionId, passcode, role, participantName } = JSON.parse(body || '{}');
                const cookies = parseCookies(req.headers.cookie);
                const user = googleAuthService.getSession(cookies.securemeet_auth);
                const result = sessionManager.verifyAccess(sessionId, passcode, role, participantName, user);
                res.writeHead(result.authorized ? 200 : 403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ authorized: false, error: 'Bad request' }));
            }
        });
    }

    createSession(req, res) {
        readBody(req).then(body => {
            try {
                const data = JSON.parse(body || '{}');
                const cookies = parseCookies(req.headers.cookie);
                const user = googleAuthService.getSession(cookies.securemeet_auth);

                const session = sessionManager.createSession({ ...data, createdBy: user });

                // Authoritative creator identity & host token
                const hostToken = `host_tok_${crypto.randomBytes(16).toString('hex')}`;
                const creatorId = data.creatorId || user?.id || `creator_${Date.now()}`;

                meetingRoomService.reserveHost(session.sessionId, creatorId, hostToken);

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    session: {
                        ...session,
                        hostToken,
                        creatorId
                    }
                }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    }

    joinRoom(req, res) {
        readBody(req).then(body => {
            try {
                const { roomId, user, hostToken } = JSON.parse(body || '{}');
                const cookies = parseCookies(req.headers.cookie);
                const authUser = googleAuthService.getSession(cookies.securemeet_auth);

                // Preserve client tab ID as unique instance id, overlay with verified Google info
                const effectiveUser = {
                    name: authUser?.name || user?.name || 'Participant',
                    email: authUser?.email || user?.email || '',
                    picture: authUser?.picture || user?.picture || '',
                    ...(user || {})
                };

                const result = meetingRoomService.joinRoom(roomId, effectiveUser, hostToken);
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
        readBody(req).then(body => {
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
        readBody(req).then(body => {
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
        readBody(req).then(body => {
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

    screenShare(req, res) {
        readBody(req).then(body => {
            try {
                const { roomId, userId, isSharing } = JSON.parse(body || '{}');
                const result = meetingRoomService.setScreenShare(roomId, userId, isSharing);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    }

    updateMedia(req, res) {
        readBody(req).then(body => {
            try {
                const { roomId, userId, updates } = JSON.parse(body || '{}');
                meetingRoomService.updateMediaState(roomId, userId, updates);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    }

    leaveRoom(req, res) {
        readBody(req).then(body => {
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
