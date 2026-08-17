/**
 * Session Validator
 * Validates session creation and verification payloads
 */
const { ValidationError } = require('../utils/errors');

class SessionValidator {
    static validateCreate(data = {}) {
        if (data.title && typeof data.title !== 'string') {
            throw new ValidationError('Session title must be a string');
        }
        if (data.passcode && (typeof data.passcode !== 'string' || data.passcode.length < 4)) {
            throw new ValidationError('Passcode must be at least 4 characters long');
        }
        return true;
    }

    static validateVerify(data = {}) {
        if (!data.sessionId || typeof data.sessionId !== 'string') {
            throw new ValidationError('Valid sessionId is required');
        }
        return true;
    }
}

module.exports = SessionValidator;
