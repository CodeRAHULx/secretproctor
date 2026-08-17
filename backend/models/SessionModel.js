class SessionModel {
    constructor(sessionId = 'tech-interview-live-892', candidateName = 'John Doe') {
        this.sessionId = sessionId;
        this.candidateName = candidateName;
        this.startTime = new Date().toISOString();
        this.trustScore = 100;
        this.status = 'CLEAN';
        this.incidentLogs = [];
        this.detectedThreatsHistory = [];
    }

    logIncident(message, type = 'system', metadata = {}) {
        const incident = {
            id: `inc_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type,
            message,
            metadata
        };
        this.incidentLogs.push(incident);

        if (type === 'alert') {
            this.trustScore = Math.max(0, this.trustScore - 40);
            this.status = 'COMPROMISED';
        } else if (type === 'warning') {
            this.trustScore = Math.max(0, this.trustScore - 15);
        }

        return incident;
    }

    addThreat(threat) {
        this.detectedThreatsHistory.push(threat);
        this.logIncident(`CRITICAL: Evasion process detected: ${threat.path} (PID: ${threat.pid})`, 'alert', threat);
    }

    exportForensicReport() {
        return {
            sessionId: this.sessionId,
            candidateName: this.candidateName,
            startTime: this.startTime,
            exportedAt: new Date().toISOString(),
            finalTrustScore: `${this.trustScore}%`,
            sessionStatus: this.status,
            totalIncidents: this.incidentLogs.length,
            threatsSummary: this.detectedThreatsHistory,
            fullAuditLog: this.incidentLogs
        };
    }
}

module.exports = SessionModel;
