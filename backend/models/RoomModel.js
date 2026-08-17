/**
 * Room Model
 * Defines real-time multi-peer room states, knock queues, and live messaging
 */

class RoomModel {
    constructor(roomId) {
        this.roomId = roomId.trim().toLowerCase();
        this.hostId = null;
        this.participants = new Map(); // userId -> { id, name, email, picture, role, joinedAt, fingerprint }
        this.knockQueue = new Map();   // userId -> { id, name, email, picture, timestamp, status, fingerprint }
        this.messages = [];            // [{ id, senderId, senderName, text, timestamp }]
        this.createdAt = Date.now();
        this.lastActivityAt = Date.now();
    }

    addParticipant(user) {
        this.participants.set(user.id, user);
        this.lastActivityAt = Date.now();
    }

    removeParticipant(userId) {
        this.participants.delete(userId);
        this.knockQueue.delete(userId);
        this.lastActivityAt = Date.now();
    }

    getParticipantList() {
        return Array.from(this.participants.values());
    }

    getKnockList() {
        return Array.from(this.knockQueue.values());
    }

    toSummary() {
        return {
            roomId: this.roomId,
            hostId: this.hostId,
            participants: this.getParticipantList(),
            knockQueue: this.getKnockList(),
            messages: this.messages,
            createdAt: this.createdAt
        };
    }
}

module.exports = RoomModel;
