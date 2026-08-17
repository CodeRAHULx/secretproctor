class SessionManager {
    constructor() {
        // Pre-configured authorized interview sessions
        this.sessions = new Map();

        // Default default secure session
        this.createSession({
            sessionId: 'tech-interview-live-892',
            title: 'Senior Software Engineer Technical Interview',
            passcode: 'SECURE2026',
            interviewerKey: 'PROCTOR_KEY_892',
            candidateName: 'John Doe',
            allowedRoles: ['candidate', 'interviewer']
        });
    }

    createSession({ sessionId, title, passcode, interviewerKey, candidateName, allowedRoles }) {
        const session = {
            sessionId: sessionId || `room_${Date.now().toString(36)}`,
            title: title || 'Secure Technical Interview',
            passcode: passcode || 'SECURE2026',
            interviewerKey: interviewerKey || `PROCTOR_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            candidateName: candidateName || 'Candidate',
            allowedRoles: allowedRoles || ['candidate', 'interviewer'],
            createdAt: new Date().toISOString(),
            activeParticipants: []
        };
        this.sessions.set(session.sessionId, session);
        return session;
    }

    verifyAccess(sessionId, passcode, role, participantName) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { authorized: false, error: 'Session not found. Please verify the Room ID.' };
        }

        if (session.passcode !== passcode) {
            return { authorized: false, error: 'Invalid Session Passcode. Access Denied.' };
        }

        if (!session.allowedRoles.includes(role)) {
            return { authorized: false, error: `Role '${role}' is not authorized for this session.` };
        }

        const token = `auth_${role}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        const participant = {
            token,
            name: participantName || (role === 'interviewer' ? 'Technical Interviewer' : 'Candidate'),
            role,
            joinedAt: new Date().toISOString()
        };

        session.activeParticipants.push(participant);

        return {
            authorized: true,
            token,
            sessionId: session.sessionId,
            title: session.title,
            role,
            participantName: participant.name
        };
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
}

module.exports = new SessionManager();
