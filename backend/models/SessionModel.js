/**
 * Session Model
 * Defines meeting session lifecycles, configuration, and access controls
 */

class SessionModel {
    constructor(data = {}) {
        this.sessionId = data.sessionId || this.generateSessionId();
        this.title = data.title || 'Secure Technical Evaluation';
        this.passcode = data.passcode || '';
        this.candidateName = data.candidateName || 'Candidate';
        this.createdBy = data.createdBy || null;
        this.status = data.status || 'ACTIVE'; // ACTIVE, COMPLETED, CANCELLED
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.settings = {
            proctoringEnabled: data.settings?.proctoringEnabled ?? true,
            tabSwitchDetection: data.settings?.tabSwitchDetection ?? true,
            clipboardGuards: data.settings?.clipboardGuards ?? true,
            aiTranslationEnabled: data.settings?.aiTranslationEnabled ?? true,
            requireHostAdmission: data.settings?.requireHostAdmission ?? true,
            ...data.settings
        };
    }

    generateSessionId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const seg = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        return `${seg(3)}-${seg(4)}-${seg(3)}`;
    }

    verifyPasscode(inputPasscode) {
        if (!this.passcode) return true;
        return this.passcode.trim() === (inputPasscode || '').trim();
    }

    toJSON() {
        return {
            sessionId: this.sessionId,
            title: this.title,
            passcodeRequired: Boolean(this.passcode),
            candidateName: this.candidateName,
            createdBy: this.createdBy,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            settings: this.settings
        };
    }
}

module.exports = SessionModel;
