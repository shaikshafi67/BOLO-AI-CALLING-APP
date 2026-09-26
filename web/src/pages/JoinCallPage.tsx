import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardPaste, Hash, LogIn } from 'lucide-react';
import { PageHeader, PrototypeNotice } from '../components/ui/Misc';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/FormControls';
import { CameraPreview } from '../components/call/CameraPreview';
import { CallLanguageSettings } from '../components/call/CallLanguageSettings';
import { useAuth } from '../context/AuthContext';
import { useCallSettings } from '../context/CallSettingsContext';
import { useToast } from '../context/ToastContext';
import { callService } from '../services/callService';
import { normalizeRoomCode, ROOM_CODE_PATTERN } from '../utils/format';

export default function JoinCallPage() {
  const { user } = useAuth();
  const { settings, update } = useCallSettings();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [joining, setJoining] = useState(false);

  const join = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizeRoomCode(code);
    if (!ROOM_CODE_PATTERN.test(normalized)) {
      setError('Room codes look like BOLO-4829.');
      return;
    }
    setError(undefined);
    setJoining(true);
    await callService.joinRoom(normalized);
    navigate(`/call/${normalized}`);
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const normalized = normalizeRoomCode(text);
      setCode(normalized);
      setError(ROOM_CODE_PATTERN.test(normalized) ? undefined : 'Clipboard doesn’t contain a valid room code.');
    } catch {
      notify('Clipboard access was blocked. Paste the code manually.', 'warning');
    }
  };

  return (
    <div>
      <PageHeader title="Join a BoloAI Call" description="Enter the room code you received to join the conversation." />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2 lg:order-2">
          <Card>
            <form onSubmit={join} noValidate className="space-y-4">
              <Input
                label="Call ID / Room Code"
                placeholder="BOLO-4829"
                icon={<Hash className="size-4" />}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                error={error}
                className="font-mono text-base tracking-wider"
                autoComplete="off"
                autoFocus
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" size="lg" fullWidth loading={joining} leftIcon={<LogIn className="size-5" />}>
                  Join Call
                </Button>
                <Button type="button" size="lg" variant="outline" onClick={paste} leftIcon={<ClipboardPaste className="size-4" />} className="sm:w-auto">
                  Paste
                </Button>
              </div>
            </form>
          </Card>
          <Card>
            <h2 className="mb-4 text-base font-semibold text-fg">Your languages</h2>
            <CallLanguageSettings showToggles={false} />
          </Card>
          <PrototypeNotice>Any code in the format BOLO-1234 opens the demo call screen. Room lookup needs the signaling server.</PrototypeNotice>
        </div>

        <div className="lg:col-span-3 lg:order-1">
          <CameraPreview
            name={user?.fullName ?? 'You'}
            cameraOn={settings.cameraEnabled}
            micOn={settings.micEnabled}
            onToggleCamera={() => update({ cameraEnabled: !settings.cameraEnabled })}
            onToggleMic={() => update({ micEnabled: !settings.micEnabled })}
          />
        </div>
      </div>
    </div>
  );
}
