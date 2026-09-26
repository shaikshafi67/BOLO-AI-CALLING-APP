import type { AppNotification } from '../types';
import { notifications } from '../data/notifications';
import { delay } from './config';

// TODO: Connect backend database
// Plan: GET /api/notifications, PATCH /api/notifications/:id/read,
// plus real-time pushes (incoming calls) over the signaling socket or
// Firebase Cloud Messaging for mobile.

export const notificationService = {
  async list(): Promise<AppNotification[]> {
    await delay(250);
    return notifications;
  },

  async markRead(_id: string): Promise<void> {
    await delay(100);
  },

  async markAllRead(): Promise<void> {
    await delay(150);
  },
};
