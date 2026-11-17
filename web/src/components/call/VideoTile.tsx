import { useEffect, useRef } from 'react';
import { MicOff, VideoOff } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { VoiceWave } from '../translation/TranslationStatusIndicator';
import { cn } from '../../utils/format';

interface VideoTileProps {
  name: string;
  subtitle?: string;
  /** Show the video (false shows the avatar). */
  cameraOn: boolean;
  muted?: boolean;
  speaking?: boolean;
  size?: 'main' | 'pip';
  /** The participant's camera (or shared screen) from WebRTC. */
  stream?: MediaStream | null;
  /** Mirror like a selfie (your own preview). */
  mirror?: boolean;
  /** Show the whole picture instead of filling the tile (shared screens). */
  contain?: boolean;
  /** Must include positioning (e.g. "absolute inset-0" or "relative aspect-video"). */
  className: string;
}

/** A participant's video. Sound plays separately (see RemoteAudio), so the video is always muted. */
export function VideoTile({ name, subtitle, cameraOn, muted, speaking, size = 'main', stream, mirror, contain, className }: VideoTileProps) {
  const isMain = size === 'main';
  const videoRef = useRef<HTMLVideoElement>(null);
  const showVideo = cameraOn && !!stream;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== (stream ?? null)) el.srcObject = stream ?? null;
    if (stream) el.play().catch(() => undefined);
  }, [stream, showVideo]);

  return (
    <div className={cn('overflow-hidden bg-stone-900', className)}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        hidden={!showVideo}
        className={cn('absolute inset-0 size-full', contain ? 'object-contain' : 'object-cover', mirror && '-scale-x-100')}
        aria-label={`${name}'s video`}
      />
      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-900">
          <Avatar name={name} size={isMain ? 'xl' : 'sm'} className={cn('rounded-full', speaking && 'ring-4 ring-accent-400/80')} />
          {isMain && !cameraOn && (
            <p className="flex items-center gap-2 text-sm text-stone-400">
              <VideoOff className="size-4" aria-hidden /> Camera is off
            </p>
          )}
        </div>
      )}

      {/* Speaking outline */}
      {speaking && showVideo && <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-inset ring-accent-400" aria-hidden />}

      <div
        className={cn(
          'absolute flex items-center gap-2 rounded-md bg-black/55 text-white backdrop-blur-sm',
          isMain ? 'left-4 top-4 px-2.5 py-1 text-sm' : 'bottom-2 left-2 px-2 py-0.5 text-[11px]',
        )}
      >
        {muted ? <MicOff className="size-3.5 text-red-400" aria-label="Muted" /> : speaking && <VoiceWave className="text-accent-300" bars={3} />}
        <span className="font-medium">{name}</span>
        {isMain && subtitle && <span className="hidden text-white/60 sm:inline">· {subtitle}</span>}
      </div>
    </div>
  );
}

/** Plays the other person's voice. Reports when the browser blocks sound until a click. */
export function RemoteAudio({ stream, muted, volume, onBlocked }: { stream: MediaStream | null; muted: boolean; volume: number; onBlocked: (blocked: boolean) => void }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) el.play().then(() => onBlocked(false), () => onBlocked(true));
  }, [stream, onBlocked]);

  useEffect(() => {
    if (ref.current) ref.current.volume = volume;
  }, [volume]);

  return <audio ref={ref} autoPlay muted={muted} hidden />;
}
