/**
 * Error Middleware
 * Centralized error handler and JSON response formatter
 */
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

function errorHandler(err, req, res) {
    const statusCode = err.statusCode || (err instanceof AppError ? err.statusCode : 500);
    const message = err.message || 'Internal Server Error';

    if (statusCode >= 500) {
        logger.error(`Server Error: ${err.message}`, { stack: err.stack, path: req.url, method: req.method });
    } else {
        logger.warn(`Client Error [${statusCode}]: ${err.message}`, { path: req.url });
    }

    if (!res.headersSent) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: message,
            details: err.details || null,
            code: err.name || 'Error'
        }));
    }
}

module.exports = errorHandler;
