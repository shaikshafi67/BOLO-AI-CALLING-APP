import { useRef, useState, type FormEvent } from 'react';
import { Camera, CalendarDays, Globe2, Mail, Pencil, PhoneCall, Save, Languages, UserRound, X } from 'lucide-react';
import { PageHeader } from '../components/ui/Misc';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Input, Select } from '../components/ui/FormControls';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { LanguageSelect } from '../components/translation/LanguageBits';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userService } from '../services/userService';
import { getLanguage } from '../data/languages';
import { dashboardStats } from '../data/stats';
import type { LanguageCode, User } from '../types';
import { EMAIL_PATTERN } from '../utils/validation';

const countries = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates', 'Singapore', 'Germany'];
const MAX_PHOTO_BYTES = 600 * 1024;

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { notify } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<User | null>(user);
  const [emailError, setEmailError] = useState<string>();

  if (!user || !draft) return null;

  const set = <K extends keyof User>(key: K, value: User[K]) => setDraft({ ...draft, [key]: value });

  const cancel = () => {
    setDraft(user);
    setEditing(false);
    setEmailError(undefined);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(draft.email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setSaving(true);
    const next = await userService.updateProfile(user, draft);
    updateUser(next);
    setSaving(false);
    setEditing(false);
    notify('Profile saved.', 'success');
  };

  // Photo is kept in this browser only until file storage is connected.
  const onPhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify('Please choose an image file.', 'warning');
    if (file.size > MAX_PHOTO_BYTES) return notify('Please choose an image under 600 KB.', 'warning');
    const reader = new FileReader();
    reader.onload = () => {
      const next = { ...user, avatarUrl: String(reader.result) };
      updateUser(next);
      setDraft({ ...draft, avatarUrl: next.avatarUrl });
      notify('Profile photo updated (saved in this browser).', 'success');
    };
    reader.readAsDataURL(file);
  };

  const lang = getLanguage(user.preferredLanguage);

  return (
    <div>
      <PageHeader title="Profile" description="How other people see you on BoloAI." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card padded={false} className="overflow-hidden">
          <div className="h-28 gradient-brand" aria-hidden />
          <div className="-mt-14 flex flex-col items-center px-6 pb-6 text-center">
            <div className="relative">
              <Avatar name={user.fullName} src={user.avatarUrl} size="2xl" className="rounded-full ring-4 ring-surface" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-1 right-1 flex size-9 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg ring-4 ring-surface transition-transform hover:scale-105"
                aria-label="Change profile photo"
              >
                <Camera className="size-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </div>
            <h2 className="mt-4 text-xl font-bold text-fg">{user.fullName}</h2>
            <p className="text-sm text-muted">{user.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge tone="brand" icon={<Languages className="size-3" />}>
                {lang.name} speaker
              </Badge>
              <Badge tone="neutral" icon={<Globe2 className="size-3" />}>
                {user.country}
              </Badge>
            </div>
            <dl className="mt-6 grid w-full grid-cols-2 gap-3 border-t border-line pt-6 text-left">
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-subtle">
                  <PhoneCall className="size-3.5" /> Total calls
                </dt>
                <dd className="mt-1 text-lg font-semibold text-fg">{dashboardStats[0].value}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-subtle">
                  <CalendarDays className="size-3.5" /> Member since
                </dt>
                <dd className="mt-1 text-lg font-semibold text-fg">
                  {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Personal information"
            description={editing ? 'Update your details and save.' : 'Your account details.'}
            icon={<UserRound className="size-5" />}
            action={
              !editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)} leftIcon={<Pencil className="size-3.5" />}>
                  Edit Profile
                </Button>
              )
            }
          />
          <form onSubmit={save} noValidate>
            <fieldset disabled={!editing} className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={draft.fullName} onChange={(e) => set('fullName', e.target.value)} icon={<UserRound className="size-4" />} />
              <Input
                label="Email"
                type="email"
                value={draft.email}
                onChange={(e) => {
                  set('email', e.target.value);
                  setEmailError(undefined);
                }}
                icon={<Mail className="size-4" />}
                error={emailError}
              />
              <LanguageSelect label="Preferred language" value={draft.preferredLanguage} onChange={(v: LanguageCode) => set('preferredLanguage', v)} allowPlanned />
              <Select label="Country" value={draft.country} onChange={(e) => set('country', e.target.value)} icon={<Globe2 className="size-4" />}>
                {countries.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </fieldset>
            {editing && (
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={cancel} leftIcon={<X className="size-4" />}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving} leftIcon={<Save className="size-4" />}>
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
