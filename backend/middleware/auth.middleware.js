/**
 * Auth Middleware
 * Extracts and verifies session cookies and authenticated user state
 */
const googleAuthService = require('../services/googleAuthService');

const parseCookies = header => Object.fromEntries((header || '').split(';').filter(Boolean).map(part => {
    const index = part.indexOf('=');
    if (index === -1) return [part.trim(), ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
}));

function authMiddleware(req, res, next) {
    const cookies = parseCookies(req.headers.cookie);
    req.cookies = cookies;
    req.user = googleAuthService.getSession(cookies.securemeet_auth) || null;
    if (typeof next === 'function') next();
}

function requireAuth(req, res, next) {
    authMiddleware(req, res);
    if (!req.user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authentication required. Please sign in with Google.' }));
        return false;
    }
    if (typeof next === 'function') next();
    return true;
}

/**
 * Verify that authenticated user matches claimed userId in request
 * For OAuth users only (guests use hostToken verification)
 */
function verifyUserIdMatch(req, claimedUserId) {
    // If authenticated via OAuth, verify userId matches
    if (req.user && req.user.id !== claimedUserId) {
        console.warn('[Auth] User ID mismatch - authenticated:', req.user.id, 'claimed:', claimedUserId);
        return false;
    }
    return true;
}

module.exports = { authMiddleware, requireAuth, parseCookies, verifyUserIdMatch };
