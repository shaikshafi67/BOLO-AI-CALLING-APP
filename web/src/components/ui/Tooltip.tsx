import type { ReactNode } from 'react';
import { cn } from '../../utils/format';

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

/** CSS-only tooltip shown on hover and keyboard focus. */
export function Tooltip({ label, children, side = 'top', className }: TooltipProps) {
  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 dark:bg-stone-700',
          'group-hover/tip:opacity-100 group-focus-within/tip:opacity-100',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {label}
      </span>
    </span>
  );
}
