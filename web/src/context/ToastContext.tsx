import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { cn } from '../utils/format';

type ToastTone = 'success' | 'info' | 'warning' | 'error';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-emerald-500' },
  info: { icon: Info, className: 'text-brand-500' },
  warning: { icon: TriangleAlert, className: 'text-amber-500' },
  error: { icon: XCircle, className: 'text-red-500' },
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const notify = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId++;
      setToasts((t) => [...t.slice(-2), { id, tone, message }]);
      setTimeout(() => dismiss(id), 3800);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6"
      >
        {toasts.map((t) => {
          const { icon: Icon, className } = toneStyles[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-sm shadow-lift"
            >
              <Icon className={cn('mt-0.5 size-4 shrink-0', className)} aria-hidden />
              <p className="flex-1 text-fg">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded-md p-0.5 text-subtle hover:text-fg"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
