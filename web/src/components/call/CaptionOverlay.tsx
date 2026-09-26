import type { Translation, TranslationStatus } from '../../types';
import { getLanguage } from '../../data/languages';
import { VoiceWave } from '../translation/TranslationStatusIndicator';

interface CaptionOverlayProps {
  current?: Translation;
  status: TranslationStatus;
}

/** Live caption strip at the bottom of the main video. */
export function CaptionOverlay({ current, status }: CaptionOverlayProps) {
  if (!current) return null;
  const processing = status === 'processing';
  const unavailable = status === 'unavailable';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4" aria-live="polite">
      <div className="max-w-2xl animate-fade-up rounded-2xl bg-black/70 px-5 py-3 text-center shadow-2xl backdrop-blur-md">
        <p className="mb-1 flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-wider text-white/60">
          <span>{current.isLocal ? 'You' : current.speakerName}</span>
          <span aria-hidden>·</span>
          <span>
            {getLanguage(current.sourceLanguage).name} → {getLanguage(current.targetLanguage).name}
          </span>
        </p>
        {unavailable ? (
          <p className="text-base text-white/90 sm:text-lg">{current.originalText}</p>
        ) : processing ? (
          <p className="flex items-center justify-center gap-3 text-base text-white/80 sm:text-lg">
            <VoiceWave className="text-brand-300" />
            <span className="italic">{current.originalText}</span>
          </p>
        ) : (
          <p className="text-lg font-medium text-white sm:text-xl">{current.translatedText}</p>
        )}
      </div>
    </div>
  );
}
