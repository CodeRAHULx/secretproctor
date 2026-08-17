/**
 * User Model
 * Defines authenticated identities, Google metadata, and roles
 */

class UserModel {
    constructor(data = {}) {
        this.id = data.id || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        this.email = data.email || '';
        this.name = data.name || 'Participant';
        this.picture = data.picture || '';
        this.role = data.role || 'candidate'; // host, interviewer, candidate, proctor, guest
        this.createdAt = data.createdAt || new Date().toISOString();
        this.lastActiveAt = data.lastActiveAt || new Date().toISOString();
    }

    static fromGoogleProfile(profile) {
        return new UserModel({
            id: profile.id || profile.sub,
            email: profile.email,
            name: profile.name || profile.email,
            picture: profile.picture || '',
            role: 'candidate'
        });
    }

    touch() {
        this.lastActiveAt = new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
            picture: this.picture,
            role: this.role,
            createdAt: this.createdAt,
            lastActiveAt: this.lastActiveAt
        };
    }
}

module.exports = UserModel;
