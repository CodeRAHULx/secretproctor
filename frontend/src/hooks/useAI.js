import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export const SUPPORTED_LANGUAGES = [
  'English', 'Hindi', 'Spanish', 'French', 'German', 'Arabic',
  'Portuguese', 'Russian', 'Japanese', 'Korean', 'Chinese', 'Italian',
  'Turkish', 'Dutch', 'Polish', 'Bengali', 'Urdu', 'Punjabi'
];

export function useAI(sessionId) {
  const [myLanguage, setMyLanguage] = useState('English');
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [aiMemo, setAiMemo] = useState(null);
  const [memoLoading, setMemoLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);

  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((d) => setAiConfigured(Boolean(d.configured)))
      .catch(() => setAiConfigured(false));
  }, []);

  const generateMemo = useCallback(async (customMessages = null) => {
    if (!sessionId) return;
    setMemoLoading(true);
    setAiMemo(null);
    try {
      const res = await api.aiMemo({ roomId: sessionId, messages: customMessages });
      setAiMemo(res);
    } catch (err) {
      setAiMemo({ error: err.message });
    } finally {
      setMemoLoading(false);
    }
  }, [sessionId]);

  return {
    myLanguage,
    setMyLanguage,
    translateEnabled,
    setTranslateEnabled,
    aiMemo,
    setAiMemo,
    memoLoading,
    aiConfigured,
    generateMemo
  };
}
