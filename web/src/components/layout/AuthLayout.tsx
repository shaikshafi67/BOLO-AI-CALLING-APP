import type { ReactNode } from 'react';
import { Logo } from '../ui/Logo';
import { ThemeToggleButton } from './ThemeToggleButton';
import { media } from '../../data/media';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Split-screen layout for login/register: photo panel + form. */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-stone-900 lg:block">
        <img src={media.headphones} alt="" className="absolute inset-0 size-full object-cover object-[45%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/30" aria-hidden />

        <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-12">
          <Logo textClassName="text-white" />

          <div className="max-w-md">
            {/* A single caption, styled like the real call screen */}
            <div className="mb-8 inline-block rounded-lg bg-black/65 px-4 py-2.5 backdrop-blur-sm">
              <p className="text-lg font-medium" lang="hi">
                आप कैसे हैं?
              </p>
              <p className="text-xs text-white/60">“How are you?” · English → Hindi</p>
            </div>
            <h2 className="font-serif-display text-5xl leading-[1.02]">
              Speak your language.
              <br />
              <em>We’ll translate the rest.</em>
            </h2>
            <p className="mt-4 text-white/75">Video calls with live captions and translated voice, starting with India’s languages and English.</p>
          </div>

          <p className="text-xs text-white/50">© {new Date().getFullYear()} BoloAI · University capstone project</p>
        </div>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo className="lg:invisible" />
          <ThemeToggleButton />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10 animate-fade-up">
          <h1 className="font-serif-display text-5xl text-fg">{title}</h1>
          <p className="mt-2 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
