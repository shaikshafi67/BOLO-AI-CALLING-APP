export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended';

export interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  status: CallStatus;
  startedAt: Date;
  endedAt: Date | null;
}

export interface CallHistoryEntry extends Call {
  participantName: string;
  direction: 'incoming' | 'outgoing';
}
