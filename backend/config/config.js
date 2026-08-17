const path = require('path');

module.exports = {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || 'localhost',
    SCAN_INTERVAL_MS: 1000,
    GOOGLE: {
        CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
        CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
        REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 3000}/api/auth/google/callback`
    },
    PATHS: {
        FRONTEND_PUBLIC: path.join(__dirname, '../../frontend/dist'),
        NATIVE_BIN: path.join(__dirname, '../../native/bin'),
        DETECTOR_EXE: path.join(__dirname, '../../native/bin/display_affinity_detector.exe'),
        AUDIT_LOGS_DIR: path.join(__dirname, '../logs')
    }
};
