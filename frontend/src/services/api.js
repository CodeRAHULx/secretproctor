const request = async (url, options = {}) => {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
};

export const api = {
  currentUser: () => request('/api/auth/me'),
  googleStatus: () => request('/api/auth/google/status'),
  joinSession: body => request('/api/session/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  saveAudit: body => request('/api/audit/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
};
