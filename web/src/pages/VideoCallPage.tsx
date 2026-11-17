import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Captions,
  CaptionsOff,
  Languages,
  MessageSquare,
  MessageSquareText,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Send,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CallTopBar } from '../components/call/CallTopBar';
import { RemoteAudio, VideoTile } from '../components/call/VideoTile';
import { ControlButton } from '../components/call/ControlButton';
import { CaptionOverlay } from '../components/call/CaptionOverlay';
import { ConnectingOverlay, UnstableBanner } from '../components/call/ConnectionOverlay';
import { MoreMenu } from '../components/call/MoreMenu';
import { CallEndedScreen } from '../components/call/CallEndedScreen';
import { TranslationPanel } from '../components/translation/TranslationPanel';
import { Button } from '../components/ui/Button';
import { LogoMark } from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
import { useCallSettings } from '../context/CallSettingsContext';
import { useToast } from '../context/ToastContext';
import { useCallTimer } from '../hooks/useCallTimer';
import { useCallSession } from '../hooks/useCallSession';
import { CallSession, type ChatMessage } from '../services/callSession';
import { getLanguage } from '../data/languages';
import type { LanguageCode } from '../types';
import { ROOM_CODE_PATTERN, cn } from '../utils/format';

interface CallSummary {
  seconds: number;
  lines: number;
  contactName: string;
}

/** Joins [roomCode] once, even when React runs the effect twice (StrictMode). */
let pendingJoin: { roomCode: string; promise: Promise<CallSession> } | null = null;
function joinOnce(roomCode: string, language: LanguageCode): Promise<CallSession> {
  if (CallSession.active?.roomCode === roomCode) return Promise.resolve(CallSession.active);
  if (pendingJoin?.roomCode !== roomCode) {
    const promise = CallSession.join(roomCode, language).finally(() => {
      if (pendingJoin?.promise === promise) pendingJoin = null;
    });
    pendingJoin = { roomCode, promise };
  }
  return pendingJoin.promise;
}

/** Sessions shown on screen; one that stays off screen briefly is hung up. */
const mounted = new Set<CallSession>();

/** Route wrapper: swaps between the live call and the "call ended" screen. */
export default function VideoCallPage() {
  const { callId = '' } = useParams();
  const [attempt, setAttempt] = useState(0);
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
          setAttempt((a) => a + 1);
        }}
      />
    );
  }
  return <CallRoom key={attempt} roomCode={callId} onEnd={setSummary} />;
}

function CallRoom({ roomCode, onEnd }: { roomCode: string; onEnd: (s: CallSummary) => void }) {
  const { settings } = useCallSettings();
  const [session, setSession] = useState<CallSession | null>(() => (CallSession.active?.roomCode === roomCode ? CallSession.active : null));
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Opened from a link, a refresh or "Rejoin": join the room now.
  useEffect(() => {
    if (session) return;
    let cancelled = false;
    joinOnce(roomCode, settings.myLanguage)
      .then((s) => !cancelled && setSession(s))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [session, roomCode, settings.myLanguage]);

  // Leaving the page hangs up (after a moment, so StrictMode's remount doesn't).
  useEffect(() => {
    if (!session) return;
    mounted.add(session);
    return () => {
      mounted.delete(session);
      setTimeout(() => {
        if (!mounted.has(session)) void session.leave();
      }, 500);
    };
  }, [session]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-stone-950 px-6 text-center text-white">
        <LogoMark className="size-14" />
        <div>
          <h1 className="text-xl font-semibold">Couldn’t join {roomCode}</h1>
          <p className="mt-2 max-w-md text-sm text-stone-400">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="inverse" onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </Button>
          <Button variant="onBrand" onClick={() => navigate('/join-call')}>
            Enter another code
          </Button>
        </div>
      </div>
    );
  }
  if (!session) return <ConnectingScreen roomCode={roomCode} />;
  return <LiveCall session={session} onEnd={onEnd} />;
}

function ConnectingScreen({ roomCode }: { roomCode: string }) {
  return (
    <div className="relative flex h-dvh items-center justify-center bg-stone-950 text-white">
      <ConnectingOverlay state="connecting" contactName={`room ${roomCode}`} />
    </div>
  );
}

function LiveCall({ session, onEnd }: { session: CallSession; onEnd: (s: CallSummary) => void }) {
  useCallSession(session);
  const { user } = useAuth();
  const { settings } = useCallSettings();
  const { notify } = useToast();
  const [captionsOn, setCaptionsOn] = useState(settings.liveCaptions);
  const [panel, setPanel] = useState<'translation' | 'chat' | null>(() => (window.innerWidth >= 1024 ? 'translation' : null));
  const [audioKey, setAudioKey] = useState(0);
  const lastName = useRef('your contact');

  // Start with the mic and camera chosen before the call; show camera problems once.
  useEffect(() => {
    session.voiceTranslation = settings.voiceTranslation;
    session.setMic(settings.micEnabled);
    if (!settings.cameraEnabled) void session.setCamera(false);
    if (session.cameraProblem) notify(session.cameraProblem, 'warning');
    // Once per call: later changes to the settings don't override the call's controls.
  }, [session]);

  useEffect(() => session.onNotice((m) => notify(m, 'info')), [session, notify]);

  const connected = session.state === 'connected' || session.state === 'unstable';
  const seconds = useCallTimer(connected);
  if (session.peer) lastName.current = session.peer.name;

  const finish = useCallback(() => {
    onEnd({ seconds, lines: session.transcript.length, contactName: lastName.current });
  }, [onEnd, seconds, session]);

  // The call ended without us (declined, unanswered, connection lost).
  useEffect(() => {
    if (session.state === 'ended') finish();
  }, [session.state, finish]);

  const endCall = async () => {
    await session.leave();
    finish();
  };

  const status = session.translationStatus;
  const current = session.caption;
  const inCall = connected && !!session.peer;
  const remoteSpeaking = inCall && status === 'processing' && !current?.isLocal;
  const localSpeaking = inCall && session.micOn && status === 'processing' && !!current?.isLocal;
  const remoteHasVideo =
    (session.peerCameraOn || session.peerSharing) && !!session.remoteStream?.getVideoTracks().some((t) => !t.muted && t.readyState === 'live');
  const remoteName = session.peer?.name ?? 'Waiting for someone';
  const showOverlay = session.waiting || session.state === 'reconnecting' || (session.state === 'connecting' && !!session.peer);
  const onAudioBlocked = useCallback((blocked: boolean) => session.setAudioBlocked(blocked), [session]);

  const toggleTranslate = () => {
    notify(session.translationEnabled ? 'Translation paused. You’ll hear original audio only.' : 'Translation resumed.', 'info');
    session.setTranslationEnabled(!session.translationEnabled);
  };
  const togglePanel = (p: 'translation' | 'chat') => setPanel((cur) => (cur === p ? null : p));

  // Keyboard shortcuts: M = mic, V = camera, C = captions, T = translation panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || target.closest('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      if (k === 'm') session.setMic(!session.micOn);
      else if (k === 'v') void session.setCamera(!session.cameraOn);
      else if (k === 'c') setCaptionsOn((c) => !c);
      else if (k === 't') setPanel((p) => (p === 'translation' ? null : 'translation'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session]);

  const sidePanel = (onClose?: () => void) =>
    panel === 'chat' ? (
      <ChatPanel messages={session.messages} onSend={(t) => session.sendChat(t)} onClose={onClose ?? (() => setPanel(null))} canSend={!!session.peer} />
    ) : (
      <TranslationPanel
        entries={session.transcript}
        current={current}
        status={status}
        sourceLanguage={session.language}
        targetLanguage={session.peer?.language ?? settings.targetLanguage}
        onClose={onClose}
      />
    );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-stone-950 text-white">
      <RemoteAudio key={audioKey} stream={session.remoteStream} muted={!session.speakerOn} volume={session.remoteVolume} onBlocked={onAudioBlocked} />
      <CallTopBar roomCode={session.roomCode} connection={session.state} from={session.language} to={session.peer?.language ?? settings.targetLanguage} seconds={seconds} />

      <div className="flex min-h-0 flex-1">
        {/* Video stage */}
        <main className="relative min-w-0 flex-1 px-2 pb-2 sm:px-3">
          <div className="relative h-full overflow-hidden rounded-2xl ring-1 ring-white/10">
            <VideoTile
              name={remoteName}
              subtitle={session.peer ? `Speaks ${getLanguage(session.peer.language).name}` : `Room ${session.roomCode}`}
              cameraOn={remoteHasVideo}
              stream={session.remoteStream}
              contain={session.peerSharing}
              muted={!!session.peer && !session.peerMicOn}
              speaking={remoteSpeaking}
              className="absolute inset-0"
            />

            {showOverlay && (
              <ConnectingOverlay
                state={session.state === 'reconnecting' ? 'reconnecting' : 'connecting'}
                contactName={session.peer?.name}
                ringingName={session.ringingName}
              />
            )}
            {session.state === 'unstable' && <UnstableBanner />}

            {session.audioBlocked && inCall && (
              <button
                type="button"
                onClick={() => {
                  void session.unlockAudio();
                  setAudioKey((k) => k + 1);
                }}
                className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium shadow-lg"
              >
                <Volume2 className="size-4" aria-hidden /> Click to hear {remoteName}
              </button>
            )}

            {!session.micOn && inCall && session.state !== 'unstable' && !session.audioBlocked && (
              <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-red-600/90 px-4 py-1.5 text-xs font-medium shadow-lg animate-fade-up" role="status">
                <MicOff className="size-3.5" aria-hidden /> You’re muted
              </div>
            )}

            {inCall && status === 'unavailable' && (
              <div className="absolute left-4 right-4 top-16 z-10 mx-auto max-w-md rounded-2xl bg-stone-900/90 p-3 text-center text-xs text-stone-300 ring-1 ring-red-400/30 backdrop-blur animate-fade-up sm:top-4 sm:left-auto sm:right-4 sm:mx-0" role="alert">
                <span className="font-semibold text-red-300">Translation unavailable.</span> The call continues with original audio.
              </div>
            )}

            {inCall && captionsOn && session.translationEnabled && <CaptionOverlay current={current} status={status} />}

            {/* Local preview: top-right on phones (clear of captions), bottom-right above captions on larger screens */}
            <div className="absolute right-3 top-3 z-20 w-24 overflow-hidden rounded-2xl shadow-2xl ring-2 ring-white/15 sm:top-auto sm:right-4 sm:bottom-28 sm:w-44 md:w-52">
              <VideoTile
                name={user?.fullName ?? 'You'}
                cameraOn={session.cameraOn && session.hasLocalVideo}
                stream={session.localStream}
                mirror
                muted={!session.micOn}
                speaking={localSpeaking}
                size="pip"
                className="relative aspect-[3/4] sm:aspect-video"
              />
            </div>
          </div>
        </main>

        {/* Desktop side panel */}
        {panel && (
          <aside className="hidden w-[380px] shrink-0 overflow-hidden border-l border-white/10 animate-slide-in-right lg:block">{sidePanel()}</aside>
        )}
      </div>

      {/* Mobile/tablet drawer */}
      {panel && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={panel === 'chat' ? 'Chat' : 'Live translation'}>
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setPanel(null)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 h-[78dvh] overflow-hidden rounded-t-3xl animate-slide-up">
            <div className="absolute left-1/2 top-2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20" aria-hidden />
            {sidePanel(() => setPanel(null))}
          </div>
        </div>
      )}

      {/* Controls */}
      <footer className="shrink-0 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:px-4">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 sm:gap-3">
          <ControlButton
            label={session.micOn ? 'Mute microphone (M)' : 'Unmute microphone (M)'}
            icon={session.micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
            state={session.micOn ? 'on' : 'off'}
            onClick={() => session.setMic(!session.micOn)}
            ariaPressed={!session.micOn}
          />
          <ControlButton
            label={session.cameraOn && session.hasLocalVideo ? 'Turn camera off (V)' : 'Turn camera on (V)'}
            icon={session.cameraOn && session.hasLocalVideo ? <Video className="size-5" /> : <VideoOff className="size-5" />}
            state={session.cameraOn && session.hasLocalVideo ? 'on' : 'off'}
            onClick={() => void session.setCamera(!(session.cameraOn && session.hasLocalVideo))}
            ariaPressed={!session.cameraOn}
          />
          <ControlButton
            label={session.speakerOn ? 'Mute speaker' : 'Unmute speaker'}
            icon={session.speakerOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            state={session.speakerOn ? 'on' : 'off'}
            onClick={() => session.setSpeaker(!session.speakerOn)}
            ariaPressed={!session.speakerOn}
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
            label={session.translationEnabled ? 'Pause translation' : 'Resume translation'}
            icon={<Languages className="size-5" />}
            state={session.translationEnabled ? 'active' : 'neutral'}
            onClick={toggleTranslate}
            ariaPressed={session.translationEnabled}
            className="hidden sm:inline-flex"
          />
          <ControlButton
            label={panel === 'translation' ? 'Hide translation panel (T)' : 'Show translation panel (T)'}
            icon={<MessageSquareText className="size-5" />}
            state={panel === 'translation' ? 'active' : 'neutral'}
            onClick={() => togglePanel('translation')}
            ariaPressed={panel === 'translation'}
          />
          <ControlButton
            label={panel === 'chat' ? 'Hide chat' : 'Chat'}
            icon={<MessageSquare className="size-5" />}
            state={panel === 'chat' ? 'active' : 'neutral'}
            onClick={() => togglePanel('chat')}
            ariaPressed={panel === 'chat'}
            className="hidden sm:inline-flex"
          />
          <ControlButton
            label={session.sharing ? 'Stop sharing' : 'Share screen'}
            icon={<MonitorUp className="size-5" />}
            state={session.sharing ? 'active' : 'neutral'}
            onClick={() => void session.toggleScreenShare()}
            className="hidden sm:inline-flex"
          />
          <MoreMenu
            speakerOn={session.speakerOn}
            onToggleSpeaker={() => session.setSpeaker(!session.speakerOn)}
            onScreenShare={() => void session.toggleScreenShare()}
            onChat={() => togglePanel('chat')}
          />
          <ControlButton label="End call" icon={<PhoneOff className="size-5" />} variant="danger" onClick={endCall} className="ml-1 inline-flex sm:ml-3" />
        </div>
      </footer>
    </div>
  );
}

/** In-call chat with the other person (works with the Flutter app too). */
function ChatPanel({ messages, onSend, onClose, canSend }: { messages: ChatMessage[]; onSend: (text: string) => void; onClose: () => void; canSend: boolean }) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <section aria-label="Chat" className="flex h-full flex-col bg-stone-900 text-stone-100">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Chat</h2>
        <button type="button" onClick={onClose} aria-label="Close chat" className="rounded-lg p-1.5 text-stone-400 hover:bg-white/10 hover:text-white">
          <X className="size-4" />
        </button>
      </header>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && <p className="text-center text-sm text-stone-500">No messages yet.</p>}
        {messages.map((m) => (
          <div key={m.at + m.text} className={cn('flex flex-col', m.mine ? 'items-end' : 'items-start')}>
            <span className="mb-1 text-[11px] text-stone-500">{m.name}</span>
            <p className={cn('max-w-[85%] rounded-2xl px-3.5 py-2 text-sm', m.mine ? 'bg-brand-600 text-white' : 'bg-white/10 text-stone-100')}>{m.text}</p>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-3">
        <input
          id="call-chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={canSend ? 'Type a message' : 'You can chat once someone joins'}
          disabled={!canSend}
          maxLength={1000}
          className="min-w-0 flex-1 rounded-xl bg-white/10 px-3.5 py-2 text-sm text-white placeholder:text-stone-500 focus:outline-2 focus:outline-brand-400 disabled:opacity-50"
        />
        <button type="submit" disabled={!canSend || !text.trim()} aria-label="Send message" className="flex size-10 items-center justify-center rounded-xl bg-brand-600 disabled:opacity-40">
          <Send className="size-4" />
        </button>
      </form>
    </section>
  );
}
