import { Bell, History, LayoutDashboard, LogIn, Settings, Users, Video, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/start-call', label: 'Start Call', icon: Video },
  { to: '/join-call', label: 'Join Call', icon: LogIn },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/history', label: 'Call History', icon: History },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/** Mobile bottom bar: the most-used destinations; the rest live in the drawer. */
export const mobileNav: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/start-call', label: 'Call', icon: Video },
  { to: '/history', label: 'History', icon: History },
  { to: '/notifications', label: 'Alerts', icon: Bell },
];
