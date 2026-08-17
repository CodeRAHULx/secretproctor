const googleAuthService = require('../services/googleAuthService');

const parseCookies = header => Object.fromEntries((header || '').split(';').filter(Boolean).map(part => {
    const index = part.indexOf('=');
    if (index === -1) return [part.trim(), ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
}));

class AuthController {
    status(_req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ enabled: googleAuthService.enabled }));
    }

    startGoogle(req, res) {
        if (!googleAuthService.enabled) return this.redirect(res, '/?auth=not-configured');
        const { state, url } = googleAuthService.createAuthorizationUrl(req);
        res.writeHead(302, {
            Location: url,
            'Set-Cookie': `securemeet_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=900`
        });
        res.end();
    }

    async googleCallback(req, res) {
        const url = new URL(req.url, 'http://localhost');
        const state = url.searchParams.get('state');
        const code = url.searchParams.get('code');
        const cookies = parseCookies(req.headers.cookie);

        if (!code || !state || cookies.securemeet_oauth_state !== state || !googleAuthService.verifyState(state)) {
            return this.redirect(res, '/?auth=failed');
        }

        try {
            const user = await googleAuthService.exchangeCode(code, req, state);
            const sessionToken = googleAuthService.createSession(user);
            res.writeHead(302, {
                Location: '/?auth=success',
                'Set-Cookie': [
                    `securemeet_auth=${sessionToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`,
                    `securemeet_oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
                ]
            });
            res.end();
        } catch (_error) {
            this.redirect(res, '/?auth=failed');
        }
    }

    me(req, res) {
        const cookies = parseCookies(req.headers.cookie);
        const user = googleAuthService.getSession(cookies.securemeet_auth);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ authenticated: Boolean(user), user: user || null }));
    }

    logout(_req, res) {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': 'securemeet_auth=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
        });
        res.end(JSON.stringify({ success: true, message: 'Logged out successfully' }));
    }

    redirect(res, location) {
        res.writeHead(302, { Location: location });
        res.end();
    }
}

module.exports = new AuthController();
