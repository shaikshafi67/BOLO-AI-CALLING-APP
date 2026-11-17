import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, Languages, Loader2, MessageSquare, Search, UserRound, Users, Video } from 'lucide-react';
import { PageHeader, EmptyState, Segmented } from '../components/ui/Misc';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import { getLanguage } from '../data/languages';
import { userService } from '../services/userService';
import { ApiError } from '../services/api';
import { usePresence } from '../services/presence';
import { rememberPerson, useHistory } from '../hooks/useHistory';
import type { Contact, PresenceStatus } from '../types';
import { formatRelative } from '../utils/format';

type Filter = 'all' | 'online';

const statusLabel: Record<PresenceStatus, string> = { online: 'Online', away: 'Away', busy: 'On a call', offline: 'Offline' };

/**
 * Your contacts are the people you've had calls with (from call history).
 * Searching also looks up everyone registered on BoloAI (GET /api/users/search).
 */
export default function ContactsPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const { contacts, loading, error } = useHistory();
  const [filter, setFilter] = useState<Filter>('all');
  const [viewing, setViewing] = useState<Contact | null>(null);
  const [found, setFound] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const setQuery = (q: string) => setParams(q ? { q } : {}, { replace: true });

  // Look up everyone on BoloAI as the user types (debounced).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setFound([]);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const people = await userService.search(q);
        if (cancelled) return;
        people.forEach(rememberPerson);
        setFound(people);
        setSearchError(null);
      } catch (e) {
        if (!cancelled) setSearchError(e instanceof ApiError && e.code === 'unreachable' ? 'Can’t reach the BoloAI server.' : 'Search failed.');
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const known = new Set(contacts.map((c) => c.id));
  const others = found.filter((p) => !known.has(p.id));
  const presence = usePresence([...contacts, ...others].map((c) => c.id));
  const withStatus = (c: Contact): Contact => ({ ...c, status: presence[c.id] ?? 'offline' });

  const q = query.trim().toLowerCase();
  const visible = contacts
    .map(withStatus)
    .filter((c) => (filter === 'all' || c.status === 'online') && (!q || c.fullName.toLowerCase().includes(q)));
  const onlineCount = contacts.filter((c) => presence[c.id] === 'online').length;

  const call = (c: Contact) => navigate(`/start-call?contact=${c.id}`);
  const message = (c: Contact) => notify(`Chat with ${c.fullName.split(' ')[0]} during a call. Messaging outside calls is coming soon.`, 'info');

  const card = (c: Contact) => {
    const lang = getLanguage(c.preferredLanguage);
    return (
      <li key={c.id} className="card flex flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
        <div className="flex items-start gap-4">
          <Avatar name={c.fullName} size="lg" status={c.status} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-fg">{c.fullName}</p>
            <p className="text-xs text-muted">{statusLabel[c.status]}</p>
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
  };

  return (
    <div>
      <PageHeader
        title="Contacts"
        description={`${contacts.length} ${contacts.length === 1 ? 'person' : 'people'} you’ve talked to · ${onlineCount} online now`}
        actions={
          <Button onClick={() => searchRef.current?.focus()} leftIcon={<Search className="size-4" />}>
            Find people
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input
            ref={searchRef}
            id="contacts-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your contacts, or find anyone on BoloAI by name"
            aria-label="Search contacts"
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-10 text-sm text-fg placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
          />
          {searching && <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-subtle" aria-label="Searching" />}
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

      {(error || searchError) && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error ?? searchError}</p>}

      {visible.length === 0 && others.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users className="size-6" />}
            title={loading ? 'Loading your contacts…' : q ? `No one matches “${query}”` : filter === 'online' ? 'No contacts online' : 'No contacts yet'}
            description={q ? 'Check the spelling, or search by the name they registered with.' : 'People you have calls with appear here. Search above to find anyone on BoloAI.'}
          />
        </div>
      ) : (
        visible.length > 0 && <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(card)}</ul>
      )}

      {others.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold text-fg">Others on BoloAI</h2>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{others.map((c) => card(withStatus(c)))}</ul>
        </section>
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
                { icon: Languages, label: 'Preferred language', value: `${getLanguage(viewing.preferredLanguage).name} · ${getLanguage(viewing.preferredLanguage).nativeName}` },
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
    </div>
  );
}
