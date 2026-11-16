export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended';

export interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  status: CallStatus;
  startedAt: Date;
  endedAt: Date | null;
  roomCode: string | null;
  callerLanguage: string | null;
  receiverLanguage: string | null;
}

export interface CallHistoryEntry extends Call {
  participantId: string;
  participantName: string;
  direction: 'incoming' | 'outgoing';
  /// Translated sentences in the call and their average delays (null when none).
  translatedLines: number;
  avgTranslateMs: number | null;
  avgVoiceMs: number | null;
}
