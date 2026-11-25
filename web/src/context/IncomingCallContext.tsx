import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LanguageCode } from '../types';
import { deviceSession } from '../services/deviceSession';
import { CallSession } from '../services/callSession';

/** Someone ringing this user (docs/signaling.md, `call:incoming`). */
export interface IncomingCall {
  roomCode: string;
  callerUid: string;
  callerName: string;
  callerLanguage: LanguageCode;
}

interface IncomingCallContextValue {
  incoming: IncomingCall | null;
  /** Joins the caller's room. Throws CallError if that fails. */
  accept: (language: LanguageCode, translateTo?: LanguageCode) => Promise<string>;
  decline: () => void;
}

const IncomingCallContext = createContext<IncomingCallContextValue | null>(null);

/**
 * Rings when a contact calls, on any screen. Events arrive on the browser's
 * always-on socket (deviceSession), the same as in the Flutter app.
 */
export function IncomingCallProvider({ children }: { children: ReactNode }) {
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);

  useEffect(() => {
    const offIncoming = deviceSession.on('call:incoming', (data) => {
      const d = data as { roomCode?: string; from?: { uid?: string; name?: string }; language?: string };
      // Already in a call here: the server normally prevents this.
      if (!d.roomCode || CallSession.active) return;
      setIncoming({
        roomCode: d.roomCode,
        callerUid: d.from?.uid ?? '',
        callerName: d.from?.name ?? 'Someone',
        callerLanguage: (d.language ?? 'en') as LanguageCode,
      });
    });
    const offCancelled = deviceSession.on('call:cancelled', (data) => {
      const d = data as { roomCode?: string };
      setIncoming((cur) => (cur && cur.roomCode === d.roomCode ? null : cur));
    });
    return () => {
      offIncoming();
      offCancelled();
    };
  }, []);

  const accept = useCallback(
    async (language: LanguageCode, translateTo?: LanguageCode) => {
      const call = incoming;
      if (!call) throw new Error('No incoming call');
      try {
        await CallSession.join(call.roomCode, language, translateTo);
      } finally {
        setIncoming(null);
      }
      return call.roomCode;
    },
    [incoming],
  );

  const decline = useCallback(() => {
    if (incoming) deviceSession.emit('call:decline', { roomCode: incoming.roomCode });
    setIncoming(null);
  }, [incoming]);

  const value = useMemo(() => ({ incoming, accept, decline }), [incoming, accept, decline]);
  return <IncomingCallContext.Provider value={value}>{children}</IncomingCallContext.Provider>;
}

export function useIncomingCall(): IncomingCallContextValue {
  const ctx = useContext(IncomingCallContext);
  if (!ctx) throw new Error('useIncomingCall must be used inside IncomingCallProvider');
  return ctx;
}
