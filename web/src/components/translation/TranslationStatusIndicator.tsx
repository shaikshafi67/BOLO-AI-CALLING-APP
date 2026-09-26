import { CheckCircle2, CircleSlash, Loader2, Radio } from 'lucide-react';
import type { TranslationStatus } from '../../types';
import { cn } from '../../utils/format';

const config: Record<TranslationStatus, { label: string; tone: string; onDarkTone: string; icon: typeof Radio }> = {
  idle: { label: 'Listening', tone: 'text-muted', onDarkTone: 'text-stone-400', icon: Radio },
  processing: { label: 'BoloAI is translating…', tone: 'text-brand-600 dark:text-brand-300', onDarkTone: 'text-brand-300', icon: Loader2 },
  completed: { label: 'Translation ready', tone: 'text-emerald-600 dark:text-emerald-400', onDarkTone: 'text-emerald-400', icon: CheckCircle2 },
  unavailable: { label: 'Translation unavailable', tone: 'text-red-600 dark:text-red-400', onDarkTone: 'text-red-400', icon: CircleSlash },
};

interface IndicatorProps {
  status: TranslationStatus;
  /** Use colors tuned for an always-dark surface (the call screen). */
  onDark?: boolean;
  className?: string;
}

export function TranslationStatusIndicator({ status, onDark, className }: IndicatorProps) {
  const { label, tone, onDarkTone, icon: Icon } = config[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', onDark ? onDarkTone : tone, className)} role="status" aria-live="polite">
      <Icon className={cn('size-3.5', status === 'processing' && 'animate-spin')} aria-hidden />
      {label}
    </span>
  );
}

/** Animated audio bars used while someone speaks or the pipeline runs. */
export function VoiceWave({ active = true, className, bars = 5 }: { active?: boolean; className?: string; bars?: number }) {
  return (
    <span className={cn('inline-flex h-4 items-center gap-0.5', className)} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={cn('w-0.5 rounded-full bg-current', active ? 'h-full animate-wave' : 'h-1')}
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </span>
  );
}
