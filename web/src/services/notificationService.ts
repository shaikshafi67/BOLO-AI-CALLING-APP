import type { AppNotification } from '../types';
import { api } from './api';

interface NotificationRow {
  id: string;
  kind: 'missed_call' | 'system';
  title: string;
  message: string;
  contactId: string | null;
  read: boolean;
  createdAt: string;
}

/** Notifications kept on the server (GET /api/notifications), e.g. missed calls. */
export const notificationService = {
  async list(): Promise<AppNotification[]> {
    const rows = await api<NotificationRow[]>('GET', '/notifications');
    return rows.map((r) => ({
      id: r.id,
      type: r.kind === 'missed_call' ? 'missed_call' : 'system',
      title: r.title,
      message: r.message,
      createdAt: r.createdAt,
      read: r.read,
      contactId: r.contactId ?? undefined,
    }));
  },

  markRead: (id: string) => api('PATCH', `/notifications/${id}/read`, {}),
  markAllRead: () => api('POST', '/notifications/read-all', {}),
  remove: (id: string) => api('DELETE', `/notifications/${id}`),
};
