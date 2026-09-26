import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/format';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  hover?: boolean;
}

export function Card({ padded = true, hover, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'card',
        padded && 'p-5 sm:p-6',
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}

export function CardHeader({ title, description, action, icon }: CardHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
