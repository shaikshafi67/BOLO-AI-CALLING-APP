import type { Call, CallStatus, LanguageCode } from '../types';
import { api } from './api';

/** One row of GET /api/calls (backend/src/models/call.model.ts). */
interface HistoryRow {
  id: string;
  status: 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended';
  startedAt: string;
  endedAt: string | null;
  roomCode: string | null;
  callerLanguage: string | null;
  receiverLanguage: string | null;
  participantId: string;
  participantName: string;
  direction: 'incoming' | 'outgoing';
  translatedLines?: number;
}

function toCall(r: HistoryRow, myLanguage: LanguageCode): Call {
  const outgoing = r.direction === 'outgoing';
  const mine = ((outgoing ? r.callerLanguage : r.receiverLanguage) ?? myLanguage) as LanguageCode;
  const theirs = ((outgoing ? r.receiverLanguage : r.callerLanguage) ?? mine) as LanguageCode;
  const started = new Date(r.startedAt).getTime();
  const ended = r.endedAt ? new Date(r.endedAt).getTime() : started;
  const status: CallStatus = r.status === 'missed' ? 'missed' : r.status === 'rejected' ? 'declined' : r.status === 'ringing' ? 'failed' : 'completed';
  return {
    id: r.id,
    roomCode: r.roomCode ?? '—',
    contact: { id: r.participantId, fullName: r.participantName },
    sourceLanguage: mine,
    targetLanguage: theirs,
    direction: r.direction,
    status,
    startedAt: r.startedAt,
    durationSeconds: Math.max(0, Math.round((ended - started) / 1000)),
    translatedSegments: r.translatedLines ?? 0,
  };
}

/**
 * Call history. Calls are recorded by the backend's call server when both
 * people are in a room, so they appear here for both participants.
 */
export const callService = {
  async getHistory(myLanguage: LanguageCode = 'hi'): Promise<Call[]> {
    const rows = await api<HistoryRow[]>('GET', '/calls');
    return rows.map((r) => toCall(r, myLanguage));
  },
};
