const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const ThreatModel = require('../models/ThreatModel');

class NativeWatchdogService {
    constructor() {
        this.currentThreats = [];
        this.subscribers = [];
        this.isScanning = false;
        this.platform = process.platform;

        // Determine which detector to use
        this.detectorType = this.determineDetector();
        this.detectorAvailable = this.detectorType !== 'none';

        console.log(`[NativeWatchdogService] Platform: ${this.platform}`);
        console.log(`[NativeWatchdogService] Detector type: ${this.detectorType}`);
    }

    determineDetector() {
        // Check for Node.js cross-platform detector (works on all platforms)
        const crossPlatformDetector = path.join(__dirname, '../../detector/detector.js');
        if (fs.existsSync(crossPlatformDetector)) {
            return 'cross-platform';
        }

        // Check for native C++ detector (Windows only)
        if (this.platform === 'win32' && fs.existsSync(config.PATHS.DETECTOR_EXE)) {
            return 'native-windows';
        }

        return 'none';
    }

    start(intervalMs = config.SCAN_INTERVAL_MS) {
        if (!this.detectorAvailable) {
            console.log('[NativeWatchdogService] No detector available. Proctoring features disabled.');
            console.log('[NativeWatchdogService] To enable proctoring:');
            console.log('  1. Install detector dependencies: cd detector && npm install');
            console.log('  2. Restart the server');
            return;
        }

        console.log(`[NativeWatchdogService] Starting ${this.detectorType} detector...`);
        this.scan();
        setInterval(() => this.scan(), intervalMs);
    }

    scan() {
        if (this.isScanning || !this.detectorAvailable) return;
        this.isScanning = true;

        const command = this.getDetectorCommand();

        exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
            this.isScanning = false;

            if (error && error.code === 2) {
                // Fatal error (detector crashed)
                console.error('[NativeWatchdogService] Detector error:', stderr);
                return;
            }

            const output = stdout || '';

            try {
                // Parse structured JSON from detector
                this.currentThreats = ThreatModel.parseFromJson(output);

                const payload = {
                    timestamp: new Date().toISOString(),
                    hasThreat: this.currentThreats.length > 0,
                    threatCount: this.currentThreats.length,
                    threats: this.currentThreats,
                    detectorType: this.detectorType,
                    platform: this.platform
                };

                this.notifySubscribers(payload);
            } catch (parseError) {
                console.error('[NativeWatchdogService] Failed to parse detector output:', parseError.message);
            }
        });
    }

    getDetectorCommand() {
        switch (this.detectorType) {
            case 'cross-platform':
                return `node "${path.join(__dirname, '../../detector/detector.js')}" --json`;

            case 'native-windows':
                return `"${config.PATHS.DETECTOR_EXE}" --json`;

            default:
                return 'echo {"threatCount":0,"threats":[]}';
        }
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
                detectorDisabled: true,
                platform: this.platform,
                message: 'Proctoring detector not available on this platform'
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
            } catch (e) {
                // Client disconnected, will be cleaned up
            }
        });
    }

    async killProcess(pid) {
        return new Promise((resolve, reject) => {
            if (!this.detectorAvailable) {
                return reject(new Error('Process termination not available (detector disabled)'));
            }

            if (!pid) {
                return reject(new Error('Invalid PID'));
            }

            const pidNum = parseInt(pid, 10);
            if (isNaN(pidNum)) {
                return reject(new Error('Invalid PID format'));
            }

            // Platform-specific kill commands
            let killCommand;
            switch (this.platform) {
                case 'win32':
                    killCommand = `taskkill /F /PID ${pidNum}`;
                    break;
                case 'linux':
                case 'darwin':
                    killCommand = `kill -9 ${pidNum}`;
                    break;
                default:
                    return reject(new Error(`Process kill not supported on platform: ${this.platform}`));
            }

            exec(killCommand, (err, stdout, stderr) => {
                if (err) {
                    return reject(new Error(stderr || stdout || 'Failed to kill process'));
                }

                // Trigger a new scan after killing process
                setTimeout(() => this.scan(), 500);

                resolve({
                    success: true,
                    message: `Process ${pidNum} terminated successfully`,
                    platform: this.platform
                });
            });
        });
    }

    getStatus() {
        return {
            available: this.detectorAvailable,
            type: this.detectorType,
            platform: this.platform,
            scanning: this.isScanning,
            subscribers: this.subscribers.length,
            currentThreats: this.currentThreats.length
        };
    }
}

module.exports = new NativeWatchdogService();
