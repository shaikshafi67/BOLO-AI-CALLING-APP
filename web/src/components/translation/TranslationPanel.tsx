import { useEffect, useRef } from 'react';
import { Info, Languages, X } from 'lucide-react';
import type { LanguageCode, Translation, TranslationStatus } from '../../types';
import { getLanguage } from '../../data/languages';
import { Avatar } from '../ui/Avatar';
import { LanguagePair } from './LanguageBits';
import { TranslationStatusIndicator, VoiceWave } from './TranslationStatusIndicator';
import { cn, formatTime } from '../../utils/format';

interface TranslationPanelProps {
  entries: Translation[];
  status: TranslationStatus;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  /** Most recent utterance for the "now translating" card. */
  current?: Translation;
  onClose?: () => void;
  className?: string;
}

/** Right-hand live translation panel (drawer on mobile). */
export function TranslationPanel({ entries, status, sourceLanguage, targetLanguage, current, onClose, className }: TranslationPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries.length, status]);

  return (
    <section aria-label="Live translation" className={cn('flex h-full flex-col bg-stone-900 text-stone-100', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg gradient-brand">
            <Languages className="size-4 text-white" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">Live Translation</h2>
            <LanguagePair from={sourceLanguage} to={targetLanguage} className="text-xs text-stone-400" />
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-white/10 hover:text-white" aria-label="Close translation panel">
            <X className="size-5" />
          </button>
        )}
      </header>

      {/* Pipeline card: what the AI is working on right now */}
      <div className="border-b border-white/10 p-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">AI Translation</span>
            <TranslationStatusIndicator status={status} onDark />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-stone-500">Source language</dt>
              <dd className="mt-0.5 font-medium text-stone-200">{getLanguage(current?.sourceLanguage ?? sourceLanguage).name}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Target language</dt>
              <dd className="mt-0.5 font-medium text-stone-200">{getLanguage(current?.targetLanguage ?? targetLanguage).name}</dd>
            </div>
          </dl>
          {status === 'unavailable' ? (
            <p className="mt-3 rounded-lg bg-red-500/10 p-2.5 text-xs text-red-300">
              Translation service unavailable. You can still hear the original audio.
            </p>
          ) : current ? (
            <div className="mt-3 space-y-2">
              <div>
                <p className="text-[11px] text-stone-500">Original speech</p>
                <p className="text-sm text-stone-200">“{current.originalText}”</p>
              </div>
              <div>
                <p className="text-[11px] text-stone-500">Translation</p>
                {status === 'processing' ? (
                  <p className="flex items-center gap-2 text-sm text-brand-300">
                    <VoiceWave className="text-brand-300" /> BoloAI is translating…
                  </p>
                ) : (
                  <p className="text-sm font-medium text-white">“{current.translatedText}”</p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-stone-400">Waiting for someone to speak…</p>
          )}
        </div>
      </div>

      {/* Conversation history */}
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin" aria-live="polite">
        {entries.map((t) => (
          <article key={t.id} className={cn('flex gap-3 animate-fade-up', t.isLocal && 'flex-row-reverse')}>
            <Avatar name={t.speakerName === 'You' ? 'You' : t.speakerName} size="xs" />
            <div className={cn('max-w-[85%] space-y-1.5', t.isLocal && 'items-end text-right')}>
              <p className="text-[11px] text-stone-400">
                <span className="font-medium text-stone-300">{t.isLocal ? 'You' : t.speakerName}</span> · {getLanguage(t.sourceLanguage).name} ·{' '}
                {formatTime(t.timestamp)}
              </p>
              <div className={cn('rounded-2xl px-3.5 py-2.5 text-sm', t.isLocal ? 'rounded-tr-sm bg-white/10' : 'rounded-tl-sm bg-white/5 ring-1 ring-white/10')}>
                {t.originalText}
              </div>
              {t.translatedText && (
                <div
                  className={cn(
                    'rounded-2xl border border-brand-400/30 bg-brand-500/15 px-3.5 py-2.5 text-left text-sm',
                    t.isLocal ? 'rounded-tr-sm' : 'rounded-tl-sm',
                  )}
                >
                  <p className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brand-300">
                    <Languages className="size-3" aria-hidden /> BoloAI · {getLanguage(t.targetLanguage).name}
                  </p>
                  <p className="text-white">{t.translatedText}</p>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <footer className="flex items-start gap-2 border-t border-white/10 px-4 py-3 text-[11px] text-stone-400">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Scripted English ↔ Hindi demo transcript. Live speech recognition and translation will appear here once the AI backend is connected.
      </footer>
    </section>
  );
}
