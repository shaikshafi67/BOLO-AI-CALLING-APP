import { useCallback, useEffect, useRef, useState } from 'react';

export type PreviewStatus = 'off' | 'requesting' | 'live' | 'denied' | 'unsupported';

/**
 * Optional real camera preview via getUserMedia. This is the same API the
 * WebRTC integration will use for the local stream, so it is real, not mocked.
 * Nothing is sent anywhere; the stream stays in the browser.
 */
export function useMediaPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<PreviewStatus>('off');

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus('off');
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      streamRef.current = stream;
      setStatus('live');
    } catch {
      setStatus('denied');
    }
  }, []);

  // Attach the stream once the <video> element is rendered.
  useEffect(() => {
    if (status === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [status]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return { videoRef, status, start, stop };
}
