import { ArrowRight, Languages } from 'lucide-react';
import type { LanguageCode } from '../../types';
import { getLanguage, languages } from '../../data/languages';
import { Select, type SelectProps } from '../ui/FormControls';
import { cn } from '../../utils/format';

interface LanguagePairProps {
  from: LanguageCode;
  to: LanguageCode;
  className?: string;
  compact?: boolean;
}

/** "Hindi → English" */
export function LanguagePair({ from, to, className, compact }: LanguagePairProps) {
  const a = getLanguage(from);
  const b = getLanguage(to);
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-sm', className)}>
      <span>{compact ? a.code.toUpperCase() : a.name}</span>
      <ArrowRight className="size-3.5 opacity-60" aria-label="to" />
      <span>{compact ? b.code.toUpperCase() : b.name}</span>
    </span>
  );
}

interface LanguageSelectProps extends Omit<SelectProps, 'value' | 'onChange' | 'children'> {
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
  /** Allow picking planned languages (e.g. as a profile preference). */
  allowPlanned?: boolean;
}

/** Language dropdown. Planned languages are shown but disabled unless allowPlanned. */
export function LanguageSelect({ value, onChange, allowPlanned = false, ...rest }: LanguageSelectProps) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as LanguageCode)} icon={<Languages className="size-4" />} {...rest}>
      {languages.map((l) => (
        <option key={l.code} value={l.code} disabled={!allowPlanned && l.status === 'planned'}>
          {l.name} · {l.nativeName}
          {l.status === 'planned' ? ' (planned)' : ''}
        </option>
      ))}
    </Select>
  );
}
