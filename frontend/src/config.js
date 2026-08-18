// Application Configuration
// VITE_API_URL should be set to your deployed backend URL on Railway (e.g., https://your-backend.railway.app)
// If empty, it defaults to relative path (for local proxy or same-domain deployment)
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
