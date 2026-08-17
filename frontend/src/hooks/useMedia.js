import { useState, useRef, useCallback } from 'react';

export function useMedia(onLog = () => {}) {
  const [media, setMedia] = useState({ mic: true, cam: true, share: false });
  const [stream, setStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const startMedia = useCallback(async () => {
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = userStream;
      setStream(userStream);
      return userStream;
    } catch {
      onLog('Camera or microphone permission not granted.', 'warn');
      return null;
    }
  }, [onLog]);

  const stopMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setStream(null);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
    }
    setMedia({ mic: true, cam: true, share: false });
  }, []);

  const toggleMedia = useCallback((kind) => {
    if (!localStreamRef.current) return;
    const active = !media[kind];
    setMedia((old) => ({ ...old, [kind]: active }));
    (kind === 'mic' ? localStreamRef.current.getAudioTracks() : localStreamRef.current.getVideoTracks()).forEach((t) => {
      t.enabled = active;
    });
  }, [media]);

  const toggleShare = useCallback(async () => {
    if (media.share) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setScreenStream(null);
      setMedia((old) => ({ ...old, share: false }));
      return;
    }
    try {
      const share = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = share;
      setScreenStream(share);
      share.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        setMedia((old) => ({ ...old, share: false }));
        onLog('Screen sharing ended.', 'info');
      };
      setMedia((old) => ({ ...old, share: true }));
      onLog('Screen sharing started.', 'info');
    } catch {
      onLog('Screen sharing cancelled or denied.', 'warn');
    }
  }, [media.share, onLog]);

  return {
    media,
    stream,
    screenStream,
    localStreamRef,
    startMedia,
    stopMedia,
    toggleMedia,
    toggleShare
  };
}
