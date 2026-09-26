import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileBottomNav } from './MobileNav';
import { useNotifications } from '../../context/NotificationsContext';
import { cn } from '../../utils/format';

const COLLAPSE_KEY = 'boloai-sidebar-collapsed';

function initialCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(COLLAPSE_KEY);
    if (saved !== null) return saved === 'true';
  } catch {
    /* ignore */
  }
  // Tablets start with the icon rail; desktops with the full sidebar.
  return window.innerWidth < 1024;
}

/** Shell for signed-in pages: sidebar (desktop/tablet), drawer + bottom nav (mobile). */
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const location = useLocation();

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, String(!c));
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg">
        Skip to content
      </a>

      {/* Tablet/desktop rail */}
      <div className={cn('fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-300 md:block', collapsed ? 'w-20' : 'w-64')}>
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} unreadCount={unreadCount} />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 animate-fade-in bg-stone-950/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="relative h-full w-72 max-w-[85vw] animate-[slide-in-left_0.25s_ease-out]">
            <Sidebar collapsed={false} variant="drawer" onNavigate={() => setDrawerOpen(false)} unreadCount={unreadCount} />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <div className={cn('transition-[padding] duration-300', collapsed ? 'md:pl-20' : 'md:pl-64')}>
        <Topbar onOpenMenu={() => setDrawerOpen(true)} unreadCount={unreadCount} />
        <main id="main" className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 md:pb-10 lg:px-8 lg:pt-8">
          <div key={location.pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileBottomNav unreadCount={unreadCount} />
    </div>
  );
}
