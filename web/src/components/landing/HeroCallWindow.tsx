import { useEffect, useState } from 'react';
import { Captions, Lock, Mic, PhoneOff, Video } from 'lucide-react';
import { media } from '../../data/media';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { VoiceWave } from '../translation/TranslationStatusIndicator';

// Illustrative captions: Marcus speaks English, Ananya reads Hindi.
const lines = [
  { en: 'Hey! How was your week?', hi: 'अरे! आपका हफ़्ता कैसा रहा?' },
  { en: 'Did the new job start already?', hi: 'क्या नई नौकरी शुरू हो गई?' },
  { en: "That's wonderful. Congratulations!", hi: 'यह तो बहुत बढ़िया है। बधाई हो!' },
];

/** Hero visual: a realistic call window playing stock footage with cycling subtitles. */
export function HeroCallWindow() {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'hearing' | 'ready'>('ready');

  useEffect(() => {
    if (reducedMotion) return;
    const toReady = setTimeout(() => setPhase('ready'), 1300);
    const next = setTimeout(() => {
      setIndex((i) => (i + 1) % lines.length);
      setPhase('hearing');
    }, 4800);
    return () => {
      clearTimeout(toReady);
      clearTimeout(next);
    };
  }, [index, reducedMotion]);

  const line = lines[index];

  return (
    <figure className="relative">
      <div className="overflow-hidden rounded-2xl bg-stone-900 shadow-[0_30px_60px_-25px_rgba(28,25,23,0.55)] ring-1 ring-black/10">
        {/* Window bar */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-stone-900 px-4 py-2.5 text-xs text-stone-300">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-stone-600" />
            <span className="size-2.5 rounded-full bg-stone-600" />
            <span className="size-2.5 rounded-full bg-stone-600" />
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono">
            <Lock className="size-3 text-emerald-400" aria-hidden /> BOLO-5307
          </span>
          <span className="ml-auto rounded-full bg-white/10 px-2.5 py-0.5 font-medium text-stone-200">English → हिन्दी</span>
        </div>

        <div className="relative aspect-[16/10]">
          <video
            src={media.demoCall.video}
            poster={media.demoCall.poster}
            autoPlay={!reducedMotion}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 size-full object-cover"
            aria-hidden
          />
          <span className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-0.5 text-xs font-medium text-white">Marcus · London</span>

          {/* Picture-in-picture */}
          <div className="absolute right-3 top-3 w-[26%] overflow-hidden rounded-lg ring-2 ring-white/70 shadow-lg">
            <img src={media.selfie} alt="" className="aspect-[4/3] w-full object-cover object-[60%_30%]" />
            <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 text-[10px] font-medium text-white">Ananya · Delhi</span>
          </div>

          {/* Subtitle */}
          <div className="absolute inset-x-0 bottom-3 flex justify-center px-4" aria-live="off">
            <div key={`${index}-${phase}`} className="max-w-[90%] animate-fade-in rounded-lg bg-black/70 px-4 py-2 text-center">
              {phase === 'hearing' ? (
                <p className="flex items-center gap-2 text-sm italic text-white/75">
                  <VoiceWave className="text-accent-300" bars={4} /> “{line.en}”
                </p>
              ) : (
                <>
                  <p className="text-base font-medium text-white sm:text-lg" lang="hi">
                    {line.hi}
                  </p>
                  <p className="text-[11px] text-white/55">“{line.en}”</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 bg-stone-900 py-2.5" aria-hidden>
          {[Mic, Video, Captions].map((Icon, i) => (
            <span key={i} className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-white">
              <Icon className="size-4" />
            </span>
          ))}
          <span className="flex h-8 w-11 items-center justify-center rounded-lg bg-red-600 text-white">
            <PhoneOff className="size-4" />
          </span>
        </div>
      </div>

      {/* Handwritten-style annotation */}
      <div className="pointer-events-none absolute -top-14 right-24 hidden items-end gap-1 lg:flex" aria-hidden>
        <p className="-rotate-3 font-serif-display text-xl italic leading-tight text-accent-600 dark:text-accent-400">he speaks English, she reads Hindi</p>
        <svg viewBox="0 0 60 44" className="mb-[-22px] h-10 w-14 text-accent-500">
          <path d="M4 6 C 30 4, 48 14, 52 38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M44 30 L 52 39 L 57 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <figcaption className="mt-3 text-xs text-subtle">Illustration: stock footage with example subtitles. Live translation arrives with the AI backend.</figcaption>
    </figure>
  );
}
