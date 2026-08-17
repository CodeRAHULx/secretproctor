const { exec } = require('child_process');
const fs = require('fs');
const config = require('../config/config');
const ThreatModel = require('../models/ThreatModel');

class NativeWatchdogService {
    constructor() {
        this.detectorPath = config.PATHS.DETECTOR_EXE;
        this.currentThreats = [];
        this.subscribers = [];
        this.isScanning = false;
    }

    start(intervalMs = config.SCAN_INTERVAL_MS) {
        console.log(`[NativeWatchdogService] Monitoring active with native engine: ${this.detectorPath}`);
        this.scan();
        setInterval(() => this.scan(), intervalMs);
    }

    scan() {
        if (this.isScanning) return;
        this.isScanning = true;

        if (!fs.existsSync(this.detectorPath)) {
            this.isScanning = false;
            return;
        }

        exec(`"${this.detectorPath}" --json`, { timeout: 2500 }, (error, stdout, stderr) => {
            this.isScanning = false;
            const output = stdout || '';
            
            // Parse structured JSON directly from C++ output
            this.currentThreats = ThreatModel.parseFromJson(output);

            const payload = {
                timestamp: new Date().toISOString(),
                hasThreat: this.currentThreats.length > 0,
                threatCount: this.currentThreats.length,
                threats: this.currentThreats
            };

            this.notifySubscribers(payload);
        });
    }

    subscribe(res) {
        this.subscribers.push(res);
    }

    unsubscribe(res) {
        this.subscribers = this.subscribers.filter(client => client !== res);
    }

    notifySubscribers(payload) {
        const data = `data: ${JSON.stringify(payload)}\n\n`;
        this.subscribers.forEach(res => {
            try {
                res.write(data);
            } catch (e) {}
        });
    }

    killProcess(pid) {
        return new Promise((resolve, reject) => {
            if (!pid) return reject(new Error('Invalid PID'));
            exec(`taskkill /F /PID ${parseInt(pid, 10)}`, (err, stdout, stderr) => {
                if (err) {
                    return reject(new Error(stderr || 'Failed to kill process'));
                }
                this.scan();
                resolve({ success: true, message: stdout.trim() });
            });
        });
    }
}

module.exports = new NativeWatchdogService();
