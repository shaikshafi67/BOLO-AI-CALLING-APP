import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, UserRound } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/FormControls';
import { GoogleIcon } from '../components/ui/Misc';
import { LanguageSelect } from '../components/translation/LanguageBits';
import { useAuth } from '../context/AuthContext';
import { useCallSettings } from '../context/CallSettingsContext';
import { useToast } from '../context/ToastContext';
import { AuthError } from '../services/authService';
import type { LanguageCode } from '../types';
import { deviceLanguage, EMAIL_PATTERN, MIN_PASSWORD_LENGTH, passwordStrength } from '../utils/validation';
import { cn } from '../utils/format';

const strength = [
  { label: '', color: 'bg-line' },
  { label: 'Okay', color: 'bg-amber-500' },
  { label: 'Good', color: 'bg-blue-500' },
  { label: 'Strong', color: 'bg-emerald-500' },
];

type Field = 'fullName' | 'email' | 'password';

function check(field: Field, value: string): string | undefined {
  if (field === 'fullName') return value.trim().length < 2 ? 'Enter your name.' : undefined;
  if (field === 'email') return EMAIL_PATTERN.test(value.trim()) ? undefined : 'Enter a valid email address.';
  return value.length < MIN_PASSWORD_LENGTH ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : undefined;
}

/** Sign-up: Google in one tap, or name, email and password. */
export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const { update: updateCallSettings } = useCallSettings();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [values, setValues] = useState<Record<Field, string>>({ fullName: '', email: '', password: '' });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [language, setLanguage] = useState<LanguageCode>(deviceLanguage);
  const [emailTaken, setEmailTaken] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);

  const errorFor = (f: Field) => (touched[f] ? check(f, values[f]) : undefined);
  const set = (f: Field) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [f]: e.target.value }));
    if (f === 'email') setEmailTaken(false);
    setFormError(null);
  };
  const blur = (f: Field) => () => values[f] && setTouched((t) => ({ ...t, [f]: true }));
  const level = passwordStrength(values.password);

  const finish = (welcome: string) => {
    updateCallSettings({ myLanguage: language });
    notify(welcome, 'success');
    navigate('/dashboard', { replace: true });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, password: true });
    if ((['fullName', 'email', 'password'] as Field[]).some((f) => check(f, values[f]))) return;
    setLoading('email');
    setFormError(null);
    try {
      await register({ fullName: values.fullName.trim(), email: values.email.trim(), password: values.password, preferredLanguage: language });
      finish(`Welcome to BoloAI, ${values.fullName.trim().split(/\s+/)[0]}!`);
    } catch (err) {
      if (err instanceof AuthError && err.code === 'auth/email-already-in-use') setEmailTaken(true);
      else setFormError(err instanceof Error ? err.message : 'Could not create your account. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const onGoogle = async () => {
    setLoading('google');
    setFormError(null);
    try {
      await loginWithGoogle();
      finish('Welcome to BoloAI!');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Talk to anyone, in your own language. It takes a few seconds.">
      <Button fullWidth size="lg" onClick={onGoogle} loading={loading === 'google'} disabled={loading !== null} leftIcon={<GoogleIcon />} className="h-13 text-base">
        Continue with Google
      </Button>
      <p className="mt-2 text-center text-xs text-subtle">Fastest: no password to remember.</p>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-subtle">
        <span className="h-px flex-1 bg-line" /> or sign up with email <span className="h-px flex-1 bg-line" />
      </div>

      {formError && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {formError}
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Input
          id="signup-name"
          label="Your name"
          autoComplete="name"
          placeholder="e.g. Shafi Shaik"
          icon={<UserRound className="size-4" />}
          value={values.fullName}
          onChange={set('fullName')}
          onBlur={blur('fullName')}
          error={errorFor('fullName')}
        />
        <Input
          id="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail className="size-4" />}
          value={values.email}
          onChange={set('email')}
          onBlur={blur('email')}
          error={
            emailTaken ? (
              <>
                This email already has an account.{' '}
                <Link to="/login" className="font-semibold underline">
                  Log in instead
                </Link>
              </>
            ) : (
              errorFor('email')
            )
          }
        />
        <div className="space-y-2">
          <Input
            id="signup-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            icon={<Lock className="size-4" />}
            value={values.password}
            onChange={set('password')}
            onBlur={blur('password')}
            error={errorFor('password')}
          />
          {values.password && (
            <div className="flex items-center gap-2" aria-live="polite">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3].map((i) => (
                  <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= level ? strength[level].color : 'bg-line')} />
                ))}
              </div>
              <span className="w-28 text-right text-xs font-medium text-muted">
                {level === 0 ? `${MIN_PASSWORD_LENGTH - values.password.length} more characters` : strength[level].label}
              </span>
            </div>
          )}
        </div>
        <LanguageSelect
          id="signup-language"
          label="Language you speak"
          value={language}
          onChange={setLanguage}
          hint="We picked this from your device. You can change it any time."
        />
        <Button type="submit" fullWidth size="lg" loading={loading === 'email'} disabled={loading !== null}>
          Create account
        </Button>
        <p className="text-center text-xs text-subtle">
          By creating an account, you agree to the <span className="font-medium text-muted">Terms</span> and <span className="font-medium text-muted">Privacy Policy</span>.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
