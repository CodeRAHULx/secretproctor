const crypto = require('crypto');

class MeetingRoomService {
    constructor() {
        this.rooms = new Map();
        this.sseListeners = new Map(); // roomId -> Set of { userId, res }
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

    _cleanId(roomId) {
        return (roomId || '').trim().toLowerCase();
    }

    _getRoom(roomId) {
        return this.rooms.get(this._cleanId(roomId));
    }

    _getOrCreate(roomId) {
        const id = this._cleanId(roomId);
        if (!this.rooms.has(id)) {
            this.rooms.set(id, {
                roomId: id,
                hostId: null,          // Set when creator explicitly claims host
                creatorId: null,       // The user who created the room via /api/session/create
                participants: new Map(), // userId -> participantRecord
                knockQueue: new Map(),   // userId -> knockRecord
                messages: [],
                screenShareOwner: null, // userId currently sharing screen
                createdAt: Date.now()
            });
        }
        return this.rooms.get(id);
    }

    // ─── Host assignment (called by session/create endpoint) ───────────────────

    /**
     * Called when the meeting is CREATED (before anyone joins).
     * Persists the creator's userId so they always become the host.
     */
    reserveHost(roomId, creatorId) {
        const room = this._getOrCreate(roomId);
        if (!room.creatorId) {
            room.creatorId = creatorId;
        }
        return room;
    }

    // ─── Join ──────────────────────────────────────────────────────────────────

    joinRoom(roomId, user) {
        const room = this._getOrCreate(roomId);
        const userId = user?.id;
        if (!userId) return { error: 'User ID required' };

        // Already a full participant — return current state
        if (room.participants.has(userId)) {
            return {
                status: 'joined',
                role: room.participants.get(userId).role,
                room: this._roomSummary(room),
                user: room.participants.get(userId)
            };
        }

        // Determine role: creator or first-ever joiner to an unclaimed room
        const isCreator = room.creatorId === userId;
        const isFirstJoiner = !room.hostId && room.participants.size === 0;
        const isHost = isCreator || (!room.creatorId && isFirstJoiner);

        if (isHost) {
            room.hostId = userId;
            const record = this._makeParticipant(user, 'host');
            room.participants.set(userId, record);
            this._broadcast(room.roomId, {
                type: 'participant_joined',
                participant: record,
                participants: this._participantList(room)
            });
            return { status: 'joined', role: 'host', room: this._roomSummary(room), user: record };
        }

        // Guest: check knock queue
        const existing = room.knockQueue.get(userId);

        if (existing?.status === 'admitted') {
            // Move from knock queue → participants
            room.knockQueue.delete(userId);
            const record = this._makeParticipant(user, 'participant');
            room.participants.set(userId, record);

            // Broadcast to EVERYONE (including new joiner via SSE) so they all
            // know who is in the room and can set up WebRTC
            this._broadcast(room.roomId, {
                type: 'participant_joined',
                participant: record,
                participants: this._participantList(room)
            });

            return { status: 'joined', role: 'participant', room: this._roomSummary(room), user: record };
        }

        if (existing?.status === 'denied') {
            return { status: 'denied', message: 'The host denied your request to join.' };
        }

        if (existing?.status === 'pending') {
            // Re-knock is a no-op — still waiting
            return { status: 'waiting_for_host', message: 'Asking to be let in…', user: existing };
        }

        // Fresh knock
        const knockRecord = {
            id: userId,
            name: user.name || 'Participant',
            email: user.email || '',
            picture: user.picture || '',
            timestamp: Date.now(),
            status: 'pending'
        };
        room.knockQueue.set(userId, knockRecord);

        this._broadcast(room.roomId, {
            type: 'knock_request',
            knock: knockRecord,
            knockQueue: this._knockList(room)
        });

        return { status: 'waiting_for_host', message: 'Asking to be let in…', user: knockRecord };
    }

    // ─── Admit / Deny ──────────────────────────────────────────────────────────

    admitGuest(roomId, guestId, action = 'admit') {
        const room = this._getRoom(roomId);
        if (!room) return { error: 'Room not found' };

        const knock = room.knockQueue.get(guestId);
        if (!knock) return { error: 'Knock request not found' };

        if (action === 'admit') {
            knock.status = 'admitted';
            // Tell the waiting guest they may now call joinRoom again
            this._broadcastToUser(room.roomId, guestId, {
                type: 'knock_response',
                guestId,
                status: 'admitted'
            });
            // Also refresh the host's knock queue display
            this._broadcastToUser(room.roomId, room.hostId, {
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
            this._broadcastToUser(room.roomId, room.hostId, {
                type: 'knock_queue_update',
                knockQueue: this._knockList(room)
            });
            return { success: true, status: 'denied' };
        }
    }

    // ─── WebRTC Signaling ──────────────────────────────────────────────────────

    sendSignal(roomId, signal) {
        const room = this._getRoom(roomId);
        if (!room) return { error: 'Room not found' };
        this._broadcastToUser(room.roomId, signal.to, {
            type: 'webrtc_signal',
            signal: { from: signal.from, to: signal.to, type: signal.type, data: signal.data }
        });
        return { success: true };
    }

    // ─── Chat ──────────────────────────────────────────────────────────────────

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

    // ─── Screen Share ──────────────────────────────────────────────────────────

    setScreenShare(roomId, userId, isSharing) {
        const room = this._getRoom(roomId);
        if (!room) return { error: 'Room not found' };

        if (isSharing) {
            room.screenShareOwner = userId;
            this._broadcast(room.roomId, {
                type: 'screen_share_started',
                ownerId: userId,
                ownerName: room.participants.get(userId)?.name || 'Participant'
            });
        } else {
            if (room.screenShareOwner === userId) room.screenShareOwner = null;
            this._broadcast(room.roomId, {
                type: 'screen_share_stopped',
                ownerId: userId
            });
        }
        return { success: true };
    }

    // ─── Leave ─────────────────────────────────────────────────────────────────

    leaveRoom(roomId, userId) {
        const room = this._getRoom(roomId);
        if (!room) return;

        room.participants.delete(userId);
        room.knockQueue.delete(userId);
        if (room.screenShareOwner === userId) room.screenShareOwner = null;

        this._broadcast(room.roomId, {
            type: 'participant_left',
            userId,
            participants: this._participantList(room)
        });

        // If the host left, assign the next participant as host
        if (room.hostId === userId && room.participants.size > 0) {
            const next = Array.from(room.participants.values())[0];
            room.hostId = next.id;
            room.creatorId = next.id;
            next.role = 'host';
            this._broadcast(room.roomId, {
                type: 'host_changed',
                newHostId: next.id,
                participants: this._participantList(room)
            });
        }

        // Clean up empty rooms
        if (room.participants.size === 0) {
            setTimeout(() => {
                if (room.participants.size === 0) this.rooms.delete(room.roomId);
            }, 30000);
        }
    }

    // ─── SSE Registration ──────────────────────────────────────────────────────

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

        // Send full room snapshot immediately
        const room = this._getOrCreate(id);
        res.write(`data: ${JSON.stringify({
            type: 'room_snapshot',
            hostId: room.hostId,
            participants: this._participantList(room),
            knockQueue: this._knockList(room),
            messages: room.messages,
            screenShareOwner: room.screenShareOwner
        })}\n\n`);

        // Heartbeat every 25s to keep connection alive
        const hb = setInterval(() => {
            try { res.write(': ping\n\n'); } catch { clearInterval(hb); }
        }, 25000);

        res.on('close', () => {
            clearInterval(hb);
            const set = this.sseListeners.get(id);
            if (set) {
                set.delete(listener);
                if (set.size === 0) this.sseListeners.delete(id);
            }
        });
    }

    // ─── Broadcast helpers ─────────────────────────────────────────────────────

    _broadcast(roomId, data) {
        const id = this._cleanId(roomId);
        const set = this.sseListeners.get(id);
        if (!set) return;
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        for (const listener of set) {
            try { listener.res.write(payload); } catch {}
        }
    }

    _broadcastToUser(roomId, targetUserId, data) {
        const id = this._cleanId(roomId);
        const set = this.sseListeners.get(id);
        if (!set) return;
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        for (const listener of set) {
            if (listener.userId === targetUserId) {
                try { listener.res.write(payload); } catch {}
            }
        }
    }

    // ─── Data helpers ──────────────────────────────────────────────────────────

    _makeParticipant(user, role) {
        return {
            id: user.id,
            name: user.name || 'Participant',
            email: user.email || '',
            picture: user.picture || '',
            role,
            joinedAt: Date.now()
        };
    }

    _participantList(room) {
        return Array.from(room.participants.values());
    }

    _knockList(room) {
        return Array.from(room.knockQueue.values());
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
