/**
 * Auth Validator
 * Validates authentication tokens, callbacks, and login inputs
 */
const { ValidationError } = require('../utils/errors');

class AuthValidator {
    static validateCallback(query) {
        if (!query.code) {
            throw new ValidationError('Authorization code is required');
        }
        if (!query.state) {
            throw new ValidationError('OAuth state parameter is required');
        }
        return true;
    }

    static validateToken(token) {
        if (!token || typeof token !== 'string') {
            throw new ValidationError('Authentication token must be a non-empty string');
        }
        const parts = token.split('.');
        if (parts.length !== 2) {
            throw new ValidationError('Invalid token format');
        }
        return true;
    }
}

module.exports = AuthValidator;
