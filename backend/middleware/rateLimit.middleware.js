/**
 * Rate Limiter Middleware
 * Memory-efficient sliding window rate limiter to protect endpoints against abuse
 */

class RateLimiter {
    constructor(options = {}) {
        this.windowMs = options.windowMs || 60 * 1000; // 1 minute window
        this.max = options.max || 120; // 120 requests per window default
        this.hits = new Map(); // IP -> [timestamps]
    }

    check(req, res) {
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
        const now = Date.now();
        const windowStart = now - this.windowMs;

        let timestamps = this.hits.get(ip) || [];
        timestamps = timestamps.filter(t => t > windowStart);
        timestamps.push(now);
        this.hits.set(ip, timestamps);

        // Periodically cleanup memory
        if (this.hits.size > 1000) {
            for (const [key, list] of this.hits.entries()) {
                if (list.length === 0 || list[list.length - 1] < windowStart) {
                    this.hits.delete(key);
                }
            }
        }

        if (timestamps.length > this.max) {
            res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': Math.ceil(this.windowMs / 1000) });
            res.end(JSON.stringify({ error: 'Too many requests. Please slow down.' }));
            return false;
        }

        return true;
    }
}

const defaultLimiter = new RateLimiter({ windowMs: 60 * 1000, max: 200 });
const authLimiter = new RateLimiter({ windowMs: 60 * 1000, max: 40 });

module.exports = { RateLimiter, defaultLimiter, authLimiter };
