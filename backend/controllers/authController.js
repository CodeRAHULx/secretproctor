const googleAuthService = require('../services/googleAuthService');

const parseCookies = header => Object.fromEntries((header || '').split(';').filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
}));

class AuthController {
    status(_req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ enabled: googleAuthService.enabled }));
    }

    startGoogle(_req, res) {
        if (!googleAuthService.enabled) return this.redirect(res, '/?auth=not-configured');
        const { state, url } = googleAuthService.createAuthorizationUrl();
        res.writeHead(302, { Location: url, 'Set-Cookie': `securemeet_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600` });
        res.end();
    }

    async googleCallback(req, res) {
        const url = new URL(req.url, 'http://localhost');
        const state = url.searchParams.get('state');
        const code = url.searchParams.get('code');
        const cookies = parseCookies(req.headers.cookie);
        if (!code || !state || cookies.securemeet_oauth_state !== state || !googleAuthService.consumeState(state)) return this.redirect(res, '/?auth=failed');
        try {
            const user = await googleAuthService.exchangeCode(code);
            const sessionId = googleAuthService.createSession(user);
            res.writeHead(302, { Location: '/?auth=google', 'Set-Cookie': `securemeet_auth=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` });
            res.end();
        } catch (_error) { this.redirect(res, '/?auth=failed'); }
    }

    me(req, res) {
        const user = googleAuthService.getSession(parseCookies(req.headers.cookie).securemeet_auth);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ authenticated: Boolean(user), user: user || undefined }));
    }

    redirect(res, location) { res.writeHead(302, { Location: location }); res.end(); }
}
module.exports = new AuthController();
