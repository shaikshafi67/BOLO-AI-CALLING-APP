import { useState } from 'react';
import { Check, Clock, Copy, Lock } from 'lucide-react';
import type { ConnectionState, LanguageCode } from '../../types';
import { LogoMark } from '../ui/Logo';
import { LanguagePair } from '../translation/LanguageBits';
import { ConnectionStatus } from './ConnectionOverlay';
import { formatDuration } from '../../utils/format';

interface CallTopBarProps {
  roomCode: string;
  connection: ConnectionState;
  from: LanguageCode;
  to: LanguageCode;
  seconds: number;
}

export function CallTopBar({ roomCode, connection, from, to, seconds }: CallTopBarProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the code is visible anyway */
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 px-3 sm:h-16 sm:px-5">
      <LogoMark className="size-8" />
      <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          onClick={copy}
          className="group inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-white"
          aria-label={`Copy room code ${roomCode}`}
          title="Copy room code"
        >
          <Lock className="size-3.5 text-emerald-400" aria-hidden />
          <span className="font-mono tracking-wide">{roomCode}</span>
          {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 text-stone-500 group-hover:text-stone-300" />}
        </button>
        <ConnectionStatus state={connection} className="text-[11px] sm:text-xs" />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <span className="hidden items-center gap-1.5 rounded-full bg-brand-500/20 px-3 py-1 text-xs font-medium text-brand-200 sm:inline-flex">
          <LanguagePair from={from} to={to} className="text-xs" />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-mono text-xs font-medium tabular-nums text-white" aria-label="Call duration">
          <Clock className="size-3.5 text-stone-400" aria-hidden />
          {formatDuration(seconds)}
        </span>
      </div>
    </header>
  );
}
