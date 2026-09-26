import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Tooltip } from '../ui/Tooltip';
import { useAuth } from '../../context/AuthContext';
import { LogoMark } from '../ui/Logo';
import { ThemeToggleButton } from './ThemeToggleButton';

interface TopbarProps {
  onOpenMenu: () => void;
  unreadCount: number;
}

export function Topbar({ onOpenMenu, unreadCount }: TopbarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // Search routes to Contacts with the query; a global search API can replace this later.
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/contacts${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur-lg sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        className="-ml-1 rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg md:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>
      <Link to="/dashboard" className="md:hidden" aria-label="BoloAI dashboard">
        <LogoMark className="size-8" />
      </Link>

      <form onSubmit={onSearch} className="relative hidden max-w-md flex-1 sm:block" role="search">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts…"
          aria-label="Search contacts"
          className="h-10 w-full rounded-xl border border-line bg-surface-2 pl-10 pr-4 text-sm text-fg placeholder:text-subtle focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        />
      </form>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <ThemeToggleButton />
        <Tooltip label="Notifications" side="bottom">
          <Link
            to="/notifications"
            className="relative rounded-xl p-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-2 flex size-2.5 rounded-full bg-red-500 ring-2 ring-surface" aria-hidden />
            )}
          </Link>
        </Tooltip>
        <Link to="/profile" className="ml-1 flex items-center gap-2.5 rounded-xl p-1 pr-1 hover:bg-surface-2 sm:pr-3" aria-label="Your profile">
          {user && <Avatar name={user.fullName} size="sm" status="online" />}
          <span className="hidden text-sm font-medium text-fg lg:block">{user?.fullName}</span>
        </Link>
      </div>
    </header>
  );
}
