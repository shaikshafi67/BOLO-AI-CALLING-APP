import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { ButtonLink } from '../ui/Button';
import { ThemeToggleButton } from '../layout/ThemeToggleButton';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/format';

const links = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#languages', label: 'Languages' },
  { href: '#about', label: 'About' },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled || open ? 'border-b border-line bg-surface/85 backdrop-blur-xl' : 'bg-transparent',
      )}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggleButton />
          {isAuthenticated ? (
            <ButtonLink to="/dashboard" size="sm">
              Open Dashboard
            </ButtonLink>
          ) : (
            <>
              <ButtonLink to="/login" variant="ghost" size="sm">
                Login
              </ButtonLink>
              <ButtonLink to="/register" size="sm">
                Get Started
              </ButtonLink>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggleButton />
          <button
            type="button"
            className="rounded-lg p-2 text-fg"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="animate-fade-in border-t border-line px-4 pb-6 pt-2 md:hidden">
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-base font-medium text-fg hover:bg-surface-2">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {isAuthenticated ? (
              <ButtonLink to="/dashboard" className="col-span-2">
                Open Dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/login" variant="outline">
                  Login
                </ButtonLink>
                <ButtonLink to="/register">Get Started</ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
