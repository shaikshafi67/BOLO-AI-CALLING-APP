import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, Languages, Mail, MapPin, MessageSquare, Search, UserPlus, UserRound, Users, Video } from 'lucide-react';
import { PageHeader, EmptyState, Segmented } from '../components/ui/Misc';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/FormControls';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import { contacts as seedContacts } from '../data/contacts';
import { getLanguage } from '../data/languages';
import { userService } from '../services/userService';
import type { Contact, PresenceStatus } from '../types';
import { EMAIL_PATTERN } from '../utils/validation';
import { formatRelative } from '../utils/format';

type Filter = 'all' | 'online';

const statusLabel: Record<PresenceStatus, string> = { online: 'Online', away: 'Away', busy: 'Busy', offline: 'Offline' };

export default function ContactsPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [items, setItems] = useState<Contact[]>(seedContacts);
  const [filter, setFilter] = useState<Filter>('all');
  const [viewing, setViewing] = useState<Contact | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string>();

  const setQuery = (q: string) => setParams(q ? { q } : {}, { replace: true });

  const visible = items.filter(
    (c) =>
      (filter === 'all' || c.status === 'online') &&
      (!query || c.fullName.toLowerCase().includes(query.toLowerCase()) || c.email.toLowerCase().includes(query.toLowerCase())),
  );

  const call = (c: Contact) => navigate(`/start-call?contact=${c.id}`);
  const message = (c: Contact) => notify(`Messaging ${c.fullName.split(' ')[0]} is coming soon.`, 'info');

  const addContact = async (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(newEmail)) {
      setAddError('Enter a valid email address.');
      return;
    }
    if (items.some((c) => c.email.toLowerCase() === newEmail.toLowerCase())) {
      setAddError('This person is already in your contacts.');
      return;
    }
    setAdding(true);
    const contact = await userService.addContact(newEmail);
    setItems((prev) => [contact, ...prev]);
    setAdding(false);
    setAddOpen(false);
    setNewEmail('');
    notify(`Contact request sent to ${newEmail}.`, 'success');
  };

  return (
    <div>
      <PageHeader
        title="Contacts"
        description={`${items.length} people · ${items.filter((c) => c.status === 'online').length} online now`}
        actions={
          <Button onClick={() => setAddOpen(true)} leftIcon={<UserPlus className="size-4" />}>
            Add Contact
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts by name or email"
            aria-label="Search contacts"
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-4 text-sm text-fg placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
          />
        </div>
        <Segmented<Filter>
          ariaLabel="Filter contacts"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'online', label: 'Online' },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users className="size-6" />}
            title={query ? `No contacts match “${query}”` : 'No contacts online'}
            description="Try another search, or add someone new."
            action={
              <Button variant="outline" onClick={() => setAddOpen(true)} leftIcon={<UserPlus className="size-4" />}>
                Add Contact
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => {
            const lang = getLanguage(c.preferredLanguage);
            return (
              <li key={c.id} className="card flex flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start gap-4">
                  <Avatar name={c.fullName} size="lg" status={c.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-fg">{c.fullName}</p>
                    <p className="text-xs text-muted">{statusLabel[c.status]}{c.location && ` · ${c.location}`}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone="brand" icon={<Languages className="size-3" />}>
                        {lang.name}
                      </Badge>
                    </div>
                  </div>
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-subtle">
                  <Clock className="size-3.5" aria-hidden />
                  {c.lastCallAt ? `Last call ${formatRelative(c.lastCallAt)}` : 'No calls yet'}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
                  <Button size="sm" onClick={() => call(c)} leftIcon={<Video className="size-3.5" />} aria-label={`Call ${c.fullName}`}>
                    Call
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => message(c)} leftIcon={<MessageSquare className="size-3.5" />} aria-label={`Message ${c.fullName}`}>
                    <span className="hidden sm:inline">Message</span>
                    <span className="sm:hidden">Chat</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setViewing(c)} leftIcon={<UserRound className="size-3.5" />} aria-label={`View ${c.fullName}’s profile`}>
                    Profile
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* View profile */}
      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title="Contact profile"
        footer={
          viewing && (
            <>
              <Button variant="outline" onClick={() => message(viewing)} leftIcon={<MessageSquare className="size-4" />}>
                Message
              </Button>
              <Button onClick={() => call(viewing)} leftIcon={<Video className="size-4" />}>
                Call {viewing.fullName.split(' ')[0]}
              </Button>
            </>
          )
        }
      >
        {viewing && (
          <div className="text-center">
            <Avatar name={viewing.fullName} size="xl" status={viewing.status} className="mx-auto" />
            <h3 className="mt-4 text-xl font-semibold text-fg">{viewing.fullName}</h3>
            <p className="text-sm text-muted">{statusLabel[viewing.status]}</p>
            <dl className="mt-6 space-y-3 text-left text-sm">
              {[
                { icon: Mail, label: 'Email', value: viewing.email },
                { icon: Languages, label: 'Preferred language', value: `${getLanguage(viewing.preferredLanguage).name} · ${getLanguage(viewing.preferredLanguage).nativeName}` },
                { icon: MapPin, label: 'Location', value: viewing.location ?? '—' },
                { icon: Clock, label: 'Last call', value: viewing.lastCallAt ? formatRelative(viewing.lastCallAt) : 'No calls yet' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                  <Icon className="size-4 text-subtle" aria-hidden />
                  <dt className="w-36 shrink-0 text-muted">{label}</dt>
                  <dd className="min-w-0 truncate font-medium text-fg">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Modal>

      {/* Add contact */}
      <Modal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setAddError(undefined);
        }}
        title="Add a contact"
        description="Invite someone by email. They’ll get a contact request."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-contact-form" loading={adding} leftIcon={<UserPlus className="size-4" />}>
              Send request
            </Button>
          </>
        }
      >
        <form id="add-contact-form" onSubmit={addContact} noValidate>
          <Input
            label="Email address"
            type="email"
            placeholder="friend@example.com"
            icon={<Mail className="size-4" />}
            value={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value);
              setAddError(undefined);
            }}
            error={addError}
          />
        </form>
      </Modal>
    </div>
  );
}
