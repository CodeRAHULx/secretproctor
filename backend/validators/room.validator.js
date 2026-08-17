/**
 * Room Validator
 * Validates room join, admission, signals, and in-call messaging
 */
const { ValidationError } = require('../utils/errors');

class RoomValidator {
    static validateJoin(data = {}) {
        if (!data.roomId || typeof data.roomId !== 'string' || !data.roomId.trim()) {
            throw new ValidationError('roomId is required');
        }
        return true;
    }

    static validateAdmit(data = {}) {
        if (!data.roomId || typeof data.roomId !== 'string') {
            throw new ValidationError('roomId is required');
        }
        if (!data.guestId || typeof data.guestId !== 'string') {
            throw new ValidationError('guestId is required');
        }
        if (data.action && !['admit', 'deny'].includes(data.action)) {
            throw new ValidationError('Action must be either "admit" or "deny"');
        }
        return true;
    }

    static validateSignal(data = {}) {
        if (!data.roomId || typeof data.roomId !== 'string') {
            throw new ValidationError('roomId is required');
        }
        if (!data.signal || typeof data.signal !== 'object') {
            throw new ValidationError('signal object is required');
        }
        if (!data.signal.to || !data.signal.type) {
            throw new ValidationError('Signal destination (to) and type are required');
        }
        return true;
    }

    static validateChat(data = {}) {
        if (!data.roomId || typeof data.roomId !== 'string') {
            throw new ValidationError('roomId is required');
        }
        if (!data.message || !data.message.text || typeof data.message.text !== 'string' || !data.message.text.trim()) {
            throw new ValidationError('Non-empty message text is required');
        }
        return true;
    }
}

module.exports = RoomValidator;
