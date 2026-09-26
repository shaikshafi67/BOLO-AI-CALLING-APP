import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, PhoneIncoming, PhoneMissed, PhoneOff, Megaphone, Trash2, UserPlus, Video, X } from 'lucide-react';
import { PageHeader, EmptyState, Segmented } from '../components/ui/Misc';
import { Button } from '../components/ui/Button';
import { Tooltip } from '../components/ui/Tooltip';
import { useNotifications } from '../context/NotificationsContext';
import { useToast } from '../context/ToastContext';
import type { AppNotification, NotificationType } from '../types';
import { cn, formatRelative } from '../utils/format';

const typeStyle: Record<NotificationType, { icon: typeof Bell; className: string }> = {
  incoming_call: { icon: PhoneIncoming, className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  call_ended: { icon: PhoneOff, className: 'bg-stone-100 text-stone-600 dark:bg-stone-500/15 dark:text-stone-300' },
  missed_call: { icon: PhoneMissed, className: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
  system: { icon: Megaphone, className: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' },
  contact_request: { icon: UserPlus, className: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' },
};

type Filter = 'all' | 'unread';

export default function NotificationsPage() {
  const { items, unreadCount, markRead, markAllRead, remove } = useNotifications();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');

  const visible = filter === 'unread' ? items.filter((n) => !n.read) : items;

  const actions = (n: AppNotification) => {
    if (n.type === 'incoming_call') {
      return (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="success"
            leftIcon={<Video className="size-3.5" />}
            onClick={() => {
              markRead(n.id);
              navigate('/call/BOLO-4829', { state: { contactId: 'c_01' } });
            }}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<X className="size-3.5" />}
            onClick={() => {
              remove(n.id);
              notify('Call declined.', 'info');
            }}
          >
            Decline
          </Button>
        </div>
      );
    }
    if (n.type === 'contact_request') {
      return (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              remove(n.id);
              notify(`${n.actorName ?? 'Contact'} added to your contacts.`, 'success');
            }}
          >
            Accept
          </Button>
          <Button size="sm" variant="ghost" onClick={() => remove(n.id)}>
            Ignore
          </Button>
        </div>
      );
    }
    if (n.type === 'missed_call') {
      return (
        <div className="mt-3">
          <Button size="sm" variant="secondary" leftIcon={<Video className="size-3.5" />} onClick={() => navigate('/start-call?contact=c_04')}>
            Call back
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description={unreadCount ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.` : 'You’re all caught up.'}
        actions={
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={!unreadCount} leftIcon={<CheckCheck className="size-4" />}>
            Mark all as read
          </Button>
        }
      />

      <div className="mb-4">
        <Segmented<Filter>
          ariaLabel="Filter notifications"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `All (${items.length})` },
            { value: 'unread', label: `Unread (${unreadCount})` },
          ]}
        />
      </div>

      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState icon={<BellOff className="size-6" />} title="No notifications" description={filter === 'unread' ? 'You’ve read everything.' : 'New activity will show up here.'} />
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((n) => {
              const { icon: Icon, className } = typeStyle[n.type];
              return (
                <li
                  key={n.id}
                  className={cn('group relative flex gap-4 p-4 transition-colors sm:p-5', !n.read && 'bg-brand-50/50 dark:bg-brand-500/5')}
                  onClick={() => !n.read && markRead(n.id)}
                >
                  {!n.read && <span className="absolute left-1.5 top-1/2 size-2 -translate-y-1/2 rounded-full bg-brand-600" aria-label="Unread" />}
                  <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', className)}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className={cn('text-sm', n.read ? 'text-muted' : 'font-semibold text-fg')}>{n.title}</p>
                      <span className="shrink-0 text-xs text-subtle">{formatRelative(n.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{n.message}</p>
                    {actions(n)}
                  </div>
                  <Tooltip label="Remove">
                    <button
                      type="button"
                      onClick={() => remove(n.id)}
                      className="self-start rounded-lg p-1.5 text-subtle opacity-100 transition-opacity hover:bg-surface-2 hover:text-fg sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                      aria-label={`Remove notification: ${n.title}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
