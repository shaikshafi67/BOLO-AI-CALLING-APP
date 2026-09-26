import { Camera, CameraOff, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Tooltip } from '../ui/Tooltip';
import { VoiceWave } from '../translation/TranslationStatusIndicator';
import { useMediaPreview } from '../../hooks/useMediaPreview';
import { cn } from '../../utils/format';

interface CameraPreviewProps {
  name: string;
  cameraOn: boolean;
  micOn: boolean;
  speakerOn?: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onToggleSpeaker?: () => void;
}

/** Pre-call device check: mock preview with an opt-in real camera. */
export function CameraPreview({ name, cameraOn, micOn, speakerOn, onToggleCamera, onToggleMic, onToggleSpeaker }: CameraPreviewProps) {
  const { videoRef, status, start, stop } = useMediaPreview();

  const toggleCamera = () => {
    if (cameraOn && status === 'live') stop();
    onToggleCamera();
  };

  const controlClass = (on: boolean) =>
    cn(
      'flex size-12 items-center justify-center rounded-2xl transition-all active:scale-95',
      on ? 'bg-white/15 text-white backdrop-blur-md hover:bg-white/25' : 'bg-red-500 text-white hover:bg-red-600',
    );

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-stone-900 shadow-lift ring-1 ring-black/5">
      {cameraOn && status === 'live' ? (
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 size-full -scale-x-100 object-cover" aria-label="Your camera preview" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-stone-800">
          <Avatar name={name} size="xl" />
          {cameraOn ? (
            <div className="text-center">
              <p className="text-sm text-stone-300">Camera preview (mock)</p>
              {status === 'denied' && <p className="mt-1 text-xs text-amber-300">Camera permission was blocked. Check your browser settings.</p>}
              {status === 'unsupported' && <p className="mt-1 text-xs text-amber-300">This browser doesn’t support camera access.</p>}
              <button
                type="button"
                onClick={start}
                disabled={status === 'requesting'}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white hover:bg-white/20"
              >
                {status === 'requesting' ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                Use my real camera
              </button>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-stone-400">
              <CameraOff className="size-4" aria-hidden /> Camera is off
            </p>
          )}
        </div>
      )}

      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
        {micOn ? <VoiceWave className="text-emerald-400" bars={3} /> : <MicOff className="size-3.5 text-red-400" />}
        {micOn ? 'Mic is working' : 'Microphone muted'}
      </div>

      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
        <Tooltip label={cameraOn ? 'Turn camera off' : 'Turn camera on'}>
          <button type="button" onClick={toggleCamera} className={controlClass(cameraOn)} aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'} aria-pressed={cameraOn}>
            {cameraOn ? <Camera className="size-5" /> : <CameraOff className="size-5" />}
          </button>
        </Tooltip>
        <Tooltip label={micOn ? 'Mute microphone' : 'Unmute microphone'}>
          <button type="button" onClick={onToggleMic} className={controlClass(micOn)} aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'} aria-pressed={micOn}>
            {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </button>
        </Tooltip>
        {onToggleSpeaker && (
          <Tooltip label={speakerOn ? 'Mute speaker' : 'Unmute speaker'}>
            <button type="button" onClick={onToggleSpeaker} className={controlClass(!!speakerOn)} aria-label={speakerOn ? 'Mute speaker' : 'Unmute speaker'} aria-pressed={speakerOn}>
              {speakerOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
