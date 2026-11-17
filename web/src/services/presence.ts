import { useEffect, useState } from 'react';
import type { PresenceStatus } from '../types';
import { deviceSession } from './deviceSession';

type Statuses = Record<string, PresenceStatus>;

/**
 * Who is online right now (docs/signaling.md, `presence:watch`): online,
 * busy (in a call) or offline. Re-watches after every reconnect, since the
 * server forgets what a socket watched.
 */
export function usePresence(userIds: string[]): Statuses {
  const [statuses, setStatuses] = useState<Statuses>({});
  const key = [...new Set(userIds.filter(Boolean))].sort().join(',');

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) return;
    let active = true;

    const watch = async () => {
      const reply = await deviceSession.request<{ ok?: boolean; statuses?: Statuses }>('presence:watch', { userIds: ids });
      if (active && reply?.ok && reply.statuses) setStatuses(reply.statuses);
    };
    const offUpdate = deviceSession.on('presence:update', (data) => {
      const d = data as { userId?: string; status?: PresenceStatus };
      if (active && d.userId && ids.includes(d.userId) && d.status) setStatuses((prev) => ({ ...prev, [d.userId!]: d.status! }));
    });
    const offReady = deviceSession.onReady(() => void watch());
    if (deviceSession.ready) void watch();
    return () => {
      active = false;
      offUpdate();
      offReady();
    };
  }, [key]);

  return statuses;
}

/** "Show when I'm online" switched in Settings. */
export function setPresenceVisible(visible: boolean) {
  deviceSession.emit('presence:visibility', { visible });
}
