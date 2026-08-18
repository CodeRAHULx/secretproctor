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
        // Check for native C++ detector (all platforms)
        const nativeDetectorPaths = {
            win32: path.join(__dirname, '../../native/bin/display_affinity_detector.exe'),
            linux: path.join(__dirname, '../../native/bin/display_affinity_detector'),
            darwin: path.join(__dirname, '../../native/bin/display_affinity_detector')
        };

        const nativePath = nativeDetectorPaths[this.platform];
        if (nativePath && fs.existsSync(nativePath)) {
            this.detectorPath = nativePath;
            return 'native-cross-platform';
        }

        // Fallback: Check for Node.js detector (limited features)
        const nodeDetector = path.join(__dirname, '../../detector/detector.js');
        if (fs.existsSync(nodeDetector)) {
            this.detectorPath = nodeDetector;
            return 'node-fallback';
        }

        return 'none';
    }

    start(intervalMs = config.SCAN_INTERVAL_MS) {
        if (!this.detectorAvailable) {
            console.log('[NativeWatchdogService] No detector available. Proctoring features disabled.');
            if (this.detectorType === 'none') {
                console.log('[NativeWatchdogService] To enable proctoring:');
                console.log('  1. Build native detector: cd native && ./build.sh (Linux/Mac) or build.bat (Windows)');
                console.log('  2. OR install Node detector: cd detector && npm install');
                console.log('  3. Restart the server');
            }
            return;
        }

        const detectorName = this.detectorType === 'native-cross-platform' ?
            `native C++ detector (${this.platform})` :
            'Node.js fallback detector';

        console.log(`[NativeWatchdogService] Starting ${detectorName}...`);
        console.log(`[NativeWatchdogService] Detector path: ${this.detectorPath}`);

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
            case 'native-cross-platform':
                return `"${this.detectorPath}"`;

            case 'node-fallback':
                return `node "${this.detectorPath}" --json`;

            default:
                return 'echo {"hasThreat":false,"threatCount":0,"threats":[]}';
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
