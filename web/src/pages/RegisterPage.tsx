import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Lock, Mail, UserRound, X } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Checkbox, Input } from '../components/ui/FormControls';
import { GoogleIcon } from '../components/ui/Misc';
import { LanguageSelect } from '../components/translation/LanguageBits';
import { useAuth } from '../context/AuthContext';
import { useCallSettings } from '../context/CallSettingsContext';
import { useToast } from '../context/ToastContext';
import { translationService } from '../services/translationService';
import type { LanguageCode } from '../types';
import { EMAIL_PATTERN, passwordRules, passwordScore } from '../utils/validation';
import { cn } from '../utils/format';

const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirm?: string;
  terms?: string;
}

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const { update: updateCallSettings } = useCallSettings();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const score = passwordScore(password);

  const validate = () => {
    const next: FormErrors = {};
    if (fullName.trim().length < 2) next.fullName = 'Please enter your full name.';
    if (!EMAIL_PATTERN.test(email)) next.email = 'Enter a valid email address.';
    if (score < passwordRules.length) next.password = 'Password doesn’t meet all requirements.';
    if (confirm !== password || !confirm) next.confirm = 'Passwords don’t match.';
    if (!terms) next.terms = 'Please accept the terms to continue.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register({ fullName: fullName.trim(), email, password, preferredLanguage: language });
      if (translationService.isLanguageSupported(language)) updateCallSettings({ myLanguage: language });
      notify('Account created. Welcome to BoloAI!', 'success');
      navigate('/dashboard', { replace: true });
    } catch {
      notify('Could not create your account. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    await loginWithGoogle();
    notify('Signed in with Google (demo mode).', 'success');
    navigate('/dashboard', { replace: true });
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start talking to anyone, in your own language.">
      <Button variant="outline" fullWidth size="lg" onClick={onGoogle} leftIcon={<GoogleIcon />}>
        Sign up with Google
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-subtle">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Input
          label="Full Name"
          autoComplete="name"
          placeholder="e.g. Shafi Shaik"
          icon={<UserRound className="size-4" />}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          icon={<Mail className="size-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <div className="space-y-2">
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            icon={<Lock className="size-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          {password && (
            <div className="animate-fade-in space-y-2" aria-live="polite">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {passwordRules.map((_, i) => (
                    <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i < score ? strengthColors[score] : 'bg-line')} />
                  ))}
                </div>
                <span className="w-16 text-right text-xs font-medium text-muted">{strengthLabels[score]}</span>
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
                {passwordRules.map((r) => {
                  const ok = r.test(password);
                  return (
                    <li key={r.id} className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-subtle')}>
                      {ok ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
                      {r.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        <Input
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          icon={<Lock className="size-4" />}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        <LanguageSelect
          label="Preferred Language"
          value={language}
          onChange={setLanguage}
          allowPlanned
          hint="You’ll speak and hear this language on calls. You can change it later."
        />
        <div>
          <Checkbox
            label={
              <span>
                I agree to the <span className="font-medium text-fg">Terms</span> and <span className="font-medium text-fg">Privacy Policy</span>
              </span>
            }
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
          />
          {errors.terms && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{errors.terms}</p>}
        </div>
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Create Account
        </Button>
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
