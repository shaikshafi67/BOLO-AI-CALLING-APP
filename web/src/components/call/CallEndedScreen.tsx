import { Clock, LayoutDashboard, MessageSquareText, PhoneOff, RotateCcw, Star } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { Button, ButtonLink } from '../ui/Button';
import { formatDuration, cn } from '../../utils/format';

interface CallEndedScreenProps {
  contactName: string;
  seconds: number;
  translatedLines: number;
  onRejoin: () => void;
}

export function CallEndedScreen({ contactName, seconds, translatedLines, onRejoin }: CallEndedScreenProps) {
  const [rating, setRating] = useState(0);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-950 px-4 py-10 text-white">
      <div className="w-full max-w-md animate-scale-in text-center">
        <div className="relative mx-auto w-fit">
          <Avatar name={contactName} size="xl" />
          <span className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full bg-red-600 ring-4 ring-stone-950">
            <PhoneOff className="size-4" aria-hidden />
          </span>
        </div>
        <h1 className="mt-6 text-2xl font-bold">Call ended</h1>
        <p className="mt-1 text-stone-400">Your call with {contactName} has ended.</p>

        <dl className="mt-8 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <dt className="flex items-center justify-center gap-1.5 text-xs text-stone-400">
              <Clock className="size-3.5" /> Duration
            </dt>
            <dd className="mt-1 font-mono text-xl font-semibold tabular-nums">{formatDuration(seconds)}</dd>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <dt className="flex items-center justify-center gap-1.5 text-xs text-stone-400">
              <MessageSquareText className="size-3.5" /> Translated lines
            </dt>
            <dd className="mt-1 text-xl font-semibold">{translatedLines}</dd>
          </div>
        </dl>

        <div className="mt-8">
          <p className="text-sm text-stone-300">How was the translation quality?</p>
          <div className="mt-2 flex justify-center gap-1" role="radiogroup" aria-label="Rate translation quality">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onClick={() => setRating(n)}
                className="rounded-lg p-1.5 transition-transform hover:scale-110"
              >
                <Star className={cn('size-7', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-600')} />
              </button>
            ))}
          </div>
          {rating > 0 && <p className="mt-2 animate-fade-in text-xs text-stone-400">Thanks for the feedback!</p>}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button variant="onBrand" size="lg" fullWidth onClick={onRejoin} leftIcon={<RotateCcw className="size-4" />} className="ring-1 ring-white/15">
            Rejoin
          </Button>
          <ButtonLink to="/dashboard" size="lg" fullWidth leftIcon={<LayoutDashboard className="size-4" />}>
            Back to Dashboard
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
