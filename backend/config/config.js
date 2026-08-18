const fs = require('fs');
const path = require('path');

// Auto-load .env from project root or backend folder if present
const envPaths = [
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '../.env')
];
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        try {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const match = trimmed.match(/^([^=]+)=(.*)$/);
                    if (match) {
                        const key = match[1].trim();
                        const val = match[2].trim().replace(/^["']|["']$/g, '');
                        if (!process.env[key]) {
                            process.env[key] = val;
                        }
                    }
                }
            });
        } catch {}
    }
}

// Detect production environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production';

module.exports = {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || '0.0.0.0', // Changed from 'localhost' to accept all connections
    SCAN_INTERVAL_MS: 1000,
    GOOGLE: {
        CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
        CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
        // Production: use env var (required). Development: auto-generate from HOST/PORT
        REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || (isProduction ? '' : `http://localhost:3000/api/auth/google/callback`)
    },
    MONGODB: {
        URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/securemeet'
    },
    RAZORPAY: {
        KEY_ID: process.env.RAZORPAY_KEY_ID || '',
        KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || ''
    },
    SESSION_SECRET: process.env.SESSION_SECRET || 'securemeet-super-secret-hmac-key-2026',
    FRONTEND_URL: (process.env.FRONTEND_URL || 'https://securemeet-privatedoc.vercel.app').replace(/\/+$/, ''),
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean)
        : [],
    PATHS: {
        FRONTEND_PUBLIC: path.join(__dirname, '../../frontend/dist'),
        NATIVE_BIN: path.join(__dirname, '../../native/bin'),
        DETECTOR_EXE: path.join(__dirname, '../../native/bin/display_affinity_detector.exe'),
        AUDIT_LOGS_DIR: path.join(__dirname, '../logs')
    },
    IS_PRODUCTION: isProduction
};
