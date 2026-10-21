/// Where the signaling server records calls for call history. Kept as an
/// interface so the signaling tests can run without a database.
export interface CallRecorder {
  /// Both people are in the room. Returns the call's id, or null when it
  /// can't be recorded (e.g. someone has no profile yet).
  started(call: {
    roomCode: string;
    callerUid: string;
    callerLanguage: string;
    receiverUid: string;
    receiverLanguage: string;
  }): Promise<string | null>;
  /// The same two people are back in the room after a dropped connection.
  resumed(callId: string): Promise<void>;
  /// Someone left the room.
  ended(callId: string): Promise<void>;
  /// A ringing invite nobody answered ('missed') or the callee declined ('rejected').
  unanswered?(call: {
    roomCode: string;
    callerUid: string;
    callerLanguage: string;
    receiverUid: string;
    status: 'missed' | 'rejected';
  }): Promise<void>;
}
