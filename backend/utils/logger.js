/**
 * Centralized Enterprise Logger
 * Uses Winston if available, falls back to structured console + rotating log files
 */
const path = require('path');
const fs = require('fs');

const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    try {
        fs.mkdirSync(logsDir, { recursive: true });
    } catch {}
}

let loggerInstance = null;

try {
    const winston = require('winston');
    const logFormat = winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    );

    const consoleFormat = winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            let msg = `${timestamp} [${level}]: ${message}`;
            if (Object.keys(meta).length > 0) {
                msg += ` ${JSON.stringify(meta)}`;
            }
            return msg;
        })
    );

    loggerInstance = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: logFormat,
        defaultMeta: { service: 'securemeet-backend' },
        transports: [
            new winston.transports.File({
                filename: path.join(logsDir, 'error.log'),
                level: 'error',
                maxsize: 5242880,
                maxFiles: 5,
                tailable: true
            }),
            new winston.transports.File({
                filename: path.join(logsDir, 'combined.log'),
                maxsize: 5242880,
                maxFiles: 5,
                tailable: true
            }),
            new winston.transports.Console({
                format: consoleFormat
            })
        ]
    });
} catch (e) {
    // Robust zero-dependency fallback logger
    const writeLog = (level, message, meta) => {
        const timestamp = new Date().toISOString();
        const metaStr = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        const line = `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}\n`;
        
        if (level === 'error') {
            console.error(`\x1b[31m${line.trim()}\x1b[0m`);
            try { fs.appendFileSync(path.join(logsDir, 'error.log'), line); } catch {}
        } else if (level === 'warn') {
            console.warn(`\x1b[33m${line.trim()}\x1b[0m`);
        } else {
            console.log(`\x1b[36m${line.trim()}\x1b[0m`);
        }
        try { fs.appendFileSync(path.join(logsDir, 'combined.log'), line); } catch {}
    };

    loggerInstance = {
        info: (msg, meta) => writeLog('info', msg, meta),
        warn: (msg, meta) => writeLog('warn', msg, meta),
        error: (msg, meta) => writeLog('error', msg, meta),
        debug: (msg, meta) => writeLog('debug', msg, meta)
    };
}

loggerInstance.stream = {
    write: (message) => {
        loggerInstance.info(message.trim());
    }
};

module.exports = loggerInstance;
