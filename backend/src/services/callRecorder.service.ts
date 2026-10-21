import { pool } from '../config/db';
import { CallRecorder } from '../websocket/callRecorder';
import { callService } from './call.service';
import { userService } from './user.service';

/// Records calls in PostgreSQL so they show up in both people's history.
export const pgCallRecorder: CallRecorder = {
  async started(call) {
    const [caller, receiver] = await Promise.all([
      userService.getByFirebaseUid(call.callerUid),
      userService.getByFirebaseUid(call.receiverUid),
    ]);
    if (!caller || !receiver || caller.id === receiver.id) return null;
    const created = await callService.createFromRoom({
      callerId: caller.id,
      receiverId: receiver.id,
      roomCode: call.roomCode,
      callerLanguage: call.callerLanguage,
      receiverLanguage: call.receiverLanguage,
    });
    return created.id;
  },
  async resumed(callId) {
    await callService.reopen(callId);
  },
  async ended(callId) {
    await callService.updateStatus(callId, 'ended');
  },
  async translation(callId, line) {
    await pool.query(
      `INSERT INTO translations (call_id, source_language, target_language, source_text, translated_text)
       VALUES ($1, $2, $3, $4, $5)`,
      [callId, line.sourceLanguage, line.targetLanguage, line.sourceText, line.translatedText],
    );
  },
  async unanswered(call) {
    const [caller, receiver] = await Promise.all([
      userService.getByFirebaseUid(call.callerUid),
      userService.getByFirebaseUid(call.receiverUid),
    ]);
    if (!caller || !receiver || caller.id === receiver.id) return;
    const created = await callService.createFromRoom({
      callerId: caller.id,
      receiverId: receiver.id,
      roomCode: call.roomCode,
      callerLanguage: call.callerLanguage,
      receiverLanguage: receiver.preferredLanguage,
      status: call.status,
    });
    await callService.updateStatus(created.id, call.status);
  },
};
