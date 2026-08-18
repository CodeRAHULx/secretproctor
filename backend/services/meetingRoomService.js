const crypto = require('crypto');

class MeetingRoomService {
    constructor() {
        this.rooms = new Map();
        this.sseListeners = new Map(); // roomId -> Set of { userId, res }
    }

    _cleanId(roomId) {
        return (roomId || '').trim().toLowerCase();
    }

    _getRoom(roomId) {
        return this.rooms.get(this._cleanId(roomId));
    }

    _getOrCreate(roomId, creatorId = null, hostToken = null) {
        const id = this._cleanId(roomId);
        if (!this.rooms.has(id)) {
            this.rooms.set(id, {
                roomId: id,
                hostId: creatorId || null,
                creatorId: creatorId || null,
                hostToken: hostToken || null,
                participants: new Map(), // userId -> ParticipantModel
                knockQueue: new Map(),   // userId -> KnockModel
                messages: [],
                screenShareOwner: null,
                createdAt: Date.now()
            });
        }
        const room = this.rooms.get(id);
        if (creatorId && !room.creatorId) {
            room.creatorId = creatorId;
            room.hostId = creatorId;
        }
        if (hostToken && !room.hostToken) {
            room.hostToken = hostToken;
        }
        return room;
    }

    /**
     * Reserve host identity when meeting is created
     */
    reserveHost(roomId, creatorId, hostToken) {
        return this._getOrCreate(roomId, creatorId, hostToken);
    }

    /**
     * Join Room Flow
     */
    joinRoom(roomId, user, hostToken) {
        const room = this._getOrCreate(roomId);
        const userId = user?.id;
        if (!userId) return { error: 'User ID required' };

        // Check if this participant is the Authoritative Host:
        // 1. Matches room.hostId
        // 2. Matches room.creatorId
        // 3. Provided matching hostToken
        // 4. Room has no host assigned yet and this user created it
        const isHost = Boolean(
            (room.hostId && room.hostId === userId) ||
            (room.creatorId && room.creatorId === userId) ||
            (room.hostToken && hostToken && room.hostToken === hostToken) ||
            (!room.hostId && room.participants.size === 0 && room.creatorId === userId)
        );

        // If Host joins
        if (isHost) {
            room.hostId = userId;
            room.creatorId = userId;

            const participantRecord = {
                id: userId,
                name: user.name || 'Host',
                email: user.email || '',
                picture: user.picture || '',
                role: 'host',
                status: 'CONNECTED',
                audioEnabled: user.audioEnabled !== false,
                videoEnabled: user.videoEnabled !== false,
                screenSharing: false,
                joinedAt: Date.now()
            };

            room.participants.set(userId, participantRecord);
            room.knockQueue.delete(userId);

            this._broadcast(room.roomId, {
                type: 'participant_joined',
                participant: participantRecord,
                hostId: room.hostId,
                participants: this._participantList(room)
            });

            return {
                status: 'joined',
                role: 'host',
                hostId: room.hostId,
                room: this._roomSummary(room),
                user: participantRecord
            };
        }

        // ── Participant / Guest Flow ─────────────────────────────────────────

        // If already an active participant in room (RECONNECTION)
        if (room.participants.has(userId)) {
            const existing = room.participants.get(userId);

            // Update their reconnection details
            existing.name = user.name || existing.name;
            existing.email = user.email || existing.email;
            existing.picture = user.picture || existing.picture;
            existing.audioEnabled = user.audioEnabled !== false;
            existing.videoEnabled = user.videoEnabled !== false;
            existing.status = 'CONNECTED';

            // Broadcast reconnection to all participants
            this._broadcast(room.roomId, {
                type: 'participant_reconnected',
                participant: existing,
                hostId: room.hostId,
                participants: this._participantList(room)
            });

            return {
                status: 'joined',
                role: existing.role,
                hostId: room.hostId,
                room: this._roomSummary(room),
                user: existing
            };
        }

        // Check knock queue
        const existingKnock = room.knockQueue.get(userId);

        if (existingKnock?.status === 'admitted' || existingKnock?.status === 'ADMITTED') {
            // Move from Knock Queue -> Active Participants
            room.knockQueue.delete(userId);

            const participantRecord = {
                id: userId,
                name: user.name || existingKnock.name || 'Participant',
                email: user.email || existingKnock.email || '',
                picture: user.picture || existingKnock.picture || '',
                role: 'participant', // STRICTLY PARTICIPANT
                status: 'CONNECTED',
                audioEnabled: user.audioEnabled !== false,
                videoEnabled: user.videoEnabled !== false,
                screenSharing: false,
                joinedAt: Date.now()
            };

            room.participants.set(userId, participantRecord);

            // Broadcast to ALL connected clients so existing peers initiate WebRTC offers
            this._broadcast(room.roomId, {
                type: 'participant_joined',
                participant: participantRecord,
                hostId: room.hostId,
                participants: this._participantList(room)
            });

            return {
                status: 'joined',
                role: 'participant',
                hostId: room.hostId,
                room: this._roomSummary(room),
                user: participantRecord
            };
        }

        if (existingKnock?.status === 'denied' || existingKnock?.status === 'DENIED') {
            return {
                status: 'denied',
                message: 'The host has denied your request to join this meeting.'
            };
        }

        // If not admitted yet -> Add to Knock Queue in WAITING status
        const knockRecord = {
            id: userId,
            name: user.name || 'Participant',
            email: user.email || '',
            picture: user.picture || '',
            role: 'participant',
            status: 'WAITING',
            audioEnabled: user.audioEnabled !== false,
            videoEnabled: user.videoEnabled !== false,
            timestamp: Date.now()
        };

        room.knockQueue.set(userId, knockRecord);

        // Notify Host of pending knock
        this._broadcast(room.roomId, {
            type: 'knock_request',
            knock: knockRecord,
            knockQueue: this._knockList(room)
        });

        return {
            status: 'waiting_for_host',
            role: 'participant',
            hostId: room.hostId,
            message: 'Asking to be let in...',
            user: knockRecord
        };
    }

    /**
     * Host Admits / Denies Guest
     */
    admitGuest(roomId, guestId, action = 'admit') {
        const room = this._getRoom(roomId);
        if (!room) return { error: 'Room not found' };

        const knock = room.knockQueue.get(guestId);
        if (!knock) return { error: 'Knock request not found' };

        if (action === 'admit') {
            knock.status = 'admitted';

            // Send notification directly to the waiting guest
            this._broadcastToUser(room.roomId, guestId, {
                type: 'knock_response',
                guestId,
                status: 'admitted'
            });

            // Update host's knock queue UI
            this._broadcast(room.roomId, {
                type: 'knock_queue_update',
                knockQueue: this._knockList(room)
            });

            return { success: true, status: 'admitted' };
        } else {
            knock.status = 'denied';

            this._broadcastToUser(room.roomId, guestId, {
                type: 'knock_response',
                guestId,
                status: 'denied'
            });

            this._broadcast(room.roomId, {
                type: 'knock_queue_update',
                knockQueue: this._knockList(room)
            });

            return { success: true, status: 'denied' };
        }
    }

    /**
     * Update participant media state (mic/cam/screen)
     */
    updateMediaState(roomId, userId, updates = {}) {
        const room = this._getRoom(roomId);
        if (!room) return;

        const p = room.participants.get(userId);
        if (p) {
            if (typeof updates.audioEnabled === 'boolean') p.audioEnabled = updates.audioEnabled;
            if (typeof updates.videoEnabled === 'boolean') p.videoEnabled = updates.videoEnabled;
            if (typeof updates.screenSharing === 'boolean') p.screenSharing = updates.screenSharing;

            this._broadcast(room.roomId, {
                type: 'participant_updated',
                participant: p,
                participants: this._participantList(room)
            });
        }
    }

    /**
     * WebRTC Signaling Relay
     */
    sendSignal(roomId, signal) {
        const room = this._getRoom(roomId);
        if (!room) return { error: 'Room not found' };

        this._broadcastToUser(room.roomId, signal.to, {
            type: 'webrtc_signal',
            signal: {
                from: signal.from,
                to: signal.to,
                type: signal.type,
                data: signal.data
            }
        });
        return { success: true };
    }

    /**
     * Live Chat Messaging
     */
    addMessage(roomId, message) {
        const room = this._getRoom(roomId);
        if (!room) return { error: 'Room not found' };

        const msg = {
            id: crypto.randomUUID(),
            senderId: message.senderId,
            senderName: message.senderName || 'Participant',
            senderPicture: message.senderPicture || '',
            text: message.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        room.messages.push(msg);
        if (room.messages.length > 200) room.messages.shift();

        this._broadcast(room.roomId, { type: 'chat_message', message: msg });
        return { success: true, message: msg };
    }

    /**
     * Screen Sharing State
     */
    setScreenShare(roomId, userId, isSharing) {
        const room = this._getRoom(roomId);
        if (!room) return { error: 'Room not found' };

        if (isSharing) {
            room.screenShareOwner = userId;
            const p = room.participants.get(userId);
            if (p) p.screenSharing = true;

            this._broadcast(room.roomId, {
                type: 'screen_share_started',
                ownerId: userId,
                ownerName: p?.name || 'Participant',
                participants: this._participantList(room)
            });
        } else {
            if (room.screenShareOwner === userId) room.screenShareOwner = null;
            const p = room.participants.get(userId);
            if (p) p.screenSharing = false;

            this._broadcast(room.roomId, {
                type: 'screen_share_stopped',
                ownerId: userId,
                participants: this._participantList(room)
            });
        }
        return { success: true };
    }

    /**
     * Leave Meeting
     */
    leaveRoom(roomId, userId) {
        const room = this._getRoom(roomId);
        if (!room) return;

        room.participants.delete(userId);
        room.knockQueue.delete(userId);
        if (room.screenShareOwner === userId) room.screenShareOwner = null;

        this._broadcast(room.roomId, {
            type: 'participant_left',
            userId,
            hostId: room.hostId,
            participants: this._participantList(room)
        });

        // Clean up empty rooms after 30 seconds
        if (room.participants.size === 0) {
            setTimeout(() => {
                if (room.participants.size === 0) {
                    this.rooms.delete(room.roomId);
                }
            }, 30000);
        }
    }

    /**
     * SSE Event Stream Registration
     */
    registerSSE(roomId, userId, res) {
        const id = this._cleanId(roomId);
        if (!this.sseListeners.has(id)) {
            this.sseListeners.set(id, new Set());
        }
        const listener = { userId, res };
        this.sseListeners.get(id).add(listener);

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        res.write('\n');

        // Immediately send room state snapshot
        const room = this._getOrCreate(id);
        res.write(`data: ${JSON.stringify({
            type: 'room_snapshot',
            hostId: room.hostId,
            participants: this._participantList(room),
            knockQueue: this._knockList(room),
            messages: room.messages,
            screenShareOwner: room.screenShareOwner
        })}\n\n`);

        // Keep-alive heartbeat every 20s
        const heartbeat = setInterval(() => {
            try {
                res.write(': ping\n\n');
            } catch {
                clearInterval(heartbeat);
            }
        }, 20000);

        res.on('close', () => {
            clearInterval(heartbeat);
            const set = this.sseListeners.get(id);
            if (set) {
                set.delete(listener);
                if (set.size === 0) this.sseListeners.delete(id);
            }
        });
    }

    _broadcast(roomId, data) {
        const id = this._cleanId(roomId);
        const set = this.sseListeners.get(id);
        if (!set) return;
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        for (const listener of set) {
            try {
                listener.res.write(payload);
            } catch {}
        }
    }

    _broadcastToUser(roomId, targetUserId, data) {
        const id = this._cleanId(roomId);
        const set = this.sseListeners.get(id);
        if (!set) return;
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        for (const listener of set) {
            if (listener.userId === targetUserId) {
                try {
                    listener.res.write(payload);
                } catch {}
            }
        }
    }

    _participantList(room) {
        return Array.from(room.participants.values());
    }

    _knockList(room) {
        return Array.from(room.knockQueue.values()).filter(k => k.status === 'WAITING' || k.status === 'pending');
    }

    _roomSummary(room) {
        return {
            roomId: room.roomId,
            hostId: room.hostId,
            participants: this._participantList(room),
            knockQueue: this._knockList(room),
            messages: room.messages,
            screenShareOwner: room.screenShareOwner
        };
    }
}

module.exports = new MeetingRoomService();
