import { useEffect, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import {
  Captions,
  CaptionsOff,
  Languages,
  MessageSquareText,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CallTopBar } from '../components/call/CallTopBar';
import { VideoTile } from '../components/call/VideoTile';
import { ControlButton } from '../components/call/ControlButton';
import { CaptionOverlay } from '../components/call/CaptionOverlay';
import { ConnectingOverlay, UnstableBanner } from '../components/call/ConnectionOverlay';
import { MoreMenu, type DemoScenario } from '../components/call/MoreMenu';
import { CallEndedScreen } from '../components/call/CallEndedScreen';
import { TranslationPanel } from '../components/translation/TranslationPanel';
import { useAuth } from '../context/AuthContext';
import { useCallSettings } from '../context/CallSettingsContext';
import { useToast } from '../context/ToastContext';
import { useCallTimer } from '../hooks/useCallTimer';
import { useDemoTranslation } from '../hooks/useDemoTranslation';
import { callService } from '../services/callService';
import { contacts } from '../data/contacts';
import { DEMO_CONTACT_ID, media } from '../data/media';
import { getLanguage } from '../data/languages';
import type { ConnectionState } from '../types';
import { ROOM_CODE_PATTERN } from '../utils/format';

interface CallSummary {
  seconds: number;
  lines: number;
  contactName: string;
}

/** Route wrapper: swaps between the live call and the "call ended" screen. */
export default function VideoCallPage() {
  const { callId = '' } = useParams();
  const [session, setSession] = useState(0);
  const [summary, setSummary] = useState<CallSummary | null>(null);

  if (!ROOM_CODE_PATTERN.test(callId)) return <Navigate to="/join-call" replace />;

  if (summary) {
    return (
      <CallEndedScreen
        contactName={summary.contactName}
        seconds={summary.seconds}
        translatedLines={summary.lines}
        onRejoin={() => {
          setSummary(null);
          setSession((s) => s + 1);
        }}
      />
    );
  }
  return <CallRoom key={session} roomCode={callId} onEnd={setSummary} />;
}

function CallRoom({ roomCode, onEnd }: { roomCode: string; onEnd: (s: CallSummary) => void }) {
  const { user } = useAuth();
  const { settings } = useCallSettings();
  const { notify } = useToast();
  const location = useLocation();
  const contactId = (location.state as { contactId?: string } | null)?.contactId;
  // Default to the demo contact (Marcus, English speaker) whose camera plays stock footage.
  const remote = contacts.find((c) => c.id === contactId) ?? contacts.find((c) => c.id === DEMO_CONTACT_ID)!;
  const remoteMedia = remote.id === DEMO_CONTACT_ID ? media.demoCall : undefined;

  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [scenario, setScenario] = useState<DemoScenario>('normal');
  const [micOn, setMicOn] = useState(settings.micEnabled);
  const [cameraOn, setCameraOn] = useState(settings.cameraEnabled);
  const [speakerOn, setSpeakerOn] = useState(settings.speakerEnabled);
  const [captionsOn, setCaptionsOn] = useState(settings.liveCaptions);
  const [translateOn, setTranslateOn] = useState(true);
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 1024);

  // TODO: Connect WebRTC signaling server. callService.connect currently simulates the handshake.
  useEffect(() => callService.connect(setConnection), []);

  // Presenter scenarios override the connection state for demonstrations.
  const effectiveConnection: ConnectionState =
    connection !== 'connected' ? connection : scenario === 'unstable' ? 'unstable' : scenario === 'reconnecting' ? 'reconnecting' : 'connected';
  const inCall = effectiveConnection === 'connected' || effectiveConnection === 'unstable';

  const seconds = useCallTimer(connection === 'connected');
  const { entries, current, status } = useDemoTranslation({
    active: inCall,
    enabled: translateOn,
    forceUnavailable: scenario === 'translation-unavailable',
  });

  // The demo script uses a fixed remote speaker name; show the actual contact instead.
  const named = entries.map((e) => (e.isLocal ? e : { ...e, speakerName: remote.fullName }));
  const namedCurrent = current && !current.isLocal ? { ...current, speakerName: remote.fullName } : current;
  const remoteSpeaking = inCall && status === 'processing' && !current?.isLocal;
  const localSpeaking = inCall && micOn && status === 'processing' && !!current?.isLocal;

  const endCall = async () => {
    await callService.leaveRoom(roomCode);
    onEnd({ seconds, lines: entries.length, contactName: remote.fullName });
  };

  const toggleTranslate = () => {
    notify(translateOn ? 'Translation paused. You’ll hear original audio only.' : 'Translation resumed.', 'info');
    setTranslateOn(!translateOn);
  };

  const screenShare = () => notify('Screen sharing will be available once WebRTC is connected.', 'info');

  // Keyboard shortcuts: M = mic, V = camera, C = captions, T = translation panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || target.closest('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      if (k === 'm') setMicOn((m) => !m);
      else if (k === 'v') setCameraOn((c) => !c);
      else if (k === 'c') setCaptionsOn((c) => !c);
      else if (k === 't') setPanelOpen((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const panel = (onClose?: () => void) => (
    <TranslationPanel
      entries={named}
      current={namedCurrent}
      status={status}
      sourceLanguage={settings.myLanguage}
      targetLanguage={settings.targetLanguage}
      onClose={onClose}
    />
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-stone-950 text-white">
      <CallTopBar roomCode={roomCode} connection={effectiveConnection} from={settings.myLanguage} to={settings.targetLanguage} seconds={seconds} />

      <div className="flex min-h-0 flex-1">
        {/* Video stage */}
        <main className="relative min-w-0 flex-1 px-2 pb-2 sm:px-3">
          <div className="relative h-full overflow-hidden rounded-2xl ring-1 ring-white/10">
            <VideoTile
              name={remote.fullName}
              subtitle={`Speaks ${getLanguage(remote.preferredLanguage).name}`}
              cameraOn
              videoSrc={remoteMedia?.video}
              imageSrc={remoteMedia?.poster}
              speaking={remoteSpeaking}
              className="absolute inset-0"
            />

            {(effectiveConnection === 'connecting' || effectiveConnection === 'reconnecting') && (
              <ConnectingOverlay state={effectiveConnection} contactName={remote.fullName} />
            )}
            {effectiveConnection === 'unstable' && <UnstableBanner />}

            {!micOn && inCall && effectiveConnection !== 'unstable' && (
              <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-red-600/90 px-4 py-1.5 text-xs font-medium shadow-lg animate-fade-up" role="status">
                <MicOff className="size-3.5" aria-hidden /> You’re muted
              </div>
            )}

            {inCall && status === 'unavailable' && (
              <div className="absolute left-4 right-4 top-16 z-10 mx-auto max-w-md rounded-2xl bg-stone-900/90 p-3 text-center text-xs text-stone-300 ring-1 ring-red-400/30 backdrop-blur animate-fade-up sm:top-4 sm:left-auto sm:right-4 sm:mx-0" role="alert">
                <span className="font-semibold text-red-300">Translation unavailable.</span> The call continues with original audio.
              </div>
            )}

            {inCall && captionsOn && translateOn && <CaptionOverlay current={namedCurrent} status={status} />}

            {/* Local preview: top-right on phones (clear of captions), bottom-right above captions on larger screens */}
            <div className="absolute right-3 top-3 z-20 w-24 overflow-hidden rounded-2xl shadow-2xl ring-2 ring-white/15 sm:top-auto sm:right-4 sm:bottom-28 sm:w-44 md:w-52">
              <VideoTile
                name={user?.fullName ?? 'You'}
                cameraOn={cameraOn}
                muted={!micOn}
                speaking={localSpeaking}
                size="pip"
                className="relative aspect-[3/4] sm:aspect-video"
              />
            </div>
          </div>
        </main>

        {/* Desktop translation panel */}
        {panelOpen && (
          <aside className="hidden w-[380px] shrink-0 overflow-hidden border-l border-white/10 animate-slide-in-right lg:block">
            {panel()}
          </aside>
        )}
      </div>

      {/* Mobile/tablet translation drawer */}
      {panelOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Live translation">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setPanelOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 h-[78dvh] overflow-hidden rounded-t-3xl animate-slide-up">
            <div className="absolute left-1/2 top-2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20" aria-hidden />
            {panel(() => setPanelOpen(false))}
          </div>
        </div>
      )}

      {/* Controls */}
      <footer className="shrink-0 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-4">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 sm:gap-3">
          <ControlButton label={micOn ? 'Mute microphone (M)' : 'Unmute microphone (M)'} icon={micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />} state={micOn ? 'on' : 'off'} onClick={() => setMicOn((m) => !m)} ariaPressed={!micOn} />
          <ControlButton label={cameraOn ? 'Turn camera off (V)' : 'Turn camera on (V)'} icon={cameraOn ? <Video className="size-5" /> : <VideoOff className="size-5" />} state={cameraOn ? 'on' : 'off'} onClick={() => setCameraOn((c) => !c)} ariaPressed={!cameraOn} />
          <ControlButton
            label={speakerOn ? 'Mute speaker' : 'Unmute speaker'}
            icon={speakerOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            state={speakerOn ? 'on' : 'off'}
            onClick={() => setSpeakerOn((s) => !s)}
            ariaPressed={!speakerOn}
            className="hidden sm:inline-flex"
          />
          <ControlButton
            label={captionsOn ? 'Hide captions (C)' : 'Show captions (C)'}
            icon={captionsOn ? <Captions className="size-5" /> : <CaptionsOff className="size-5" />}
            state={captionsOn ? 'active' : 'neutral'}
            onClick={() => setCaptionsOn((c) => !c)}
            ariaPressed={captionsOn}
          />
          <ControlButton
            label={translateOn ? 'Pause translation' : 'Resume translation'}
            icon={<Languages className="size-5" />}
            state={translateOn ? 'active' : 'neutral'}
            onClick={toggleTranslate}
            ariaPressed={translateOn}
            className="hidden sm:inline-flex"
          />
          <ControlButton
            label={panelOpen ? 'Hide translation panel (T)' : 'Show translation panel (T)'}
            icon={<MessageSquareText className="size-5" />}
            state={panelOpen ? 'active' : 'neutral'}
            onClick={() => setPanelOpen((p) => !p)}
            ariaPressed={panelOpen}
          />
          <ControlButton label="Share screen" icon={<MonitorUp className="size-5" />} onClick={screenShare} className="hidden sm:inline-flex" />
          <MoreMenu speakerOn={speakerOn} onToggleSpeaker={() => setSpeakerOn((s) => !s)} onScreenShare={screenShare} scenario={scenario} onScenario={setScenario} />
          <ControlButton label="End call" icon={<PhoneOff className="size-5" />} variant="danger" onClick={endCall} className="ml-1 inline-flex sm:ml-3" />
        </div>
      </footer>
    </div>
  );
}
