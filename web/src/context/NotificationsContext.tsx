import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AppNotification } from '../types';
import { notifications as seed } from '../data/notifications';
import { notificationService } from '../services/notificationService';

interface NotificationsContextValue {
  items: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  // Seeded synchronously from mock data; swap for notificationService.list() once the API exists.
  const [items, setItems] = useState<AppNotification[]>(seed);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    void notificationService.markRead(id);
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    void notificationService.markAllRead();
  }, []);

  const remove = useCallback((id: string) => setItems((prev) => prev.filter((n) => n.id !== id)), []);

  const unreadCount = items.filter((n) => !n.read).length;
  const value = useMemo(() => ({ items, unreadCount, markRead, markAllRead, remove }), [items, unreadCount, markRead, markAllRead, remove]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
