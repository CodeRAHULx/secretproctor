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
        this.isWindows = process.platform === 'win32';
        this.detectorAvailable = this.isWindows && fs.existsSync(this.detectorPath);
    }

    start(intervalMs = config.SCAN_INTERVAL_MS) {
        if (!this.detectorAvailable) {
            console.log('[NativeWatchdogService] Native detector not available (Linux/Mac or missing .exe). Proctoring features disabled.');
            return;
        }
        console.log(`[NativeWatchdogService] Monitoring active with native engine: ${this.detectorPath}`);
        this.scan();
        setInterval(() => this.scan(), intervalMs);
    }

    scan() {
        if (this.isScanning || !this.detectorAvailable) return;
        this.isScanning = true;

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
        // If detector is not available, send empty status immediately
        if (!this.detectorAvailable) {
            const payload = {
                timestamp: new Date().toISOString(),
                hasThreat: false,
                threatCount: 0,
                threats: [],
                detectorDisabled: true
            };
            try {
                res.write(`data: ${JSON.stringify(payload)}\n\n`);
            } catch (e) {}
        }
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
            if (!this.detectorAvailable) {
                return reject(new Error('Process kill not available on this platform'));
            }
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
