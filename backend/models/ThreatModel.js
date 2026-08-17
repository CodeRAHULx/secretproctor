/**
 * Threat Model
 * Defines structured threat telemetry records and validation
 */

class ThreatModel {
    constructor(data = {}) {
        this.id = data.id || `threat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.pid = data.pid || 0;
        this.hwnd = data.hwnd || 0;
        this.title = data.title || '';
        this.path = data.path || '';
        this.affinity = data.affinity || 0;
        this.affinityHex = data.affinityHex || (data.affinity ? `0x${data.affinity.toString(16)}` : '0x0');
        this.type = data.type || 'DISPLAY_AFFINITY_STEALTH';
        this.severity = data.severity || 'CRITICAL'; // CRITICAL, HIGH, MEDIUM, LOW
        this.detectedAt = data.detectedAt || new Date().toISOString();
        this.status = data.status || 'ACTIVE'; // ACTIVE, TERMINATED, DISMISSED
        this.metadata = data.metadata || {};
    }

    static fromNativeEvent(event) {
        return new ThreatModel({
            pid: event.pid,
            hwnd: event.hwnd,
            title: event.title,
            path: event.path,
            affinity: event.affinity,
            affinityHex: event.affinityHex || (event.affinity ? `0x${event.affinity.toString(16)}` : '0x0'),
            type: event.type || 'WDA_EXCLUDEFROMCAPTURE_STEALTH',
            severity: 'CRITICAL',
            detectedAt: event.timestamp || new Date().toISOString()
        });
    }

    terminate() {
        this.status = 'TERMINATED';
        this.terminatedAt = new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            pid: this.pid,
            hwnd: this.hwnd,
            title: this.title,
            path: this.path,
            affinity: this.affinity,
            affinityHex: this.affinityHex,
            type: this.type,
            severity: this.severity,
            detectedAt: this.detectedAt,
            status: this.status,
            terminatedAt: this.terminatedAt,
            metadata: this.metadata
        };
    }
}

module.exports = ThreatModel;
