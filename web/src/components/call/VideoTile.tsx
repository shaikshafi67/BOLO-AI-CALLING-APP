import { MicOff, VideoOff } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { VoiceWave } from '../translation/TranslationStatusIndicator';
import { cn } from '../../utils/format';

interface VideoTileProps {
  name: string;
  subtitle?: string;
  cameraOn: boolean;
  muted?: boolean;
  speaking?: boolean;
  size?: 'main' | 'pip';
  /** Demo footage standing in for the WebRTC stream. */
  videoSrc?: string;
  /** Still image (e.g. a poster frame) used when there's no video. */
  imageSrc?: string;
  /** Must include positioning (e.g. "absolute inset-0" or "relative aspect-video"). */
  className: string;
}

/**
 * A participant's video. When WebRTC is connected, attach the remote
 * MediaStream to the <video> (srcObject) instead of the demo footage.
 */
export function VideoTile({ name, subtitle, cameraOn, muted, speaking, size = 'main', videoSrc, imageSrc, className }: VideoTileProps) {
  const isMain = size === 'main';
  const hasMedia = !!(videoSrc || imageSrc);

  return (
    <div className={cn('overflow-hidden bg-stone-900', className)}>
      {cameraOn && hasMedia ? (
        videoSrc ? (
          <video
            src={videoSrc}
            poster={imageSrc}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 size-full object-cover"
            aria-label={`${name}'s video`}
          />
        ) : (
          <img src={imageSrc} alt="" className="absolute inset-0 size-full object-cover" />
        )
      ) : cameraOn ? (
        // No footage for this contact: plain placeholder until WebRTC provides a stream.
        <div className="absolute inset-0 flex items-center justify-center bg-stone-800">
          <Avatar name={name} size={isMain ? '2xl' : 'md'} className={cn('rounded-full', speaking && 'ring-4 ring-accent-400/80')} />
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-900">
          <Avatar name={name} size={isMain ? 'xl' : 'sm'} />
          {isMain && (
            <p className="flex items-center gap-2 text-sm text-stone-400">
              <VideoOff className="size-4" aria-hidden /> Camera is off
            </p>
          )}
        </div>
      )}

      {/* Speaking outline */}
      {speaking && cameraOn && <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-inset ring-accent-400" aria-hidden />}

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
