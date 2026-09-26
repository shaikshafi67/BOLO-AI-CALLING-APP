import type { PresenceStatus } from '../../types';
import { cn, initials } from '../../utils/format';

// Deterministic, muted color per name so the same person always gets the same avatar.
const tones = ['bg-brand-600', 'bg-teal-700', 'bg-amber-700', 'bg-rose-700', 'bg-sky-700', 'bg-emerald-700', 'bg-orange-700'];

export function toneFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return tones[hash % tones.length];
}

const sizes = {
  xs: 'size-7 text-[10px]',
  sm: 'size-9 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-16 text-lg',
  xl: 'size-24 text-2xl',
  '2xl': 'size-32 text-4xl',
};

const presenceColors: Record<PresenceStatus, string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
  offline: 'bg-stone-400',
};

interface AvatarProps {
  name: string;
  src?: string;
  size?: keyof typeof sizes;
  status?: PresenceStatus;
  className?: string;
}

export function Avatar({ name, src, size = 'md', status, className }: AvatarProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        <img src={src} alt={name} className={cn('rounded-full object-cover', sizes[size])} />
      ) : (
        <span
          role="img"
          aria-label={name}
          className={cn(
            'inline-flex items-center justify-center rounded-full font-semibold text-white',
            toneFor(name),
            sizes[size],
          )}
        >
          {initials(name)}
        </span>
      )}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-surface',
            presenceColors[status],
            size === 'xl' || size === '2xl' ? 'size-4' : 'size-2.5',
          )}
          aria-label={status}
          role="status"
        />
      )}
    </span>
  );
}
