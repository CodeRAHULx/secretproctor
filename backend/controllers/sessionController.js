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
                const creatorUserId = data.creatorUserId || user?.id || `guest_${Date.now()}`;

                console.log('[SessionController] Creating meeting - creatorUserId:', creatorUserId);

                meetingRoomService.reserveHost(session.sessionId, creatorUserId, hostToken);

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    session: {
                        ...session,
                        hostToken,
                        creatorUserId
                    }
                }));
            } catch (err) {
                console.error('[SessionController] Create session error:', err);
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
        const connectionId = url.searchParams.get('connectionId');

        if (!roomId || !userId || !connectionId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing roomId, userId, or connectionId' }));
            return;
        }
        meetingRoomService.registerSSE(roomId, userId, connectionId, res);
    }

    admitGuest(req, res) {
        readBody(req).then(body => {
            try {
                const { roomId, guestUserId, action } = JSON.parse(body || '{}');
                console.log('[SessionController] Admit guest - guestUserId:', guestUserId, 'action:', action);
                const result = meetingRoomService.admitGuest(roomId, guestUserId, action);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                console.error('[SessionController] Admit guest error:', err);
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
                const { roomId, userId, connectionId, ...updates } = JSON.parse(body || '{}');
                meetingRoomService.updateMediaState(roomId, userId, connectionId, updates);
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
                const { roomId, userId, connectionId } = JSON.parse(body || '{}');
                meetingRoomService.leaveRoom(roomId, userId, connectionId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    }

    endMeeting(req, res) {
        readBody(req).then(body => {
            try {
                const { roomId, hostUserId } = JSON.parse(body || '{}');
                const result = meetingRoomService.endMeeting(roomId, hostUserId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    }

    transferHost(req, res) {
        readBody(req).then(body => {
            try {
                const { roomId, currentHostUserId, newHostUserId } = JSON.parse(body || '{}');
                const result = meetingRoomService.transferHost(roomId, currentHostUserId, newHostUserId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    }
}

module.exports = new SessionController();
