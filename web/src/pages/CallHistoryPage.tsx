import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Eye, History, Languages, PhoneIncoming, PhoneOutgoing, Search, Video } from 'lucide-react';
import { PageHeader, EmptyState } from '../components/ui/Misc';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/FormControls';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { Tooltip } from '../components/ui/Tooltip';
import { CallStatusBadge } from '../components/call/CallStatusBadge';
import { LanguagePair } from '../components/translation/LanguageBits';
import { calls } from '../data/calls';
import { languages } from '../data/languages';
import type { Call, LanguageCode } from '../types';
import { cn, formatCallDate, formatDuration, formatTime } from '../utils/format';

const PAGE_SIZE = 6;
const dateRanges = [
  { value: 'all', label: 'All time', days: Infinity },
  { value: '7', label: 'Last 7 days', days: 7 },
  { value: '30', label: 'Last 30 days', days: 30 },
  { value: '90', label: 'Last 90 days', days: 90 },
];

export default function CallHistoryPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<LanguageCode | 'all'>('all');
  const [range, setRange] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Call | null>(null);

  const filtered = useMemo(() => {
    const days = dateRanges.find((r) => r.value === range)?.days ?? Infinity;
    const cutoff = Date.now() - days * 86_400_000;
    const q = query.trim().toLowerCase();
    return calls.filter(
      (c) =>
        (!q || c.contact.fullName.toLowerCase().includes(q) || c.roomCode.toLowerCase().includes(q)) &&
        (language === 'all' || c.sourceLanguage === language || c.targetLanguage === language) &&
        new Date(c.startedAt).getTime() >= cutoff,
    );
  }, [query, language, range]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const callAgain = (c: Call) => navigate(`/start-call?contact=${c.contact.id}`);

  return (
    <div>
      <PageHeader title="Call History" description="Every conversation, with the languages you used." />

      <div className="card overflow-hidden">
        {/* Filters */}
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-[1fr_200px_200px]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => resetPage(setQuery)(e.target.value)}
              placeholder="Search by contact or room code"
              aria-label="Search call history"
              className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-4 text-sm text-fg placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
            />
          </div>
          <Select aria-label="Filter by language" icon={<Languages className="size-4" />} value={language} onChange={(e) => resetPage(setLanguage)(e.target.value as LanguageCode | 'all')}>
            <option value="all">All languages</option>
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Filter by date" icon={<CalendarDays className="size-4" />} value={range} onChange={(e) => resetPage(setRange)(e.target.value)}>
            {dateRanges.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<History className="size-6" />}
            title="No calls found"
            description="Try a different search or clear the filters."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('');
                  setLanguage('all');
                  setRange('all');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2/60 text-xs uppercase tracking-wider text-subtle">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-medium">Contact</th>
                    <th scope="col" className="px-6 py-3 font-medium">Language Pair</th>
                    <th scope="col" className="px-6 py-3 font-medium">Date</th>
                    <th scope="col" className="px-6 py-3 font-medium">Duration</th>
                    <th scope="col" className="px-6 py-3 font-medium">Status</th>
                    <th scope="col" className="px-6 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-surface-2/50">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.contact.fullName} size="sm" />
                          <div>
                            <p className="font-medium text-fg">{c.contact.fullName}</p>
                            <p className="font-mono text-xs text-subtle">{c.roomCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-muted"><LanguagePair from={c.sourceLanguage} to={c.targetLanguage} /></td>
                      <td className="px-6 py-3.5 text-muted">
                        {formatCallDate(c.startedAt)}
                        <span className="block text-xs text-subtle">{formatTime(c.startedAt)}</span>
                      </td>
                      <td className="px-6 py-3.5 font-mono tabular-nums text-muted">{c.durationSeconds ? formatDuration(c.durationSeconds) : '—'}</td>
                      <td className="px-6 py-3.5"><CallStatusBadge status={c.status} /></td>
                      <td className="px-6 py-3.5">
                        <div className="flex justify-end gap-1">
                          <Tooltip label="View details">
                            <button type="button" onClick={() => setSelected(c)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label={`View call with ${c.contact.fullName}`}>
                              <Eye className="size-4" />
                            </button>
                          </Tooltip>
                          <Button size="sm" variant="secondary" onClick={() => callAgain(c)} leftIcon={<Video className="size-3.5" />}>
                            Call again
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((c) => (
                <li key={c.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={c.contact.fullName} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold text-fg">{c.contact.fullName}</p>
                        <CallStatusBadge status={c.status} />
                      </div>
                      <LanguagePair from={c.sourceLanguage} to={c.targetLanguage} className="text-xs text-muted" />
                      <p className="mt-0.5 text-xs text-subtle">
                        {formatCallDate(c.startedAt)} · {c.durationSeconds ? formatDuration(c.durationSeconds) : 'No duration'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelected(c)} leftIcon={<Eye className="size-3.5" />}>
                      View
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => callAgain(c)} leftIcon={<Video className="size-3.5" />}>
                      Call again
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row sm:px-6">
            <p className="text-sm text-muted">
              Showing <span className="font-medium text-fg">{(currentPage - 1) * PAGE_SIZE + 1}</span>–
              <span className="font-medium text-fg">{Math.min(currentPage * PAGE_SIZE, filtered.length)}</span> of{' '}
              <span className="font-medium text-fg">{filtered.length}</span> calls
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  aria-current={n === currentPage ? 'page' : undefined}
                  className={cn(
                    'size-9 rounded-lg text-sm font-medium transition-colors',
                    n === currentPage ? 'bg-brand-600 text-white dark:bg-brand-500' : 'text-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === pageCount}
                className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </nav>
        )}
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Call details"
        footer={
          selected && (
            <>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button onClick={() => callAgain(selected)} leftIcon={<Video className="size-4" />}>
                Call again
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div>
            <div className="flex items-center gap-4">
              <Avatar name={selected.contact.fullName} size="lg" />
              <div>
                <p className="text-lg font-semibold text-fg">{selected.contact.fullName}</p>
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  {selected.direction === 'incoming' ? <PhoneIncoming className="size-3.5" /> : <PhoneOutgoing className="size-3.5" />}
                  {selected.direction === 'incoming' ? 'Incoming call' : 'Outgoing call'}
                </p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              {[
                ['Room code', <span className="font-mono">{selected.roomCode}</span>],
                ['Status', <CallStatusBadge status={selected.status} />],
                ['Language pair', <LanguagePair from={selected.sourceLanguage} to={selected.targetLanguage} />],
                ['Duration', selected.durationSeconds ? formatDuration(selected.durationSeconds) : '—'],
                ['Date', `${formatCallDate(selected.startedAt)}, ${formatTime(selected.startedAt)}`],
                ['Translated segments', selected.translatedSegments],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-surface-2 p-3">
                  <dt className="text-xs text-subtle">{label}</dt>
                  <dd className="mt-1 font-medium text-fg">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-subtle">Call transcripts will be available here once the backend stores translation history.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
