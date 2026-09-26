import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, LogOut, UserRound } from 'lucide-react';
import { Logo, LogoMark } from '../ui/Logo';
import { Avatar } from '../ui/Avatar';
import { primaryNav } from '../navigation/navItems';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/format';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  unreadCount: number;
  /** Drawer variant on mobile always shows labels. */
  variant?: 'rail' | 'drawer';
}

export function Sidebar({ collapsed, onToggleCollapse, onNavigate, unreadCount, variant = 'rail' }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const showLabels = variant === 'drawer' || !collapsed;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
      !showLabels && 'justify-center',
      isActive
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
        : 'text-muted hover:bg-surface-2 hover:text-fg',
    );

  return (
    <aside className="flex h-full flex-col border-r border-line bg-surface">
      <div className={cn('flex h-16 items-center border-b border-line px-4', showLabels ? 'justify-between' : 'justify-center')}>
        {showLabels ? <Logo to="/dashboard" /> : <LogoMark />}
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {primaryNav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass} onClick={onNavigate} title={showLabels ? undefined : label}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-600 dark:bg-brand-400" aria-hidden />}
                <Icon className="size-5 shrink-0" aria-hidden />
                {showLabels ? <span className="flex-1">{label}</span> : <span className="sr-only">{label}</span>}
                {to === '/notifications' && unreadCount > 0 && (
                  <span
                    className={cn(
                      'flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white',
                      !showLabels && 'absolute right-1.5 top-1.5 h-4 min-w-4 px-1 text-[10px]',
                    )}
                    aria-label={`${unreadCount} unread`}
                  >
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-line p-3">
        <NavLink to="/profile" className={linkClass} onClick={onNavigate} title={showLabels ? undefined : 'Profile'}>
          {user ? <Avatar name={user.fullName} size="xs" /> : <UserRound className="size-5" />}
          {showLabels ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-fg">{user?.fullName ?? 'Profile'}</span>
              <span className="block truncate text-xs font-normal text-subtle">{user?.email}</span>
            </span>
          ) : (
            <span className="sr-only">Profile</span>
          )}
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400',
            !showLabels && 'justify-center',
          )}
          title={showLabels ? undefined : 'Logout'}
        >
          <LogOut className="size-5 shrink-0" aria-hidden />
          {showLabels ? 'Logout' : <span className="sr-only">Logout</span>}
        </button>
        {variant === 'rail' && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'hidden w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-subtle hover:bg-surface-2 hover:text-fg md:flex',
              !showLabels && 'justify-center',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {showLabels && 'Collapse'}
          </button>
        )}
      </div>
    </aside>
  );
}
