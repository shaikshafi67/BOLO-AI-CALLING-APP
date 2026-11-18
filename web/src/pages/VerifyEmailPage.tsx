import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck, RotateCw } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/FormControls';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { verificationService } from '../services/verificationService';

/** Sends the first code once per page visit, even when React runs effects twice. */
let sentForUid: string | null = null;

/** One-time email check after creating an account: enter the 6-digit code we emailed. */
export default function VerifyEmailPage() {
  const { user, markVerified, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [wait, setWait] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      setWait(await verificationService.send());
      notify(`Code sent to ${user?.email}.`, 'success');
    } catch (e) {
      setError(verificationService.describe(e));
      const retry = (e as { body?: { retryInSeconds?: number } }).body?.retryInSeconds;
      if (retry) setWait(retry);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (!user || sentForUid === user.id) return;
    sentForUid = user.id;
    void send();
    // Once per account on arrival; "Send a new code" handles the rest.
  }, [user?.id]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      await verificationService.verify(code);
      markVerified();
      notify('Email verified. Welcome to BoloAI!', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(verificationService.describe(err));
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <AuthLayout title="Verify your email" subtitle={`We sent a 6-digit code to ${user?.email ?? 'your email'}. Enter it to finish creating your account.`}>
      <div className="mb-6 flex items-center gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
        <MailCheck className="size-5 shrink-0" aria-hidden />
        <span>Can’t find it? Check your spam or promotions folder. The code expires in 10 minutes.</span>
      </div>

      <form onSubmit={verify} noValidate className="space-y-4">
        <Input
          ref={inputRef}
          id="verification-code"
          label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          maxLength={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
            setError(null);
          }}
          error={error ?? undefined}
          className="text-center font-mono text-2xl tracking-[0.5em]"
        />
        <Button type="submit" fullWidth size="lg" loading={verifying} disabled={code.length !== 6}>
          Verify email
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={send}
          disabled={sending || wait > 0}
          className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-subtle dark:text-brand-300"
        >
          <RotateCw className={sending ? 'size-3.5 animate-spin' : 'size-3.5'} aria-hidden />
          {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
        </button>
        <button
          type="button"
          onClick={async () => {
            sentForUid = null;
            await logout();
            navigate('/login', { replace: true });
          }}
          className="font-medium text-muted hover:text-fg"
        >
          Use a different account
        </button>
      </div>
    </AuthLayout>
  );
}
