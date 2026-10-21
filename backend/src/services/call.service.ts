import { pool } from '../config/db';
import { Call, CallHistoryEntry, CallStatus } from '../models/call.model';

function rowToCall(row: any): Call {
  return {
    id: row.id,
    callerId: row.caller_id,
    receiverId: row.receiver_id,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    roomCode: row.room_code ?? null,
    callerLanguage: row.caller_language ?? null,
    receiverLanguage: row.receiver_language ?? null,
  };
}

export const callService = {
  async create(callerId: string, receiverId: string): Promise<Call> {
    const result = await pool.query(
      `INSERT INTO calls (caller_id, receiver_id, status) VALUES ($1, $2, 'ringing') RETURNING *`,
      [callerId, receiverId],
    );
    return rowToCall(result.rows[0]);
  },

  /// A call that connected in a signaling room (both people joined).
  async createFromRoom(input: {
    callerId: string;
    receiverId: string;
    roomCode: string;
    callerLanguage: string;
    receiverLanguage: string;
    status?: CallStatus;
  }): Promise<Call> {
    const result = await pool.query(
      `INSERT INTO calls (caller_id, receiver_id, status, room_code, caller_language, receiver_language)
       VALUES ($1, $2, $6, $3, $4, $5) RETURNING *`,
      [input.callerId, input.receiverId, input.roomCode, input.callerLanguage, input.receiverLanguage, input.status ?? 'accepted'],
    );
    return rowToCall(result.rows[0]);
  },

  /// Continues a call after a dropped connection instead of starting a new one.
  async reopen(callId: string): Promise<void> {
    await pool.query(`UPDATE calls SET status = 'accepted', ended_at = NULL WHERE id = $1`, [callId]);
  },

  async getById(callId: string): Promise<Call | null> {
    const result = await pool.query('SELECT * FROM calls WHERE id = $1', [callId]);
    return result.rows[0] ? rowToCall(result.rows[0]) : null;
  },

  async updateStatus(callId: string, status: CallStatus): Promise<Call | null> {
    const endsCall = status === 'ended' || status === 'rejected' || status === 'missed';
    const result = await pool.query(
      `UPDATE calls
       SET status = $2, ended_at = CASE WHEN $3 THEN now() ELSE ended_at END
       WHERE id = $1
       RETURNING *`,
      [callId, status, endsCall],
    );
    return result.rows[0] ? rowToCall(result.rows[0]) : null;
  },

  async historyForUser(userId: string): Promise<CallHistoryEntry[]> {
    const result = await pool.query(
      `SELECT
         c.*,
         CASE WHEN c.caller_id = $1 THEN receiver.id ELSE caller.id END AS participant_id,
         CASE WHEN c.caller_id = $1 THEN receiver.name ELSE caller.name END AS participant_name,
         CASE WHEN c.caller_id = $1 THEN 'outgoing' ELSE 'incoming' END AS direction
       FROM calls c
       JOIN users caller ON caller.id = c.caller_id
       JOIN users receiver ON receiver.id = c.receiver_id
       WHERE c.caller_id = $1 OR c.receiver_id = $1
       ORDER BY c.started_at DESC
       LIMIT 50`,
      [userId],
    );
    return result.rows.map((row: any) => ({
      ...rowToCall(row),
      participantId: row.participant_id,
      participantName: row.participant_name,
      direction: row.direction,
    }));
  },
};
