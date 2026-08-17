class ThreatModel {
    constructor({ pid, path, title, className, dimensions, width, height, flag, affinity, reason, severity = 'CRITICAL' }) {
        this.id = `threat_${Date.now()}_${pid}`;
        this.pid = String(pid);
        this.path = path || 'Unknown Executable';
        this.title = title || 'Hidden Window';
        this.className = className || 'Unknown Class';
        this.dimensions = dimensions || `${width || 0}x${height || 0}`;
        this.flag = flag || affinity || 'WDA_EXCLUDEFROMCAPTURE';
        this.reason = reason || 'Window blotted from screen capture stream';
        this.severity = severity;
        this.detectedAt = new Date().toLocaleTimeString();
        this.resolved = false;
    }

    static parseFromJson(rawJsonString) {
        if (!rawJsonString || typeof rawJsonString !== 'string') return [];
        try {
            const data = JSON.parse(rawJsonString.trim());
            if (data && Array.isArray(data.threats)) {
                return data.threats.map(t => new ThreatModel(t));
            }
        } catch (err) {
            console.error('[ThreatModel] Error parsing native detector JSON:', err.message);
        }
        return [];
    }
}

module.exports = ThreatModel;
