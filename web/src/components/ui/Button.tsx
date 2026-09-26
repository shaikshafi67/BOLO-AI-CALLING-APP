import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success' | 'inverse' | 'onBrand' | 'dangerGhost';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 select-none ' +
  'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/30 dark:bg-brand-500 dark:hover:bg-brand-600',
  secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25',
  outline: 'border border-line bg-surface text-fg hover:bg-surface-2 hover:border-brand-300 dark:hover:border-brand-500/50',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-red-600 text-white shadow-sm shadow-red-600/25 hover:bg-red-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  /** White button for use on gradient/brand backgrounds (same in both themes). */
  inverse: 'bg-white text-brand-700 shadow-sm hover:bg-brand-50',
  /** Transparent button for use on gradient/brand backgrounds. */
  onBrand: 'text-white hover:bg-white/15',
  dangerGhost: 'text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, CommonProps {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', leftIcon, rightIcon, fullWidth, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth,
  className,
  children,
  ...rest
}: LinkProps & CommonProps) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)} {...rest}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}
