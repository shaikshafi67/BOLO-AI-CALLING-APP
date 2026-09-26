import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Camera,
  Eye,
  Globe,
  KeyRound,
  Languages,
  LogOut,
  Mic,
  Monitor,
  Moon,
  Palette,
  PhoneIncoming,
  ShieldCheck,
  Sun,
  Trash2,
  UserRound,
  Video,
  Volume2,
} from 'lucide-react';
import { PageHeader, Segmented, ComingSoonTag } from '../components/ui/Misc';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select, Toggle } from '../components/ui/FormControls';
import { Modal } from '../components/ui/Modal';
import { CallLanguageSettings } from '../components/call/CallLanguageSettings';
import { LanguageSelect } from '../components/translation/LanguageBits';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCallSettings } from '../context/CallSettingsContext';
import { useToast } from '../context/ToastContext';
import { usePersistentState } from '../hooks/usePersistentState';
import type { LanguageCode, ThemePreference } from '../types';
import { cn } from '../utils/format';

type SectionId = 'account' | 'audio' | 'translation' | 'notifications' | 'privacy' | 'appearance' | 'language';

const sections: { id: SectionId; label: string; icon: typeof UserRound }[] = [
  { id: 'account', label: 'Account', icon: UserRound },
  { id: 'audio', label: 'Audio & Video', icon: Video },
  { id: 'translation', label: 'Translation', icon: Languages },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: ShieldCheck },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'language', label: 'Language', icon: Globe },
];

const defaultPrefs = {
  microphone: 'default',
  speaker: 'default',
  camera: 'default',
  noiseSuppression: true,
  mirrorVideo: true,
  notifyCalls: true,
  notifyMissed: true,
  notifyContacts: true,
  notifySound: true,
  showOnline: true,
  saveTranscripts: false,
  analytics: false,
  appLanguage: 'en' as LanguageCode,
};

export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>('account');
  const [prefs, setPrefs] = usePersistentState('boloai-prefs', defaultPrefs);
  const { preference, setPreference } = useTheme();
  const { user, logout } = useAuth();
  const { reset: resetCall } = useCallSettings();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const setPref = <K extends keyof typeof defaultPrefs>(key: K, value: (typeof defaultPrefs)[K]) => setPrefs({ ...prefs, [key]: value });

  const content: Record<SectionId, ReactNode> = {
    account: (
      <Card>
        <CardHeader title="Account" description="Manage your sign-in and account." icon={<UserRound className="size-5" />} />
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-fg">Email</p>
              <p className="text-sm text-muted">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
              Edit profile
            </Button>
          </div>
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 size-4 text-muted" />
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-fg">
                  Password <ComingSoonTag />
                </p>
                <p className="text-sm text-muted">Password changes will be handled by Firebase Authentication.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => notify('Password change will be available once Firebase Auth is connected.', 'info')}>
              Change password
            </Button>
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row">
            <Button
              variant="outline"
              leftIcon={<LogOut className="size-4" />}
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
            >
              Log out
            </Button>
            <Button variant="dangerGhost" leftIcon={<Trash2 className="size-4" />} onClick={() => setDeleteOpen(true)}>
              Delete account
            </Button>
          </div>
        </div>
      </Card>
    ),
    audio: (
      <Card>
        <CardHeader title="Audio & Video" description="Choose the devices BoloAI uses on calls." icon={<Video className="size-5" />} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Microphone" icon={<Mic className="size-4" />} value={prefs.microphone} onChange={(e) => setPref('microphone', e.target.value)}>
            <option value="default">System default</option>
            <option value="builtin">Built-in microphone</option>
            <option value="headset">Headset microphone</option>
          </Select>
          <Select label="Speaker" icon={<Volume2 className="size-4" />} value={prefs.speaker} onChange={(e) => setPref('speaker', e.target.value)}>
            <option value="default">System default</option>
            <option value="builtin">Built-in speakers</option>
            <option value="headset">Headphones</option>
          </Select>
          <Select label="Camera" icon={<Camera className="size-4" />} value={prefs.camera} onChange={(e) => setPref('camera', e.target.value)}>
            <option value="default">System default</option>
            <option value="builtin">Built-in webcam</option>
            <option value="external">External camera</option>
          </Select>
        </div>
        <p className="mt-2 text-xs text-subtle">Device lists will be read from your browser when WebRTC media is connected.</p>
        <div className="mt-4 divide-y divide-line border-t border-line">
          <Toggle label="Noise suppression" description="Reduce background noise before speech recognition" checked={prefs.noiseSuppression} onChange={(v) => setPref('noiseSuppression', v)} />
          <Toggle label="Mirror my video" description="Show your preview like a mirror" checked={prefs.mirrorVideo} onChange={(v) => setPref('mirrorVideo', v)} />
        </div>
      </Card>
    ),
    translation: (
      <Card>
        <CardHeader title="Translation" description="Default languages and AI features for new calls." icon={<Languages className="size-5" />} />
        <CallLanguageSettings />
        <div className="mt-4 border-t border-line pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              resetCall();
              notify('Call settings reset to defaults.', 'success');
            }}
          >
            Reset to defaults
          </Button>
        </div>
      </Card>
    ),
    notifications: (
      <Card>
        <CardHeader title="Notifications" description="Choose what BoloAI tells you about." icon={<Bell className="size-5" />} />
        <div className="divide-y divide-line">
          <Toggle icon={<PhoneIncoming className="size-4" />} label="Incoming calls" description="Ring and show a notification for new calls" checked={prefs.notifyCalls} onChange={(v) => setPref('notifyCalls', v)} />
          <Toggle label="Missed calls" description="Get notified when you miss a call" checked={prefs.notifyMissed} onChange={(v) => setPref('notifyMissed', v)} />
          <Toggle label="Contact requests" description="When someone wants to add you" checked={prefs.notifyContacts} onChange={(v) => setPref('notifyContacts', v)} />
          <Toggle label="Notification sounds" checked={prefs.notifySound} onChange={(v) => setPref('notifySound', v)} />
        </div>
      </Card>
    ),
    privacy: (
      <Card>
        <CardHeader title="Privacy" description="Control what others see and what BoloAI keeps." icon={<ShieldCheck className="size-5" />} />
        <div className="divide-y divide-line">
          <Toggle icon={<Eye className="size-4" />} label="Show when I’m online" description="Contacts can see your online status" checked={prefs.showOnline} onChange={(v) => setPref('showOnline', v)} />
          <Toggle
            label="Save call transcripts"
            description="Keep translated transcripts in your call history"
            checked={prefs.saveTranscripts}
            onChange={(v) => setPref('saveTranscripts', v)}
            badge={<ComingSoonTag />}
          />
          <Toggle label="Share anonymous usage data" description="Help improve translation quality" checked={prefs.analytics} onChange={(v) => setPref('analytics', v)} />
        </div>
        <p className="mt-4 rounded-xl bg-surface-2 p-3 text-xs text-muted">
          Video and original audio are planned to travel peer-to-peer over encrypted WebRTC. Only audio needed for translation will be sent to the AI
          services.
        </p>
      </Card>
    ),
    appearance: (
      <Card>
        <CardHeader title="Appearance" description="Pick how BoloAI looks. Saved on this device." icon={<Palette className="size-5" />} />
        <Segmented<ThemePreference>
          ariaLabel="Theme"
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'light', label: 'Light', icon: <Sun className="size-4" /> },
            { value: 'dark', label: 'Dark', icon: <Moon className="size-4" /> },
            { value: 'system', label: 'System', icon: <Monitor className="size-4" /> },
          ]}
        />
        <div className="mt-6 grid grid-cols-3 gap-3" aria-hidden>
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              type="button"
              tabIndex={-1}
              onClick={() => setPreference(t)}
              className={cn('overflow-hidden rounded-xl border-2 text-left transition-colors', preference === t ? 'border-brand-500' : 'border-line hover:border-brand-300')}
            >
              <div className={cn('h-20 p-2', t === 'light' ? 'bg-stone-50' : t === 'dark' ? 'bg-stone-900' : 'bg-gradient-to-r from-stone-50 from-50% to-stone-900 to-50%')}>
                <div className={cn('h-2 w-1/2 rounded', t === 'dark' ? 'bg-stone-700' : 'bg-stone-200')} />
                <div className="mt-2 h-2 w-3/4 rounded bg-brand-500/70" />
              </div>
              <p className="px-2 py-1.5 text-xs font-medium capitalize text-fg">{t}</p>
            </button>
          ))}
        </div>
      </Card>
    ),
    language: (
      <Card>
        <CardHeader title="App language" description="Language used for BoloAI’s menus and buttons." icon={<Globe className="size-5" />} />
        <div className="max-w-sm">
          <LanguageSelect
            label="Interface language"
            value={prefs.appLanguage}
            onChange={(v) => {
              setPref('appLanguage', v);
              if (v !== 'en') notify('Interface translations are planned. The app will stay in English for now.', 'info');
            }}
            allowPlanned
          />
        </div>
        <p className="mt-3 text-xs text-subtle">This is separate from your call languages, which you can set under Translation.</p>
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => setActive('translation')}>
            Go to call languages
          </Button>
        </div>
      </Card>
    ),
  };

  return (
    <div>
      <PageHeader title="Settings" description="Preferences are saved automatically on this device." />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Settings sections" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
          <ul className="flex gap-1 lg:sticky lg:top-24 lg:flex-col">
            {sections.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setActive(id)}
                  aria-current={active === id ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    active === id ? 'bg-surface text-brand-700 shadow-soft ring-1 ring-line dark:text-brand-200' : 'text-muted hover:bg-surface hover:text-fg',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div key={active} className="min-w-0 animate-fade-up">
          {content[active]}
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete account?"
        description="This would permanently delete your profile, contacts and call history."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteOpen(false);
                notify('Account deletion is disabled in the prototype.', 'warning');
              }}
            >
              Delete account
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">Account deletion needs the backend and is disabled in this prototype. Nothing will be removed.</p>
      </Modal>
    </div>
  );
}
