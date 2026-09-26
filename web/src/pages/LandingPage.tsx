import { ArrowDown, ArrowRight } from 'lucide-react';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { HeroCallWindow } from '../components/landing/HeroCallWindow';
import { FeaturesSection, HelloStrip, HowItWorksSection, LanguagesSection, StoriesSection, VideoBanner } from '../components/landing/LandingSections';
import { ButtonLink } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
import { media } from '../data/media';

const implemented = [
  'Complete responsive web app (13 screens)',
  'Light, dark and system themes',
  'Sign-in, dashboard, contacts and call history (mock data)',
  'Call screen with captions, translation panel and every call state',
  'Optional real camera preview in the browser',
  'Service layer ready for the backend',
];

const upcoming = [
  'Firebase Authentication',
  'WebRTC signaling server (Socket.IO)',
  'Streaming speech-to-text',
  'Translation API',
  'Text-to-speech voice output',
  'PostgreSQL history and contacts',
];

function ArchitectureDiagram() {
  const box = 'rounded-md border border-line bg-surface px-3 py-2.5 text-center text-sm text-fg';
  const ai = 'rounded-md border border-brand-200 bg-brand-50 px-3 py-2.5 text-center text-sm text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200';
  const arrow = <ArrowDown className="mx-auto my-1 size-3.5 text-subtle" aria-hidden />;
  return (
    <figure className="rounded-xl border border-line bg-surface-2/60 p-6" aria-labelledby="arch-caption">
      <figcaption id="arch-caption" className="mb-5 text-sm font-semibold text-fg">
        Planned architecture
      </figcaption>
      <div className="mx-auto max-w-sm">
        <div className="rounded-md bg-brand-700 px-3 py-2.5 text-center text-sm font-medium text-white">BoloAI web app</div>
        <div className="mx-auto h-4 w-px bg-line" aria-hidden />
        {/* Horizontal connector spanning the two column centers (gap-4 = 1rem). */}
        <div className="mx-auto h-px w-[calc(50%+0.5rem)] bg-line" aria-hidden />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="mx-auto h-4 w-px bg-line" aria-hidden />
            <div className={box}>WebRTC</div>
            {arrow}
            <div className={box}>Video + original audio</div>
          </div>
          <div>
            <div className="mx-auto h-4 w-px bg-line" aria-hidden />
            <div className={ai}>AI pipeline</div>
            {arrow}
            <div className={ai}>Speech-to-text</div>
            {arrow}
            <div className={ai}>Translation</div>
            {arrow}
            <div className={ai}>Text-to-speech</div>
            {arrow}
            <div className={ai}>Translated audio</div>
            {arrow}
            <div className={box}>Listener</div>
          </div>
        </div>
      </div>
    </figure>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const startTo = isAuthenticated ? '/start-call' : '/register';

  return (
    <div className="min-h-dvh bg-canvas">
      <LandingNavbar />

      {/* Hero */}
      <section className="pb-16 pt-28 sm:pb-20 sm:pt-32 lg:pt-36">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:px-8">
          <div className="animate-fade-up">
            <p className="text-sm font-medium text-muted">
              <span className="mr-2 inline-block size-2 rounded-full bg-accent-500 align-middle" aria-hidden />
              Web prototype · a university capstone project
            </p>
            <h1 className="font-serif-display mt-5 text-[3.2rem] leading-[0.98] text-fg sm:text-7xl lg:text-[5.25rem]">
              Break language barriers <em className="marker">in real time.</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Connect with anyone, anywhere. BoloAI combines real-time video calling with AI-powered speech translation, live captions and translated
              voice.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <ButtonLink to={startTo} size="lg" rightIcon={<ArrowRight className="size-4" />}>
                Start Calling
              </ButtonLink>
              <a href="#how-it-works" className="inline-flex items-center justify-center gap-1.5 px-2 py-3 font-medium text-fg underline decoration-accent-500 decoration-2 underline-offset-[6px] hover:decoration-4">
                See how it works
              </a>
            </div>
            <p className="mt-10 border-l-2 border-accent-500 pl-4 text-sm text-muted">
              “Speak your language. We’ll translate the rest.”
            </p>
          </div>

          <div className="animate-fade-up [animation-delay:0.12s]">
            <HeroCallWindow />
          </div>
        </div>
      </section>

      <HelloStrip />
      <StoriesSection />
      <HowItWorksSection />
      <VideoBanner ctaTo={startTo} />
      <FeaturesSection />
      <LanguagesSection />

      {/* About */}
      <section id="about" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold text-accent-600 dark:text-accent-400">About the project</p>
            <h2 className="font-serif-display mt-3 text-4xl leading-[1.05] text-fg sm:text-5xl">A capstone project, built like a real product</h2>
            <p className="mt-5 leading-relaxed text-muted">
              BoloAI explores how speech recognition, machine translation and speech synthesis can sit on top of an ordinary video call, so two people
              who don’t share a language can simply talk. This web app is the frontend prototype; the AI and backend services are being connected next.
            </p>

            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="border-b border-line pb-2 text-sm font-semibold text-fg">Working in this prototype</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  {implemented.map((i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="border-b border-line pb-2 text-sm font-semibold text-fg">Coming next</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted">
                  {upcoming.map((i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <ArchitectureDiagram />
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-2xl bg-brand-800 text-white lg:grid-cols-2">
          <div className="p-8 sm:p-12 lg:p-14">
            <h2 className="font-serif-display text-4xl leading-[1.05] sm:text-5xl">Ready to talk without barriers?</h2>
            <p className="mt-4 max-w-md text-white/75">Create an account and try the prototype: the dashboard, the call screen, captions and more.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to={isAuthenticated ? '/dashboard' : '/register'} size="lg" variant="inverse">
                {isAuthenticated ? 'Open Dashboard' : 'Create a free account'}
              </ButtonLink>
              {!isAuthenticated && (
                <ButtonLink to="/login" size="lg" variant="onBrand">
                  I already have an account
                </ButtonLink>
              )}
            </div>
          </div>
          <img src={media.parents} alt="An older couple smiling at a laptop during a video call" loading="lazy" className="h-64 w-full object-cover lg:h-full" />
        </div>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-10 sm:flex-row sm:px-6 lg:px-8">
          <div className="text-center sm:text-left">
            <Logo />
            <p className="mt-2 text-sm text-muted">Speak your language. We’ll translate the rest.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted">
            <a href="#features" className="hover:text-fg">Features</a>
            <a href="#how-it-works" className="hover:text-fg">How it works</a>
            <a href="#languages" className="hover:text-fg">Languages</a>
            <a href="#about" className="hover:text-fg">About</a>
          </nav>
        </div>
        <p className="border-t border-line px-4 py-5 text-center text-xs text-subtle">
          © {new Date().getFullYear()} BoloAI · University capstone project · Photos and video: Mixkit (free license)
        </p>
      </footer>
    </div>
  );
}
