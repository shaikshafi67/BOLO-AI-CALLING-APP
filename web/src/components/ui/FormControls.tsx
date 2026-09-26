import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/format';

const fieldBase =
  'w-full rounded-xl border bg-surface text-sm text-fg placeholder:text-subtle transition-colors ' +
  'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:opacity-60';

interface FieldWrapperProps {
  id: string;
  label?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  labelAction?: ReactNode;
}

function FieldWrapper({ id, label, hint, error, children, labelAction }: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      {(label || labelAction) && (
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={id} className="text-sm font-medium text-fg">
              {label}
            </label>
          )}
          {labelAction}
        </div>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : (
        hint && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: ReactNode;
  error?: string;
  icon?: ReactNode;
  labelAction?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, labelAction, className, id, type, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';

  return (
    <FieldWrapper id={inputId} label={label} hint={hint} error={error} labelAction={labelAction}>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle">{icon}</span>}
        <input
          ref={ref}
          id={inputId}
          type={isPassword && reveal ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            fieldBase,
            'h-11 px-3.5',
            !!icon && 'pl-10',
            isPassword && 'pr-11',
            error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : 'border-line',
            className,
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-subtle hover:text-fg"
            aria-label={reveal ? 'Hide password' : 'Show password'}
          >
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
    </FieldWrapper>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: ReactNode;
  error?: string;
  icon?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, icon, className, id, children, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <FieldWrapper id={selectId} label={label} hint={hint} error={error}>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle">{icon}</span>}
        <select
          ref={ref}
          id={selectId}
          className={cn(fieldBase, 'h-11 appearance-none pl-3.5 pr-10', !!icon && 'pl-10', error ? 'border-red-400' : 'border-line', className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
      </div>
    </FieldWrapper>
  );
});

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  badge?: ReactNode;
}

/** Accessible switch with a label row. */
export function Toggle({ checked, onChange, label, description, icon, disabled, badge }: ToggleProps) {
  const id = useId();
  return (
    <div className={cn('flex items-center justify-between gap-4 py-3', disabled && 'opacity-60')}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="mt-0.5 text-muted">{icon}</span>}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={id} className="text-sm font-medium text-fg">
              {label}
            </label>
            {badge}
          </div>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200',
          checked ? 'bg-brand-600 dark:bg-brand-500' : 'bg-stone-300 dark:bg-stone-600',
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
}

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-muted', className)}>
      <input type="checkbox" className="size-4 rounded border-line accent-brand-600" {...rest} />
      {label}
    </label>
  );
}
