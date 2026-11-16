import { pool } from '../config/db';
import { CreateNotificationInput, Notification } from '../models/notification.model';

function rowToNotification(row: any): Notification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    message: row.message,
    contactId: row.contact_id ?? null,
    read: row.read,
    createdAt: row.created_at,
  };
}

const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export const notificationService = {
  async create(input: CreateNotificationInput): Promise<Notification> {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, kind, title, message, contact_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [input.userId, input.kind, input.title, input.message, input.contactId ?? null],
    );
    return rowToNotification(result.rows[0]);
  },

  async listForUser(userId: string): Promise<Notification[]> {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );
    return result.rows.map(rowToNotification);
  },

  /// Returns false when [id] isn't one of [userId]'s notifications.
  async markRead(userId: string, id: string): Promise<boolean> {
    if (!isUuid(id)) return false;
    const result = await pool.query(`UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2`, [id, userId]);
    return (result.rowCount ?? 0) > 0;
  },

  async markAllRead(userId: string): Promise<void> {
    await pool.query(`UPDATE notifications SET read = true WHERE user_id = $1 AND NOT read`, [userId]);
  },

  async remove(userId: string, id: string): Promise<boolean> {
    if (!isUuid(id)) return false;
    const result = await pool.query(`DELETE FROM notifications WHERE id = $1 AND user_id = $2`, [id, userId]);
    return (result.rowCount ?? 0) > 0;
  },
};
