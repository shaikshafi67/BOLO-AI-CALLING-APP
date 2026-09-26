import { NavLink } from 'react-router-dom';
import { mobileNav } from '../navigation/navItems';
import { cn } from '../../utils/format';

export function MobileBottomNav({ unreadCount }: { unreadCount: number }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
    >
      <ul className="grid grid-cols-5">
        {mobileNav.map(({ to, label, icon: Icon }) => {
          const isCall = to === '/start-call';
          return (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors',
                    isActive ? 'text-brand-600 dark:text-brand-300' : 'text-subtle',
                  )
                }
              >
                {isCall ? (
                  <span className="-mt-5 flex size-12 items-center justify-center rounded-2xl gradient-brand text-white shadow-lg shadow-brand-600/30">
                    <Icon className="size-5" aria-hidden />
                  </span>
                ) : (
                  <span className="relative">
                    <Icon className="size-5" aria-hidden />
                    {to === '/notifications' && unreadCount > 0 && (
                      <span className="absolute -right-1.5 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </span>
                )}
                {label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
