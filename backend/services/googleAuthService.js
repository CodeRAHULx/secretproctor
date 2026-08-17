const crypto = require('crypto');
const https = require('https');
const config = require('../config/config');

const SECRET_KEY = config.GOOGLE.CLIENT_SECRET || process.env.SESSION_SECRET || 'securemeet-super-secret-hmac-key-2026';

class GoogleAuthService {
    get enabled() {
        return Boolean(config.GOOGLE.CLIENT_ID && config.GOOGLE.CLIENT_SECRET);
    }

    getRedirectUri(req) {
        if (process.env.GOOGLE_REDIRECT_URI) {
            return process.env.GOOGLE_REDIRECT_URI;
        }
        if (req && req.headers) {
            const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
            const proto = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
            return `${proto}://${host}/api/auth/google/callback`;
        }
        return config.GOOGLE.REDIRECT_URI;
    }

    signPayload(data) {
        const json = Buffer.from(JSON.stringify(data)).toString('base64url');
        const signature = crypto.createHmac('sha256', SECRET_KEY).update(json).digest('base64url');
        return `${json}.${signature}`;
    }

    verifyPayload(token) {
        if (!token || typeof token !== 'string') return null;
        const parts = token.split('.');
        if (parts.length !== 2) return null;
        const [json, signature] = parts;
        const expected = crypto.createHmac('sha256', SECRET_KEY).update(json).digest('base64url');
        if (signature !== expected) return null;
        try {
            const data = JSON.parse(Buffer.from(json, 'base64url').toString('utf8'));
            if (data.exp && data.exp < Date.now()) return null;
            return data;
        } catch {
            return null;
        }
    }

    createAuthorizationUrl(req) {
        const redirectUri = this.getRedirectUri(req);
        // Stateless state token valid for 15 minutes
        const state = this.signPayload({
            nonce: crypto.randomBytes(16).toString('hex'),
            redirectUri,
            exp: Date.now() + 15 * 60 * 1000
        });

        const query = new URLSearchParams({
            client_id: config.GOOGLE.CLIENT_ID,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            state,
            access_type: 'online',
            prompt: 'select_account'
        });
        return { state, url: `https://accounts.google.com/o/oauth2/v2/auth?${query}` };
    }

    verifyState(state) {
        const data = this.verifyPayload(state);
        return Boolean(data && data.nonce);
    }

    async exchangeCode(code, req, state) {
        const stateData = this.verifyPayload(state);
        const redirectUri = stateData?.redirectUri || this.getRedirectUri(req);

        const token = await this.request('POST', 'oauth2.googleapis.com', '/token', new URLSearchParams({
            code,
            client_id: config.GOOGLE.CLIENT_ID,
            client_secret: config.GOOGLE.CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        }).toString(), { 'Content-Type': 'application/x-www-form-urlencoded' });

        const profile = await this.request('GET', 'openidconnect.googleapis.com', '/v1/userinfo', null, {
            Authorization: `Bearer ${token.access_token}`
        });
        if (!profile.sub || !profile.email) throw new Error('Google did not return a usable account identity.');
        return { id: profile.sub, email: profile.email, name: profile.name || profile.email, picture: profile.picture || '' };
    }

    createSession(user) {
        // Stateless session cookie valid for 7 days
        return this.signPayload({
            user,
            exp: Date.now() + 7 * 24 * 60 * 60 * 1000
        });
    }

    getSession(token) {
        const data = this.verifyPayload(token);
        return data ? data.user : null;
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
