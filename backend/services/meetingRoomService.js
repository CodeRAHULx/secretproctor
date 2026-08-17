const crypto = require('crypto');

class MeetingRoomService {
    constructor() {
        this.rooms = new Map();
        this.sseListeners = new Map(); // roomId -> Set of { userId, res }
    }

    getOrCreateRoom(roomId) {
        const cleanId = roomId.trim().toLowerCase();
        if (!this.rooms.has(cleanId)) {
            this.rooms.set(cleanId, {
                roomId: cleanId,
                hostId: null,
                participants: new Map(), // userId -> { id, name, email, picture, role, joinedAt }
                knockQueue: new Map(),   // userId -> { id, name, email, picture, timestamp, status }
                messages: [],            // [{ id, senderId, senderName, text, timestamp }]
                createdAt: Date.now()
            });
        }
        return this.rooms.get(cleanId);
    }

    joinRoom(roomId, user) {
        const room = this.getOrCreateRoom(roomId);
        const userId = user?.id || `tab_${crypto.randomBytes(6).toString('hex')}`;
        const participantInfo = {
            id: userId,
            name: user?.name || 'Participant',
            email: user?.email || '',
            picture: user?.picture || '',
            role: user?.role || 'candidate',
            joinedAt: Date.now()
        };

        // If no host exists yet, this first tab becomes the host
        if (!room.hostId || room.participants.size === 0) {
            room.hostId = userId;
            participantInfo.role = 'host';
            room.participants.set(userId, participantInfo);
            this.broadcast(room.roomId, {
                type: 'participant_joined',
                participant: participantInfo,
                participants: this.getParticipantList(room)
            });
            return {
                status: 'joined',
                role: 'host',
                room: this.getRoomSummary(room),
                user: participantInfo
            };
        }

        // If already in participants
        if (room.participants.has(userId)) {
            return {
                status: 'joined',
                role: room.participants.get(userId).role,
                room: this.getRoomSummary(room),
                user: room.participants.get(userId)
            };
        }

        // If this tab was previously admitted
        const existingKnock = room.knockQueue.get(userId);
        if (existingKnock && existingKnock.status === 'admitted') {
            room.knockQueue.delete(userId);
            room.participants.set(userId, participantInfo);
            this.broadcast(room.roomId, {
                type: 'participant_joined',
                participant: participantInfo,
                participants: this.getParticipantList(room)
            });
            return {
                status: 'joined',
                role: 'guest',
                room: this.getRoomSummary(room),
                user: participantInfo
            };
        }

        if (existingKnock && existingKnock.status === 'denied') {
            return { status: 'denied', message: 'The host denied your request to join this meeting.' };
        }

        // Add to knock queue and notify the host immediately
        const knockEntry = { ...participantInfo, timestamp: Date.now(), status: 'pending' };
        room.knockQueue.set(userId, knockEntry);
        this.broadcast(room.roomId, {
            type: 'knock_request',
            knock: knockEntry,
            knockQueue: Array.from(room.knockQueue.values())
        });

        return { status: 'waiting_for_host', message: 'Asking to be let in...', user: participantInfo };
    }

    admitGuest(roomId, guestId, action = 'admit') {
        const room = this.rooms.get(roomId.trim().toLowerCase());
        if (!room) return { error: 'Room not found' };

        const knock = room.knockQueue.get(guestId);
        if (!knock) return { error: 'Knock request not found' };

        if (action === 'admit') {
            knock.status = 'admitted';
            this.broadcast(room.roomId, { type: 'knock_response', guestId, status: 'admitted' });
            return { success: true, status: 'admitted' };
        } else {
            knock.status = 'denied';
            this.broadcast(room.roomId, { type: 'knock_response', guestId, status: 'denied' });
            return { success: true, status: 'denied' };
        }
    }

    sendSignal(roomId, signal) {
        const room = this.rooms.get(roomId.trim().toLowerCase());
        if (!room) return { error: 'Room not found' };

        // Relay SDP Offer / Answer / ICE Candidate directly to target peer
        this.broadcastToUser(room.roomId, signal.to, {
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

    addMessage(roomId, message) {
        const room = this.rooms.get(roomId.trim().toLowerCase());
        if (!room) return { error: 'Room not found' };

        const msgObj = {
            id: crypto.randomUUID(),
            senderId: message.senderId,
            senderName: message.senderName || 'Participant',
            senderPicture: message.senderPicture || '',
            text: message.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        room.messages.push(msgObj);
        if (room.messages.length > 200) room.messages.shift();

        this.broadcast(room.roomId, { type: 'chat_message', message: msgObj });
        return { success: true, message: msgObj };
    }

    leaveRoom(roomId, userId) {
        const room = this.rooms.get(roomId.trim().toLowerCase());
        if (!room) return;

        room.participants.delete(userId);
        room.knockQueue.delete(userId);

        this.broadcast(room.roomId, {
            type: 'participant_left',
            userId,
            participants: this.getParticipantList(room)
        });

        // If host left and participants remain, assign new host
        if (room.hostId === userId && room.participants.size > 0) {
            const nextHost = Array.from(room.participants.values())[0];
            room.hostId = nextHost.id;
            nextHost.role = 'host';
            this.broadcast(room.roomId, {
                type: 'host_changed',
                newHostId: nextHost.id,
                participants: this.getParticipantList(room)
            });
        }
    }

    registerSSE(roomId, userId, res) {
        const cleanId = roomId.trim().toLowerCase();
        if (!this.sseListeners.has(cleanId)) {
            this.sseListeners.set(cleanId, new Set());
        }
        const listener = { userId, res };
        this.sseListeners.get(cleanId).add(listener);

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write('\n');

        // Send initial room snapshot
        const room = this.getOrCreateRoom(cleanId);
        res.write(`data: ${JSON.stringify({
            type: 'room_snapshot',
            participants: this.getParticipantList(room),
            knockQueue: Array.from(room.knockQueue.values()),
            messages: room.messages,
            hostId: room.hostId
        })}\n\n`);

        res.on('close', () => {
            const set = this.sseListeners.get(cleanId);
            if (set) {
                set.delete(listener);
                if (set.size === 0) this.sseListeners.delete(cleanId);
            }
        });
    }

    broadcast(roomId, data) {
        const cleanId = roomId.trim().toLowerCase();
        const set = this.sseListeners.get(cleanId);
        if (!set) return;

        const payload = `data: ${JSON.stringify(data)}\n\n`;
        for (const listener of set) {
            try {
                listener.res.write(payload);
            } catch {}
        }
    }

    broadcastToUser(roomId, targetUserId, data) {
        const cleanId = roomId.trim().toLowerCase();
        const set = this.sseListeners.get(cleanId);
        if (!set) return;

        const payload = `data: ${JSON.stringify(data)}\n\n`;
        for (const listener of set) {
            if (!targetUserId || listener.userId === targetUserId) {
                try {
                    listener.res.write(payload);
                } catch {}
            }
        }
    }

    getParticipantList(room) {
        return Array.from(room.participants.values());
    }

    getRoomSummary(room) {
        return {
            roomId: room.roomId,
            hostId: room.hostId,
            participants: this.getParticipantList(room),
            knockQueue: Array.from(room.knockQueue.values()),
            messages: room.messages
        };
    }
}

module.exports = new MeetingRoomService();
