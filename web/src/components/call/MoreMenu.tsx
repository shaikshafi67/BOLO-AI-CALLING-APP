import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleSlash, FlaskConical, MonitorUp, MoreHorizontal, RefreshCw, RotateCcw, Settings, Volume2, VolumeX, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tooltip } from '../ui/Tooltip';
import { cn } from '../../utils/format';

export type DemoScenario = 'normal' | 'unstable' | 'reconnecting' | 'translation-unavailable';

interface MoreMenuProps {
  speakerOn: boolean;
  onToggleSpeaker: () => void;
  onScreenShare: () => void;
  scenario: DemoScenario;
  onScenario: (s: DemoScenario) => void;
}

function Item({ icon, children, onClick, active }: { icon: ReactNode; children: ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/10', active ? 'text-brand-200' : 'text-stone-200')}
    >
      <span className="text-stone-400">{icon}</span>
      <span className="flex-1">{children}</span>
      {active && <span className="size-1.5 rounded-full bg-brand-300" aria-label="active" />}
    </button>
  );
}

export function MoreMenu({ speakerOn, onToggleSpeaker, onScreenShare, scenario, onScenario }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <Tooltip label="More options">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="More options"
          className={cn('flex size-12 items-center justify-center rounded-2xl text-white transition-colors active:scale-95 sm:size-13', open ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20')}
        >
          <MoreHorizontal className="size-5" />
        </button>
      </Tooltip>

      {open && (
        <div role="menu" className="absolute bottom-full right-0 z-40 mb-3 w-72 animate-scale-in rounded-2xl border border-white/10 bg-stone-900/95 p-2 shadow-2xl backdrop-blur-xl">
          <div className="sm:hidden">
            <Item icon={speakerOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />} onClick={pick(onToggleSpeaker)}>
              {speakerOn ? 'Mute speaker' : 'Unmute speaker'}
            </Item>
            <Item icon={<MonitorUp className="size-4" />} onClick={pick(onScreenShare)}>
              Share screen
            </Item>
          </div>
          <Link role="menuitem" to="/settings" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-200 hover:bg-white/10">
            <Settings className="size-4 text-stone-400" /> Call settings
          </Link>

          <div className="my-2 border-t border-white/10" />
          <p className="flex items-center gap-1.5 px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
            <FlaskConical className="size-3.5" /> Presenter demo: simulate state
          </p>
          <Item icon={<WifiOff className="size-4" />} onClick={pick(() => onScenario('unstable'))} active={scenario === 'unstable'}>
            Connection unstable
          </Item>
          <Item icon={<RefreshCw className="size-4" />} onClick={pick(() => onScenario('reconnecting'))} active={scenario === 'reconnecting'}>
            Reconnecting
          </Item>
          <Item icon={<CircleSlash className="size-4" />} onClick={pick(() => onScenario('translation-unavailable'))} active={scenario === 'translation-unavailable'}>
            Translation unavailable
          </Item>
          <Item icon={<RotateCcw className="size-4" />} onClick={pick(() => onScenario('normal'))} active={scenario === 'normal'}>
            Back to normal
          </Item>
        </div>
      )}
    </div>
  );
}
