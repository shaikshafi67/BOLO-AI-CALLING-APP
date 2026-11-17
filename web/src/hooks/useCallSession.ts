import { useSyncExternalStore } from 'react';
import type { CallSession } from '../services/callSession';

const noop = () => () => undefined;

/** Re-renders whenever [session] changes; returns its change counter. */
export function useCallSession(session: CallSession | null): number {
  return useSyncExternalStore(session?.subscribe ?? noop, session?.getVersion ?? (() => 0));
}
