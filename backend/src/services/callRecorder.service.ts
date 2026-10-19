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
};
