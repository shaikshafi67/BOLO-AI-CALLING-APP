import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Checkbox, Input } from '../components/ui/FormControls';
import { GoogleIcon } from '../components/ui/Misc';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/authService';
import { EMAIL_PATTERN } from '../utils/validation';

export default function LoginPage() {
  const { login, loginWithGoogle, takeSignOutNotice } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Signed out because the account signed in on another device.
  useEffect(() => {
    const notice = takeSignOutNotice();
    if (notice) setFormError(notice);
    // Shown once, on arrival.
  }, []);

  const validate = () => {
    const next: typeof errors = {};
    if (!EMAIL_PATTERN.test(email)) next.email = 'Enter a valid email address.';
    if (password.length < 6) next.password = 'Password must be at least 6 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading('email');
    setFormError(null);
    try {
      await login(email, password, remember);
      notify('Welcome back to BoloAI!', 'success');
      navigate(redirectTo, { replace: true });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not sign in. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const onGoogle = async () => {
    setLoading('google');
    setFormError(null);
    try {
      await loginWithGoogle();
      notify('Signed in with Google.', 'success');
      navigate(redirectTo, { replace: true });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Google sign-in failed.');
    } finally {
      setLoading(null);
    }
  };

  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(resetEmail)) return;
    setResetSending(true);
    try {
      await authService.resetPassword(resetEmail);
      setResetOpen(false);
      notify(`If an account uses ${resetEmail}, a reset link is on its way. Check your inbox.`, 'success');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Couldn’t send the reset email.', 'error');
    } finally {
      setResetSending(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue your conversations.">
      <Button variant="outline" fullWidth size="lg" onClick={onGoogle} loading={loading === 'google'} disabled={loading !== null} leftIcon={<GoogleIcon />}>
        Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-subtle">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      {formError && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {formError}
        </p>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
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
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          icon={<Lock className="size-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          labelAction={
            <button
              type="button"
              onClick={() => {
                setResetEmail(email);
                setResetOpen(true);
              }}
              className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300"
            >
              Forgot password?
            </button>
          }
        />
        <Checkbox label="Remember me" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <Button type="submit" fullWidth size="lg" loading={loading === 'email'} disabled={loading !== null}>
          Login
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Don’t have an account?{' '}
        <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300">
          Create account
        </Link>
      </p>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset your password"
        description="Enter your email and we’ll send you a reset link."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="reset-form" loading={resetSending} disabled={!EMAIL_PATTERN.test(resetEmail)}>
              Send reset link
            </Button>
          </>
        }
      >
        <form id="reset-form" onSubmit={onReset}>
          <Input label="Email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} icon={<Mail className="size-4" />} />
        </form>
      </Modal>
    </AuthLayout>
  );
}
