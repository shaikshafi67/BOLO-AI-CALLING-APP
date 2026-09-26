import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, PhoneIncoming, PhoneOutgoing, Video } from 'lucide-react';
import type { Call } from '../../types';
import { Avatar } from '../ui/Avatar';
import { CallStatusBadge } from '../call/CallStatusBadge';
import { LanguagePair } from '../translation/LanguageBits';
import { Tooltip } from '../ui/Tooltip';
import { formatCallDate, formatDuration } from '../../utils/format';

export function RecentCalls({ calls }: { calls: Call[] }) {
  const navigate = useNavigate();

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-fg">Recent calls</h2>
        <Link to="/history" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300">
          View all <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2/60 text-xs uppercase tracking-wider text-subtle">
            <tr>
              <th scope="col" className="px-6 py-3 font-medium">Contact</th>
              <th scope="col" className="px-6 py-3 font-medium">Language Pair</th>
              <th scope="col" className="px-6 py-3 font-medium">Duration</th>
              <th scope="col" className="px-6 py-3 font-medium">Date</th>
              <th scope="col" className="px-6 py-3 font-medium">Status</th>
              <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {calls.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-surface-2/50">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.contact.fullName} size="sm" />
                    <div>
                      <p className="font-medium text-fg">{c.contact.fullName}</p>
                      <p className="flex items-center gap-1 text-xs text-subtle">
                        {c.direction === 'incoming' ? <PhoneIncoming className="size-3" /> : <PhoneOutgoing className="size-3" />}
                        {c.direction === 'incoming' ? 'Incoming' : 'Outgoing'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-muted"><LanguagePair from={c.sourceLanguage} to={c.targetLanguage} /></td>
                <td className="px-6 py-3.5 font-mono text-muted tabular-nums">{c.durationSeconds ? formatDuration(c.durationSeconds) : '—'}</td>
                <td className="px-6 py-3.5 text-muted">{formatCallDate(c.startedAt)}</td>
                <td className="px-6 py-3.5"><CallStatusBadge status={c.status} /></td>
                <td className="px-6 py-3.5 text-right">
                  <Tooltip label="Call again">
                    <button
                      type="button"
                      onClick={() => navigate(`/start-call?contact=${c.contact.id}`)}
                      className="rounded-lg p-2 text-muted hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/15 dark:hover:text-brand-300"
                      aria-label={`Call ${c.contact.fullName} again`}
                    >
                      <Video className="size-4" />
                    </button>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <ul className="divide-y divide-line md:hidden">
        {calls.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
            <Avatar name={c.contact.fullName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-fg">{c.contact.fullName}</p>
              <LanguagePair from={c.sourceLanguage} to={c.targetLanguage} className="text-xs text-muted" />
            </div>
            <div className="text-right">
              <CallStatusBadge status={c.status} />
              <p className="mt-1 text-xs text-subtle">
                {formatCallDate(c.startedAt)}
                {c.durationSeconds > 0 && ` · ${formatDuration(c.durationSeconds)}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
