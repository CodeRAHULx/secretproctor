const crypto = require('crypto');

class MeetingRoomService {
    constructor() {
        this.rooms = new Map();
        this.sseListeners = new Map(); // roomId -> Set of { userId, connectionId, res }
    }

    _cleanId(roomId) {
        return (roomId || '').trim().toLowerCase();
    }

    _getRoom(roomId) {
        return this.rooms.get(this._cleanId(roomId));
    }

    _getOrCreate(roomId, creatorUserId = null, hostToken = null) {
        const id = this._cleanId(roomId);
        if (!this.rooms.has(id)) {
            this.rooms.set(id, {
                roomId: id,
                hostUserId: creatorUserId || null,      // PERSISTENT user identity
                creatorUserId: creatorUserId || null,
                hostToken: hostToken || null,
                participants: new Map(), // userId -> ParticipantModel
                connections: new Map(),  // connectionId -> { userId, name, ... }
                knockQueue: new Map(),   // userId -> KnockModel
                messages: [],
                screenShareOwner: null,  // userId who is screen sharing
                createdAt: Date.now()
            });
        }
        const room = this.rooms.get(id);
        if (creatorUserId && !room.creatorUserId) {
            room.creatorUserId = creatorUserId;
            room.hostUserId = creatorUserId;
        }
        if (hostToken && !room.hostToken) {
            room.hostToken = hostToken;
        }
        return room;
    }

    /**
     * Reserve host identity when meeting is created
     */
    reserveHost(roomId, creatorUserId, hostToken) {
        console.log('[MeetingRoom] Reserving host for room:', roomId, 'creatorUserId:', creatorUserId);
        return this._getOrCreate(roomId, creatorUserId, hostToken);
    }

    /**
     * Join Room Flow
     * userId = PERSISTENT identity (Google OAuth ID or guest localStorage ID)
     * connectionId = EPHEMERAL connection (tab session ID)
     */
    joinRoom(roomId, user, hostToken) {
        const room = this._getOrCreate(roomId);
        const userId = user?.userId;
        const connectionId = user?.connectionId;

        if (!userId || !connectionId) {
            console.error('[MeetingRoom] Missing userId or connectionId');
            return { error: 'User ID and Connection ID required' };
        }

        console.log('[MeetingRoom] Join attempt - Room:', roomId, 'userId:', userId, 'connectionId:', connectionId, 'hostToken:', !!hostToken);
        console.log('[MeetingRoom] Current room.hostUserId:', room.hostUserId);

        // ═══════════════════════════════════════════════════════════════════════
        // HOST IDENTIFICATION (PERSISTENT)
        // ═══════════════════════════════════════════════════════════════════════
        // Host is identified by PERSISTENT userId, NOT ephemeral connectionId
        // This allows host to refresh and reconnect without losing host status
        // ═══════════════════════════════════════════════════════════════════════
        const isHost = Boolean(
            (room.hostUserId && room.hostUserId === userId) ||
            (room.creatorUserId && room.creatorUserId === userId) ||
            (room.hostToken && hostToken && room.hostToken === hostToken) ||
            (!room.hostUserId && room.participants.size === 0 && !room.creatorUserId)
        );

        console.log('[MeetingRoom] isHost:', isHost);

        // ─── HOST JOIN/RECONNECT ─────────────────────────────────────────────
        if (isHost) {
            room.hostUserId = userId;
            room.creatorUserId = userId;

            // Check if this is a reconnection (user already in participants)
            const existingParticipant = room.participants.get(userId);
            const isReconnecting = Boolean(existingParticipant);

            // Store/update participant record (by userId)
            const participantRecord = {
                userId: userId,
                connectionId: connectionId,  // Update to new connection
                name: user.name || existingParticipant?.name || 'Host',
                email: user.email || existingParticipant?.email || '',
                picture: user.picture || existingParticipant?.picture || '',
                role: 'host',
                status: 'CONNECTED',
                audioEnabled: user.audioEnabled !== false,
                videoEnabled: user.videoEnabled !== false,
                screenSharing: false,
                joinedAt: existingParticipant?.joinedAt || Date.now()
            };

            room.participants.set(userId, participantRecord);

            // Track connection mapping
            room.connections.set(connectionId, {
                userId: userId,
                name: participantRecord.name
            });

            // Remove from knock queue if somehow there
            room.knockQueue.delete(userId);

            console.log('[MeetingRoom] Host', isReconnecting ? 'reconnected' : 'joined', '- userId:', userId);

            // Broadcast appropriate event
            this._broadcast(room.roomId, {
                type: isReconnecting ? 'participant_reconnected' : 'participant_joined',
                participant: participantRecord,
                hostId: room.hostUserId,
                participants: this._participantList(room)
            });

            return {
                status: 'joined',
                role: 'host',
                hostId: room.hostUserId,
                room: this._roomSummary(room),
                user: participantRecord
            };
        }

        // ─── PARTICIPANT / GUEST FLOW ────────────────────────────────────────

        // If already an active participant in room (RECONNECTION)
        if (room.participants.has(userId)) {
            const existing = room.participants.get(userId);

            console.log('[MeetingRoom] Participant reconnecting - userId:', userId, 'old connectionId:', existing.connectionId, 'new connectionId:', connectionId);

            // Update their reconnection details
            existing.connectionId = connectionId;  // Update to new connection ID
            existing.name = user.name || existing.name;
            existing.email = user.email || existing.email;
            existing.picture = user.picture || existing.picture;
            existing.audioEnabled = user.audioEnabled !== false;
            existing.videoEnabled = user.videoEnabled !== false;
            existing.status = 'CONNECTED';

            // Update connection mapping
            room.connections.set(connectionId, {
                userId: userId,
                name: existing.name
            });

            // Broadcast reconnection to all participants
            this._broadcast(room.roomId, {
                type: 'participant_reconnected',
                participant: existing,
                hostId: room.hostUserId,
                participants: this._participantList(room)
            });

            return {
                status: 'joined',
                role: existing.role,
                hostId: room.hostUserId,
                room: this._roomSummary(room),
                user: existing
            };
        }

        // Check knock queue (by userId)
        const existingKnock = room.knockQueue.get(userId);

        if (existingKnock?.status === 'admitted' || existingKnock?.status === 'ADMITTED') {
            console.log('[MeetingRoom] Participant admitted from knock queue - userId:', userId);

            // Move from Knock Queue -> Active Participants
            room.knockQueue.delete(userId);

            const participantRecord = {
                userId: userId,
                connectionId: connectionId,
                name: user.name || existingKnock.name || 'Participant',
                email: user.email || existingKnock.email || '',
                picture: user.picture || existingKnock.picture || '',
                role: 'participant',
                status: 'CONNECTED',
                audioEnabled: user.audioEnabled !== false,
                videoEnabled: user.videoEnabled !== false,
                screenSharing: false,
                joinedAt: Date.now()
            };

            room.participants.set(userId, participantRecord);
            room.connections.set(connectionId, {
                userId: userId,
                name: participantRecord.name
            });

            // Broadcast to ALL connected clients so existing peers initiate WebRTC offers
            this._broadcast(room.roomId, {
                type: 'participant_joined',
                participant: participantRecord,
                hostId: room.hostUserId,
                participants: this._participantList(room)
            });

            return {
                status: 'joined',
                role: 'participant',
                hostId: room.hostUserId,
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
        console.log('[MeetingRoom] Adding to knock queue - userId:', userId);

        const knockRecord = {
            userId: userId,
            connectionId: connectionId,
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

        // ═══════════════════════════════════════════════════════════════════════
        // CRITICAL FIX: Send knock request ONLY to host's SSE connection(s)
        // ═══════════════════════════════════════════════════════════════════════
        this._broadcastToUser(room.roomId, room.hostUserId, {
            type: 'knock_request',
            knock: knockRecord,
            knockQueue: this._knockList(room)
        });

        console.log('[MeetingRoom] Knock request sent to hostUserId:', room.hostUserId);

        return {
            status: 'waiting_for_host',
            role: 'participant',
            hostId: room.hostUserId,
            message: 'Asking to be let in...',
            user: knockRecord
        };
    }

    /**
     * Host Admits / Denies Guest
     */
    admitGuest(roomId, guestUserId, action = 'admit') {
        const room = this._getRoom(roomId);
        if (!room) return { error: 'Room not found' };

        const knock = room.knockQueue.get(guestUserId);
        if (!knock) return { error: 'Knock request not found' };

        console.log('[MeetingRoom] Admit/deny - guestUserId:', guestUserId, 'action:', action);

        if (action === 'admit') {
            knock.status = 'admitted';

            // Send notification directly to the waiting guest (by userId)
            this._broadcastToUser(room.roomId, guestUserId, {
                type: 'knock_response',
                guestUserId: guestUserId,
                status: 'admitted'
            });

            // Update host's knock queue UI
            this._broadcastToUser(room.roomId, room.hostUserId, {
                type: 'knock_queue_update',
                knockQueue: this._knockList(room)
            });

            console.log('[MeetingRoom] Guest admitted - userId:', guestUserId);

            return { success: true, status: 'admitted' };
        } else {
            knock.status = 'denied';

            this._broadcastToUser(room.roomId, guestUserId, {
                type: 'knock_response',
                guestUserId: guestUserId,
                status: 'denied'
            });

            this._broadcastToUser(room.roomId, room.hostUserId, {
                type: 'knock_queue_update',
                knockQueue: this._knockList(room)
            });

            console.log('[MeetingRoom] Guest denied - userId:', guestUserId);

            return { success: true, status: 'denied' };
        }
    }

    /**
     * Update participant media state (mic/cam/screen)
     */
    updateMediaState(roomId, userId, connectionId, updates = {}) {
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
     * Signals use connectionId (ephemeral) for WebRTC peer tracking
     */
    sendSignal(roomId, signal) {
        const room = this._getRoom(roomId);
        if (!room) return { error: 'Room not found' };

        // Signal.to is a connectionId
        const targetConnection = room.connections.get(signal.to);
        if (targetConnection) {
            this._broadcastToUser(room.roomId, targetConnection.userId, {
                type: 'webrtc_signal',
                signal: {
                    from: signal.from,
                    to: signal.to,
                    type: signal.type,
                    data: signal.data
                }
            });
        }

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
     * Uses userId (persistent) as screen share owner
     */
    setScreenShare(roomId, userId, isSharing) {
        const room = this._getRoom(roomId);
        if (!room) return { error: 'Room not found' };

        console.log('[MeetingRoom] Screen share - userId:', userId, 'isSharing:', isSharing);

        if (isSharing) {
            room.screenShareOwner = userId;
            const p = room.participants.get(userId);
            if (p) p.screenSharing = true;

            this._broadcast(room.roomId, {
                type: 'screen_share_started',
                ownerUserId: userId,
                ownerName: p?.name || 'Participant',
                participants: this._participantList(room)
            });
        } else {
            if (room.screenShareOwner === userId) room.screenShareOwner = null;
            const p = room.participants.get(userId);
            if (p) p.screenSharing = false;

            this._broadcast(room.roomId, {
                type: 'screen_share_stopped',
                ownerUserId: userId,
                participants: this._participantList(room)
            });
        }
        return { success: true };
    }

    /**
     * Leave Meeting
     * Uses both userId (persistent) and connectionId (ephemeral)
     */
    leaveRoom(roomId, userId, connectionId) {
        const room = this._getRoom(roomId);
        if (!room) return;

        console.log('[MeetingRoom] Leave - userId:', userId, 'connectionId:', connectionId);

        room.participants.delete(userId);
        room.knockQueue.delete(userId);
        if (connectionId) room.connections.delete(connectionId);
        if (room.screenShareOwner === userId) room.screenShareOwner = null;

        this._broadcast(room.roomId, {
            type: 'participant_left',
            userId: userId,
            connectionId: connectionId,
            hostId: room.hostUserId,
            participants: this._participantList(room)
        });

        // Clean up empty rooms after 30 seconds
        if (room.participants.size === 0) {
            setTimeout(() => {
                if (room.participants.size === 0) {
                    this.rooms.delete(room.roomId);
                    console.log('[MeetingRoom] Room cleaned up:', room.roomId);
                }
            }, 30000);
        }
    }

    /**
     * End Meeting (Host only)
     */
    endMeeting(roomId, hostUserId) {
        const room = this._getRoom(roomId);
        if (!room) return { error: 'Room not found' };

        // Verify caller is host
        if (room.hostUserId !== hostUserId) {
            return { error: 'Only the host can end the meeting' };
        }

        console.log('[MeetingRoom] Ending meeting - roomId:', roomId, 'hostUserId:', hostUserId);

        // Broadcast meeting ended to all participants
        this._broadcast(room.roomId, {
            type: 'meeting_ended',
            hostUserId: hostUserId
        });

        // Clean up room immediately
        this.rooms.delete(room.roomId);
        return { success: true };
    }

    /**
     * Transfer Host
     */
    transferHost(roomId, currentHostUserId, newHostUserId) {
        const room = this._getRoom(roomId);
        if (!room) return { error: 'Room not found' };

        // Verify caller is current host
        if (room.hostUserId !== currentHostUserId) {
            return { error: 'Only the current host can transfer host role' };
        }

        const newHost = room.participants.get(newHostUserId);
        if (!newHost) {
            return { error: 'New host not found in meeting' };
        }

        console.log('[MeetingRoom] Transferring host from', currentHostUserId, 'to', newHostUserId);

        // Update host
        room.hostUserId = newHostUserId;
        newHost.role = 'host';

        // Update old host to participant (if still in room)
        const oldHost = room.participants.get(currentHostUserId);
        if (oldHost) {
            oldHost.role = 'participant';
        }

        // Broadcast host change
        this._broadcast(room.roomId, {
            type: 'host_transferred',
            oldHostUserId: currentHostUserId,
            newHostUserId: newHostUserId,
            hostId: room.hostUserId,
            participants: this._participantList(room)
        });

        return { success: true };
    }

    /**
     * SSE Event Stream Registration
     * Track by both userId (for targeted messaging) and connectionId (for connection tracking)
     */
    registerSSE(roomId, userId, connectionId, res) {
        const id = this._cleanId(roomId);
        if (!this.sseListeners.has(id)) {
            this.sseListeners.set(id, new Set());
        }
        const listener = { userId, connectionId, res };
        this.sseListeners.get(id).add(listener);

        console.log('[MeetingRoom] SSE registered - roomId:', id, 'userId:', userId, 'connectionId:', connectionId);

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
            hostId: room.hostUserId,
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
            console.log('[MeetingRoom] SSE disconnected - userId:', userId, 'connectionId:', connectionId);
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

    /**
     * Broadcast to specific user (by userId)
     * This ensures messages reach ALL connections of that user
     */
    _broadcastToUser(roomId, targetUserId, data) {
        const id = this._cleanId(roomId);
        const set = this.sseListeners.get(id);
        if (!set) {
            console.warn('[MeetingRoom] No SSE listeners for room:', id);
            return;
        }
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        let sent = 0;
        for (const listener of set) {
            if (listener.userId === targetUserId) {
                try {
                    listener.res.write(payload);
                    sent++;
                } catch {}
            }
        }
        console.log('[MeetingRoom] Broadcast to userId:', targetUserId, 'sent to', sent, 'connection(s)');
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
            hostId: room.hostUserId,
            participants: this._participantList(room),
            knockQueue: this._knockList(room),
            messages: room.messages,
            screenShareOwner: room.screenShareOwner
        };
    }
}

module.exports = new MeetingRoomService();
