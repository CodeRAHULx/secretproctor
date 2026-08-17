import { useState, useCallback } from 'react';
import { api } from '../services/api';

export function useChat(currentRoomId, tabClientId, identity) {
  const [messages, setMessages] = useState([]);
  const [translating, setTranslating] = useState({});
  const [translatedMap, setTranslatedMap] = useState({});

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setTranslatedMap({});
  }, []);

  const sendChatMessage = useCallback(async (text) => {
    if (!text || !text.trim() || !currentRoomId.current) return;
    try {
      await api.sendChat({
        roomId: currentRoomId.current,
        message: {
          senderId: tabClientId,
          senderName: identity?.name || 'Participant',
          senderPicture: identity?.picture || '',
          text: text.trim()
        }
      });
    } catch {}
  }, [currentRoomId, tabClientId, identity]);

  const toggleTranslateMessage = useCallback(async (msg, targetLanguage) => {
    if (translatedMap[msg.id]) {
      setTranslatedMap((prev) => {
        const copy = { ...prev };
        delete copy[msg.id];
        return copy;
      });
      return;
    }
    setTranslating((prev) => ({ ...prev, [msg.id]: true }));
    try {
      const res = await api.aiTranslate({ text: msg.text, targetLanguage });
      setTranslatedMap((prev) => ({ ...prev, [msg.id]: res.translated || msg.text }));
    } catch {
      setTranslatedMap((prev) => ({ ...prev, [msg.id]: '(Translation failed)' }));
    } finally {
      setTranslating((prev) => {
        const copy = { ...prev };
        delete copy[msg.id];
        return copy;
      });
    }
  }, [translatedMap]);

  return {
    messages,
    translating,
    translatedMap,
    setMessages,
    addMessage,
    clearMessages,
    sendChatMessage,
    toggleTranslateMessage
  };
}
