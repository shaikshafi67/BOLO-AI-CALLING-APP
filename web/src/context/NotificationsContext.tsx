import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppNotification } from '../types';
import { notificationService } from '../services/notificationService';
import { deviceSession } from '../services/deviceSession';
import { ApiError } from '../services/api';
import { useAuth } from './AuthContext';

interface NotificationsContextValue {
  items: AppNotification[];
  unreadCount: number;
  reload: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/** Saves a change in the background; the screen already shows it. */
function save(request: Promise<unknown>) {
  request.catch((e) => console.warn('[notifications] not saved', e));
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);

  const reload = useCallback(() => {
    notificationService
      .list()
      .then(setItems)
      .catch((e) => {
        if (e instanceof ApiError && e.notFound) setItems([]);
        else console.warn('[notifications] load failed', e);
      });
  }, []);

  // Load once this browser holds the account; the server says when a new one arrives.
  useEffect(() => {
    const offReady = deviceSession.onReady(reload);
    const offChanged = deviceSession.on('notifications:changed', reload);
    if (deviceSession.ready) reload();
    return () => {
      offReady();
      offChanged();
    };
  }, [reload]);

  useEffect(() => {
    if (!isAuthenticated) setItems([]);
  }, [isAuthenticated]);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    save(notificationService.markRead(id));
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    save(notificationService.markAllRead());
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    save(notificationService.remove(id));
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;
  const value = useMemo(() => ({ items, unreadCount, reload, markRead, markAllRead, remove }), [items, unreadCount, reload, markRead, markAllRead, remove]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
