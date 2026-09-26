import { Link } from 'react-router-dom';
import { cn } from '../../utils/format';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-9 shrink-0', className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill="#1f3595" />
      {/* Speech bubble with a sound wave: "bolo" means "speak" in Hindi. */}
      <path d="M10 14a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-6l-5.5 4.5V26H14a4 4 0 0 1-4-4z" fill="#faf7f2" />
      <g stroke="#e8950f" strokeWidth="2" strokeLinecap="round">
        <path d="M15.5 16.5v2" />
        <path d="M19 14.5v6" />
        <path d="M22.5 15.5v4" />
        <path d="M26 17v1" />
      </g>
    </svg>
  );
}

interface LogoProps {
  to?: string;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export function Logo({ to = '/', className, showText = true, textClassName }: LogoProps) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5 rounded-lg', className)} aria-label="BoloAI home">
      <LogoMark />
      {showText && <span className={cn('text-xl font-bold tracking-tight text-fg', textClassName)}>BoloAI</span>}
    </Link>
  );
}
