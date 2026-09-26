import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, ButtonLink } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-4">
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center">
        <Logo />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center pb-16 text-center animate-fade-up">
        <p className="font-serif-display text-9xl leading-none text-brand-700 dark:text-brand-300 sm:text-[10rem]">404</p>
        <h1 className="font-serif-display mt-2 text-4xl text-fg sm:text-5xl"><em>Lost in translation</em></h1>
        <p className="mt-2 max-w-md text-muted">
          We couldn’t find that page in any language. It may have moved, or the link might be wrong.
        </p>
        <p className="mt-1 text-sm text-subtle" lang="hi">यह पेज नहीं मिला · ఈ పేజీ కనుగొనబడలేదు</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="size-4" />}>
            Go back
          </Button>
          <ButtonLink to={isAuthenticated ? '/dashboard' : '/'} leftIcon={<Home className="size-4" />}>
            {isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
