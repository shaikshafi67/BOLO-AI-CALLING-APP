import { Loader2, PhoneOff, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionState } from '../../types';
import { LogoMark } from '../ui/Logo';
import { cn } from '../../utils/format';

interface ConnectionStatusProps {
  state: ConnectionState;
  className?: string;
}

const statusConfig: Record<ConnectionState, { label: string; dot: string; icon: typeof Wifi }> = {
  connecting: { label: 'Connecting…', dot: 'bg-amber-400 animate-pulse', icon: Loader2 },
  connected: { label: 'Excellent connection', dot: 'bg-emerald-400', icon: Wifi },
  reconnecting: { label: 'Reconnecting…', dot: 'bg-amber-400 animate-pulse', icon: RefreshCw },
  unstable: { label: 'Connection unstable', dot: 'bg-orange-400 animate-pulse', icon: WifiOff },
  ended: { label: 'Call ended', dot: 'bg-stone-400', icon: PhoneOff },
};

/** Compact pill shown in the call top bar. */
export function ConnectionStatus({ state, className }: ConnectionStatusProps) {
  const { label, dot } = statusConfig[state];
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs font-medium text-stone-300', className)} role="status">
      <span className={cn('size-2 rounded-full', dot)} aria-hidden />
      {label}
    </span>
  );
}

/** Full-area overlay while connecting / reconnecting. */
export function ConnectingOverlay({ state, contactName }: { state: 'connecting' | 'reconnecting'; contactName: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-stone-950/85 text-center backdrop-blur-sm animate-fade-in">
      <div className="relative">
        <span className="absolute inset-0 animate-pulse-ring rounded-3xl bg-brand-500/40" aria-hidden />
        <span className="absolute inset-0 animate-pulse-ring rounded-3xl bg-brand-500/30 [animation-delay:0.6s]" aria-hidden />
        <LogoMark className="relative size-16" />
      </div>
      <div>
        <p className="text-lg font-semibold text-white">{state === 'connecting' ? `Connecting to ${contactName}…` : 'Reconnecting…'}</p>
        <p className="mt-1 text-sm text-stone-400">
          {state === 'connecting' ? 'Setting up a secure connection and the translation pipeline' : 'Your network dropped. Trying to restore the call.'}
        </p>
      </div>
      <Loader2 className="size-5 animate-spin text-brand-300" aria-hidden />
    </div>
  );
}

/** Warning strip for a degraded connection. */
export function UnstableBanner() {
  return (
    <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-orange-500/90 px-4 py-1.5 text-xs font-medium text-white shadow-lg animate-fade-up" role="alert">
      <WifiOff className="size-3.5" aria-hidden />
      Connection unstable: video quality reduced
    </div>
  );
}
