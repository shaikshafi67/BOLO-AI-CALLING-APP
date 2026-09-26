import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, ShieldCheck, UserRound, Video } from 'lucide-react';
import { PageHeader, PrototypeNotice } from '../components/ui/Misc';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Select } from '../components/ui/FormControls';
import { CameraPreview } from '../components/call/CameraPreview';
import { CallLanguageSettings } from '../components/call/CallLanguageSettings';
import { useAuth } from '../context/AuthContext';
import { useCallSettings } from '../context/CallSettingsContext';
import { useToast } from '../context/ToastContext';
import { callService } from '../services/callService';
import { contacts } from '../data/contacts';
import { getLanguage } from '../data/languages';

export default function StartCallPage() {
  const { user } = useAuth();
  const { settings, update } = useCallSettings();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [contactId, setContactId] = useState(() => params.get('contact') ?? '');
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    const roomCode = await callService.createRoom(settings);
    navigate(`/call/${roomCode}`, { state: { contactId: contactId || undefined, isHost: true } });
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join-call`);
      notify('Invite link copied. Share the room code once your call starts.', 'success');
    } catch {
      notify('Clipboard is not available in this browser.', 'warning');
    }
  };

  return (
    <div>
      <PageHeader title="Start a call" description="Check your camera and mic, choose your languages, then start." />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <CameraPreview
            name={user?.fullName ?? 'You'}
            cameraOn={settings.cameraEnabled}
            micOn={settings.micEnabled}
            speakerOn={settings.speakerEnabled}
            onToggleCamera={() => update({ cameraEnabled: !settings.cameraEnabled })}
            onToggleMic={() => update({ micEnabled: !settings.micEnabled })}
            onToggleSpeaker={() => update({ speakerEnabled: !settings.speakerEnabled })}
          />
          <div className="flex items-center gap-2 text-xs text-muted">
            <ShieldCheck className="size-4 text-emerald-500" aria-hidden />
            Your camera preview stays on this device. Nothing is recorded or uploaded.
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Who are you calling?" description="Optional. You can also share the room code." icon={<UserRound className="size-5" />} />
            <Select value={contactId} onChange={(e) => setContactId(e.target.value)} aria-label="Contact to call">
              <option value="">Anyone with the room code</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} · speaks {getLanguage(c.preferredLanguage).name}
                </option>
              ))}
            </Select>
          </Card>

          <Card>
            <CardHeader title="Language settings" description="How BoloAI should translate your speech." />
            <CallLanguageSettings />
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" fullWidth onClick={start} loading={starting} leftIcon={<Video className="size-5" />}>
              Start Call
            </Button>
            <Button size="lg" variant="outline" onClick={copyInvite} leftIcon={<Copy className="size-4" />} className="sm:w-auto">
              Invite link
            </Button>
          </div>
          <PrototypeNotice>
            The call screen is a working UI demo. Real peer-to-peer video starts once the WebRTC signaling server is connected.
          </PrototypeNotice>
        </div>
      </div>
    </div>
  );
}
