import { useEffect, useSyncExternalStore } from 'react';
import type { Call, Contact } from '../types';
import { callService } from '../services/callService';
import { userService } from '../services/userService';
import { deviceSession } from '../services/deviceSession';
import { ApiError } from '../services/api';

interface HistoryState {
  calls: Call[];
  contacts: Contact[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

// One shared copy of GET /api/calls for the dashboard, history, contacts and start-call screens.
let state: HistoryState = { calls: [], contacts: [], loading: false, loaded: false, error: null };
const listeners = new Set<() => void>();
/** People found through search, so `?contact=<id>` links can show their name. */
const known = new Map<string, Contact>();

function set(next: Partial<HistoryState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export async function reloadHistory() {
  if (state.loading || !deviceSession.ready) return;
  set({ loading: true });
  try {
    const calls = await callService.getHistory();
    set({ calls, contacts: userService.contactsFromCalls(calls), loading: false, loaded: true, error: null });
  } catch (e) {
    if (e instanceof ApiError && e.notFound) set({ calls: [], contacts: [], loading: false, loaded: true, error: null });
    else set({ loading: false, error: e instanceof ApiError && e.code === 'unreachable' ? 'Can’t reach the BoloAI server.' : 'Couldn’t load your calls.' });
  }
}

/** Reloads once the server has had a moment to record a call that just ended. */
export function reloadHistorySoon() {
  setTimeout(() => void reloadHistory(), 1000);
}

export function rememberPerson(c: Contact) {
  known.set(c.id, c);
}

export function personById(id: string | null | undefined): Contact | undefined {
  if (!id) return undefined;
  return state.contacts.find((c) => c.id === id) ?? known.get(id);
}

deviceSession.onReady(() => void reloadHistory());

export function useHistory(): HistoryState {
  const snapshot = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
  useEffect(() => {
    void reloadHistory();
  }, []);
  return snapshot;
}
