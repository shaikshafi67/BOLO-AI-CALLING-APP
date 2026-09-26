import type { ReactNode } from 'react';
import { Tooltip } from '../ui/Tooltip';
import { cn } from '../../utils/format';

interface ControlButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** "off" = user disabled it (red, e.g. mic muted); "active" = feature highlighted (brand). */
  state?: 'on' | 'off' | 'neutral' | 'active';
  variant?: 'default' | 'danger';
  /** Applied to the outer wrapper, e.g. "hidden sm:inline-flex" to hide on phones. */
  className?: string;
  ariaPressed?: boolean;
}

export function ControlButton({ label, icon, onClick, state = 'neutral', variant = 'default', className, ariaPressed }: ControlButtonProps) {
  return (
    <span className={className ?? 'inline-flex'}>
      <Tooltip label={label}>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-pressed={ariaPressed}
          className={cn(
            'flex size-12 items-center justify-center rounded-2xl transition-all duration-200 active:scale-95 sm:size-13',
            variant === 'danger' && 'w-16 bg-red-600 text-white hover:bg-red-700 sm:w-18',
            variant === 'default' && state === 'off' && 'bg-red-500/90 text-white hover:bg-red-500',
            variant === 'default' && state === 'active' && 'bg-brand-500 text-white hover:bg-brand-600',
            variant === 'default' && (state === 'on' || state === 'neutral') && 'bg-white/10 text-white hover:bg-white/20',
          )}
        >
          {icon}
        </button>
      </Tooltip>
    </span>
  );
}
