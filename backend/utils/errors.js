/**
 * Custom Error Classes
 * Provides structured error handling throughout the application
 */

class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400);
        this.name = 'ValidationError';
        this.details = details;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401);
        this.name = 'AuthenticationError';
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403);
        this.name = 'AuthorizationError';
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404);
        this.name = 'NotFoundError';
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409);
        this.name = 'ConflictError';
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429);
        this.name = 'RateLimitError';
    }
}

class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500, false);
        this.name = 'InternalServerError';
    }
}

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    InternalServerError
};
