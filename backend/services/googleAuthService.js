const crypto = require('crypto');
const https = require('https');
const config = require('../config/config');

class GoogleAuthService {
    constructor() {
        this.pendingStates = new Map();
        this.sessions = new Map();
    }

    get enabled() {
        return Boolean(config.GOOGLE.CLIENT_ID && config.GOOGLE.CLIENT_SECRET);
    }

    createAuthorizationUrl() {
        const state = crypto.randomBytes(32).toString('hex');
        this.pendingStates.set(state, Date.now() + 10 * 60 * 1000);
        const query = new URLSearchParams({
            client_id: config.GOOGLE.CLIENT_ID,
            redirect_uri: config.GOOGLE.REDIRECT_URI,
            response_type: 'code',
            scope: 'openid email profile',
            state,
            access_type: 'online',
            prompt: 'select_account'
        });
        return { state, url: `https://accounts.google.com/o/oauth2/v2/auth?${query}` };
    }

    consumeState(state) {
        const expiresAt = this.pendingStates.get(state);
        this.pendingStates.delete(state);
        return Boolean(expiresAt && expiresAt > Date.now());
    }

    async exchangeCode(code) {
        const token = await this.request('POST', 'oauth2.googleapis.com', '/token', new URLSearchParams({
            code,
            client_id: config.GOOGLE.CLIENT_ID,
            client_secret: config.GOOGLE.CLIENT_SECRET,
            redirect_uri: config.GOOGLE.REDIRECT_URI,
            grant_type: 'authorization_code'
        }).toString(), { 'Content-Type': 'application/x-www-form-urlencoded' });

        const profile = await this.request('GET', 'openidconnect.googleapis.com', '/v1/userinfo', null, {
            Authorization: `Bearer ${token.access_token}`
        });
        if (!profile.sub || !profile.email) throw new Error('Google did not return a usable account identity.');
        return { id: profile.sub, email: profile.email, name: profile.name || profile.email, picture: profile.picture || '' };
    }

    createSession(user) {
        const id = crypto.randomBytes(32).toString('base64url');
        this.sessions.set(id, { user, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
        return id;
    }

    getSession(id) {
        const session = this.sessions.get(id);
        if (!session || session.expiresAt < Date.now()) { this.sessions.delete(id); return null; }
        return session.user;
    }

    request(method, hostname, pathname, body, headers = {}) {
        return new Promise((resolve, reject) => {
            const request = https.request({ method, hostname, path: pathname, headers: { ...headers, ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}) } }, response => {
                let data = '';
                response.on('data', chunk => { data += chunk; });
                response.on('end', () => {
                    try {
                        const json = JSON.parse(data || '{}');
                        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(json.error_description || json.error || 'Google authentication failed.'));
                        resolve(json);
                    } catch { reject(new Error('Invalid response from Google.')); }
                });
            });
            request.on('error', reject);
            if (body) request.write(body);
            request.end();
        });
    }
}

module.exports = new GoogleAuthService();
