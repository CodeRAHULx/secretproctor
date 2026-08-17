/**
 * Threat Validator
 * Validates threat process termination and forensics payloads
 */
const { ValidationError } = require('../utils/errors');

class ThreatValidator {
    static validateKill(data = {}) {
        const pid = parseInt(data.pid, 10);
        const hwnd = parseInt(data.hwnd, 10);
        if ((!pid || isNaN(pid) || pid <= 4) && (!hwnd || isNaN(hwnd))) {
            throw new ValidationError('Valid target PID or HWND is required');
        }
        return true;
    }
}

module.exports = ThreatValidator;
