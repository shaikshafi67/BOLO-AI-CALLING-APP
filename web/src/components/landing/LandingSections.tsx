import type { ReactNode } from 'react';
import { ArrowRight, Captions, Gauge, Languages, Lock, MessageSquareText, MonitorSmartphone, Repeat2, ScanSearch, Video, type LucideIcon } from 'lucide-react';
import { languages } from '../../data/languages';
import { media } from '../../data/media';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { ButtonLink } from '../ui/Button';
import { cn } from '../../utils/format';

function SectionIntro({ kicker, title, children, className }: { kicker: string; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('max-w-xl', className)}>
      <p className="text-sm font-semibold text-accent-600 dark:text-accent-400">{kicker}</p>
      <h2 className="font-serif-display mt-3 text-4xl leading-[1.05] text-fg sm:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{children}</p>}
    </div>
  );
}

/* ------------------------------- Hello strip ------------------------------- */

const hellos = [
  { text: 'नमस्ते', lang: 'hi' },
  { text: 'Hello', lang: 'en' },
  { text: 'హలో', lang: 'te' },
  { text: 'வணக்கம்', lang: 'ta' },
  { text: 'નમસ્તે', lang: 'gu' },
  { text: 'ನಮಸ್ಕಾರ', lang: 'kn' },
  { text: 'നമസ്കാരം', lang: 'ml' },
  { text: 'নমস্কার', lang: 'bn' },
  { text: 'नमस्कार', lang: 'mr' },
];

export function HelloStrip() {
  const reduced = usePrefersReducedMotion();
  const row = (
    <div className="flex shrink-0 items-center gap-10 pr-10">
      {hellos.map((h) => (
        <span key={h.lang} lang={h.lang} className="flex items-center gap-10 whitespace-nowrap text-2xl text-muted sm:text-3xl">
          {h.text}
          <span className="size-1.5 rounded-full bg-accent-500" aria-hidden />
        </span>
      ))}
    </div>
  );
  return (
    <div className="overflow-hidden border-y border-line bg-surface py-5" role="img" aria-label="Hello in nine languages">
      <div className={cn('flex w-max', !reduced && 'animate-marquee')} aria-hidden>
        {row}
        {row}
      </div>
    </div>
  );
}

/* ------------------------------ Who it's for ------------------------------- */

const stories = [
  {
    img: media.family,
    title: 'Calling family abroad',
    text: 'The kids chat in English at school. Nani only speaks Telugu. Now Sunday calls are actual conversations.',
    tag: 'Telugu ↔ English',
    className: 'lg:col-span-7 lg:row-span-2',
    imgClass: 'aspect-[4/3] lg:aspect-auto lg:h-full',
  },
  {
    img: media.doctor,
    title: 'Seeing a doctor far from home',
    text: 'Describe your symptoms in Tamil. The doctor hears English.',
    tag: 'Tamil ↔ English',
    className: 'lg:col-span-5',
    imgClass: 'aspect-[16/10]',
  },
  {
    img: media.students,
    title: 'Study groups and teams',
    text: 'Classmates from four states, one call, nobody left out.',
    tag: 'Hindi ↔ Telugu',
    className: 'lg:col-span-5',
    imgClass: 'aspect-[16/10]',
  },
];

export function StoriesSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <SectionIntro kicker="Who it’s for" title={<>Made for the calls that <em>actually matter</em></>}>
            Language shouldn’t decide who you can talk to. These are the conversations we’re building BoloAI for.
          </SectionIntro>
          <p className="text-xs text-subtle lg:max-w-[16rem] lg:text-right">Example scenarios with stock photography, not customer stories.</p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-12 lg:grid-rows-2">
          {stories.map((s) => (
            <article key={s.title} className={cn('group relative overflow-hidden rounded-xl bg-stone-900', s.className)}>
              <img src={s.img} alt="" loading="lazy" className={cn('w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]', s.imgClass)} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <span className="rounded bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-stone-900">{s.tag}</span>
                <h3 className="mt-3 text-xl font-semibold text-white sm:text-2xl">{s.title}</h3>
                <p className="mt-1 max-w-md text-sm text-white/80">{s.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- How it works ------------------------------ */

const steps = [
  { title: 'Start a video call', text: 'Create a room or join with a code like BOLO-4829. Video and your original voice travel peer-to-peer over WebRTC.' },
  { title: 'Speak naturally', text: 'No push-to-talk and no pausing for a translator. Just talk in the language you think in.' },
  { title: 'AI recognizes and translates', text: 'Speech-to-text writes down what you said; a translation model turns it into the listener’s language.' },
  { title: 'They hear their language', text: 'Text-to-speech reads the translation aloud while live captions show both versions on screen.' },
];

const pipeline = ['Microphone', 'Speech recognition', 'Translation', 'Text-to-speech', 'Listener'];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-line bg-surface py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionIntro kicker="How it works" title="How one sentence crosses a language">
            The call and the translation run side by side. You keep hearing the other person’s real voice and tone, with the translation layered on
            top.
          </SectionIntro>
          <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
            {pipeline.map((p, i) => (
              <span key={p} className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-md border px-2.5 py-1',
                    i === 0 || i === pipeline.length - 1
                      ? 'border-line text-muted'
                      : 'border-brand-200 bg-brand-50 font-medium text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200',
                  )}
                >
                  {p}
                </span>
                {i < pipeline.length - 1 && <ArrowRight className="size-3.5 text-subtle" aria-hidden />}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-subtle">The AI stages are being connected. Today the app runs a scripted demo of this flow.</p>
        </div>

        <ol className="divide-y divide-line border-y border-line">
          {steps.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[3.5rem_1fr] gap-4 py-7">
              <span className="font-serif-display text-4xl leading-none text-accent-500">{i + 1}</span>
              <div>
                <h3 className="text-lg font-semibold text-fg">{s.title}</h3>
                <p className="mt-1.5 leading-relaxed text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------- Video banner ------------------------------ */

export function VideoBanner({ ctaTo }: { ctaTo: string }) {
  const reduced = usePrefersReducedMotion();
  return (
    <section className="relative isolate overflow-hidden bg-stone-900">
      <video
        src={media.balcony.video}
        poster={media.balcony.poster}
        autoPlay={!reduced}
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 -z-10 size-full object-cover object-[70%_center]"
        aria-hidden
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/45 to-black/10" aria-hidden />
      <div className="mx-auto max-w-7xl px-4 py-28 sm:px-6 sm:py-36 lg:px-8">
        <div className="max-w-xl text-white">
          <h2 className="font-serif-display text-5xl leading-[1.02] sm:text-6xl">
            Every language is <em>someone’s home.</em>
          </h2>
          <p className="mt-5 text-lg text-white/80">
            BoloAI starts with India’s languages and English, for everyone who’d rather be understood in their own words.
          </p>
          <ButtonLink to={ctaTo} size="lg" variant="inverse" className="mt-8" rightIcon={<ArrowRight className="size-4" />}>
            Start a call
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Features -------------------------------- */

const features: { icon: LucideIcon; title: string; text: string; ready: boolean }[] = [
  { icon: Video, title: 'Real-time video calling', text: 'One-to-one HD calls with a calm, uncluttered call screen.', ready: false },
  { icon: Languages, title: 'AI speech translation', text: 'Your words, spoken aloud in the listener’s language.', ready: false },
  { icon: Captions, title: 'Live captions', text: 'Subtitles in both the original and the translated language.', ready: true },
  { icon: Repeat2, title: 'Both directions at once', text: 'Each person speaks their own language; BoloAI handles both sides.', ready: true },
  { icon: MessageSquareText, title: 'Multiple languages', text: 'English and major Indian languages, with more on the roadmap.', ready: true },
  { icon: ScanSearch, title: 'Automatic language detection', text: 'Just start talking; BoloAI works out which language it is.', ready: false },
  { icon: Gauge, title: 'Low latency', text: 'Streaming recognition so the conversation keeps its rhythm.', ready: false },
  { icon: Lock, title: 'Secure by design', text: 'Encrypted WebRTC media and Firebase-authenticated sessions.', ready: false },
  { icon: MonitorSmartphone, title: 'Web, Android, iOS, desktop', text: 'Web first, with native apps on the same backend.', ready: true },
];

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionIntro kicker="Features" title="What’s in the box">
              An honest list. Everything marked <em>UI ready</em> works in this prototype; the rest needs the backend and AI services we’re connecting
              next.
            </SectionIntro>
            <img
              src={media.headphones}
              alt="A woman with headphones smiling at her laptop during a call"
              loading="lazy"
              className="mt-10 hidden aspect-[4/3] w-full rounded-xl object-cover lg:block"
            />
          </div>

          <ul className="grid content-start gap-x-10 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f.title} className="border-t border-line py-6">
                <div className="flex items-center justify-between gap-3">
                  <f.icon className="size-5 text-brand-600 dark:text-brand-300" aria-hidden />
                  <span
                    className={cn(
                      'text-[11px] font-semibold uppercase tracking-wide',
                      f.ready ? 'text-emerald-700 dark:text-emerald-400' : 'text-accent-600 dark:text-accent-400',
                    )}
                  >
                    {f.ready ? 'UI ready' : 'Needs backend'}
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-fg">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Languages ------------------------------- */

export function LanguagesSection() {
  return (
    <section id="languages" className="scroll-mt-20 border-t border-line bg-surface py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionIntro kicker="Languages" title="Nine languages, four ready first">
          English, Hindi, Telugu and Tamil are supported end-to-end in the backend design. The others are planned next.
        </SectionIntro>

        <div className="mt-12 grid grid-cols-2 border-l border-t border-line sm:grid-cols-3 lg:grid-cols-5">
          {languages.map((l) => (
            <div key={l.code} className="flex min-h-36 flex-col justify-between border-b border-r border-line p-5">
              <span lang={l.code} className={cn('text-3xl', l.status === 'available' ? 'text-fg' : 'text-subtle')}>
                {l.nativeName}
              </span>
              <div className="mt-6 flex items-center justify-between gap-2 text-sm">
                <span className="text-muted">{l.name}</span>
                <span className={cn('flex items-center gap-1.5 text-xs font-medium', l.status === 'available' ? 'text-emerald-700 dark:text-emerald-400' : 'text-subtle')}>
                  <span className={cn('size-1.5 rounded-full', l.status === 'available' ? 'bg-emerald-500' : 'bg-stone-400')} aria-hidden />
                  {l.status === 'available' ? 'Available' : 'Planned'}
                </span>
              </div>
            </div>
          ))}
          <div className="hidden border-b border-r border-line bg-surface-2 p-5 text-sm text-muted lg:flex lg:items-end">
            Language availability depends on the connected AI services.
          </div>
        </div>
        <p className="mt-4 text-sm text-muted lg:hidden">Language availability depends on the connected AI services.</p>
      </div>
    </section>
  );
}
