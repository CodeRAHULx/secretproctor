class SessionManager {
    constructor() {
        this.sessions = new Map();

        // Default instant demo room
        this.createSession({
            sessionId: 'sec-meet-demo',
            title: 'Technical Interview & Integrity Assessment',
            passcode: '',
            candidateName: 'Candidate',
            allowedRoles: ['candidate', 'interviewer']
        });
    }

    generateMeetingCode() {
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        const randStr = len => Array.from({ length: len }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
        return `${randStr(3)}-${randStr(4)}-${randStr(3)}`;
    }

    normalizeCode(code) {
        if (!code) return '';
        let cleaned = code.trim().toLowerCase();
        
        // If full URL or query string passed
        if (cleaned.includes('http://') || cleaned.includes('https://') || cleaned.includes('?') || cleaned.includes('/')) {
            try {
                const url = new URL(cleaned.startsWith('http') ? cleaned : `http://localhost/${cleaned.replace(/^\?/, '')}`);
                const queryRoom = url.searchParams.get('room') || url.searchParams.get('code') || url.searchParams.get('sessionId');
                if (queryRoom) {
                    return queryRoom.toLowerCase().replace(/[^a-z0-9-]/g, '');
                }
                const pathParts = url.pathname.split('/').filter(Boolean);
                if (pathParts.length > 0) {
                    cleaned = pathParts[pathParts.length - 1];
                }
            } catch {}
        }

        return cleaned.replace(/[^a-z0-9-]/g, '');
    }

    createSession({ sessionId, title, passcode, candidateName, allowedRoles, createdBy }) {
        const cleanId = this.normalizeCode(sessionId) || this.generateMeetingCode();
        const session = {
            sessionId: cleanId,
            title: title || 'Secure Video Meeting',
            passcode: passcode || '',
            candidateName: candidateName || 'Participant',
            allowedRoles: allowedRoles || ['candidate', 'interviewer'],
            createdBy: createdBy || null,
            createdAt: new Date().toISOString(),
            activeParticipants: []
        };
        this.sessions.set(session.sessionId, session);
        return session;
    }

    verifyAccess(sessionId, passcode, role, participantName, user) {
        const cleanId = this.normalizeCode(sessionId);
        if (!cleanId) {
            return { authorized: false, error: 'Please enter a valid meeting code or link.' };
        }

        let session = this.sessions.get(cleanId);
        
        // Auto-provision meeting room if joining any valid code
        if (!session) {
            session = this.createSession({
                sessionId: cleanId,
                title: 'Live Video Meeting',
                passcode: '',
                candidateName: participantName || user?.name || 'Participant',
                createdBy: user || null
            });
        }

        if (session.passcode && session.passcode !== passcode) {
            return { authorized: false, error: 'Invalid meeting passcode.' };
        }

        const effectiveName = participantName || user?.name || (role === 'interviewer' ? 'Interviewer' : 'Participant');
        const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        const participant = {
            token,
            name: effectiveName,
            email: user?.email || '',
            picture: user?.picture || '',
            role: role || 'candidate',
            joinedAt: new Date().toISOString()
        };

        session.activeParticipants.push(participant);

        return {
            authorized: true,
            token,
            sessionId: session.sessionId,
            title: session.title,
            role: participant.role,
            participantName: participant.name,
            participantEmail: participant.email,
            participantPicture: participant.picture
        };
    }

    getSession(sessionId) {
        return this.sessions.get(this.normalizeCode(sessionId));
    }
}

module.exports = new SessionManager();
