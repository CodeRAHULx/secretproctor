/**
 * Audit Log Model
 * Defines forensic evidence, trust scoring reports, and security logs
 */

class AuditLogModel {
    constructor(data = {}) {
        this.id = data.id || `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.sessionId = data.sessionId || 'unknown';
        this.participant = data.participant || 'Unknown Participant';
        this.role = data.role || 'candidate';
        this.authProvider = data.authProvider || 'Guest';
        this.finalTrustScore = data.finalTrustScore || '100%';
        this.activeThreatsDetected = data.activeThreatsDetected || [];
        this.incidentLogs = data.incidentLogs || [];
        this.participantsCount = data.participantsCount || 1;
        this.fingerprint = data.fingerprint || null;
        this.timestamp = data.timestamp || new Date().toISOString();
    }

    addIncident(incident) {
        this.incidentLogs.push({
            id: incident.id || `inc_${Date.now()}`,
            at: incident.at || new Date().toLocaleTimeString(),
            message: incident.message,
            level: incident.level || 'info'
        });
    }

    toJSON() {
        return {
            id: this.id,
            sessionId: this.sessionId,
            participant: this.participant,
            role: this.role,
            authProvider: this.authProvider,
            finalTrustScore: this.finalTrustScore,
            activeThreatsDetected: this.activeThreatsDetected,
            incidentLogs: this.incidentLogs,
            participantsCount: this.participantsCount,
            fingerprint: this.fingerprint,
            timestamp: this.timestamp
        };
    }
}

module.exports = AuditLogModel;
