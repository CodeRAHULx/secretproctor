const request = async (url, options = {}) => {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
};

export const api = {
  currentUser: () => request('/api/auth/me'),
  googleStatus: () => request('/api/auth/google/status'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  createMeeting: (body = {}) => request('/api/session/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }),
  joinMeeting: (body) => request('/api/session/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }),

  // Room Management & WebRTC Signaling
  joinRoom: (body) => request('/api/room/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }),
  admitGuest: (body) => request('/api/room/admit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }),
  sendSignal: (body) => request('/api/room/signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }),
  sendChat: (body) => request('/api/room/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }),
  leaveRoom: (body) => request('/api/room/leave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }),

  // AI Features: Translate & Summarize
  aiTranslate: (body) => request('/api/ai/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }),
  aiMemo: (body) => request('/api/ai/memo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }),

  // Proctoring & Forensics
  saveAudit: (body) => request('/api/audit/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }),
  killThreat: (body) => request('/api/threat/kill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
};
