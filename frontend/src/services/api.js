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
