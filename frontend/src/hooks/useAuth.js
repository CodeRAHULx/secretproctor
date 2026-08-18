import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { API_BASE_URL } from '../config';

export function useAuth() {
  const [identity, setIdentity] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let active = true;
    api.currentUser()
      .then((data) => {
        if (active) {
          if (data.authenticated && data.user) {
            setIdentity(data.user);
          } else {
            setIdentity(null);
          }
        }
      })
      .catch(() => {
        if (active) setIdentity(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => { active = false; };
  }, []);

  const googleSignIn = () => {
    // Preserve current URL (full origin + pathname + search)
    const returnTo = encodeURIComponent(window.location.href);
    window.location.assign(`${API_BASE_URL}/api/auth/google?returnTo=${returnTo}`);
  };

  const logout = async () => {
    try { await api.logout(); } catch {}
    setIdentity(null);
    window.location.href = '/';
  };

  return {
    identity,
    authLoading,
    authError,
    setAuthError,
    googleSignIn,
    logout
  };
}
