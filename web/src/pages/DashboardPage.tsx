import { Link } from 'react-router-dom';
import { ArrowRight, Languages, LogIn, Video } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { ActivityChart } from '../components/dashboard/ActivityChart';
import { RecentCalls } from '../components/dashboard/RecentCalls';
import { Badge } from '../components/ui/Badge';
import { LanguagePair } from '../components/translation/LanguageBits';
import { useAuth } from '../context/AuthContext';
import { useCallSettings } from '../context/CallSettingsContext';
import { media } from '../data/media';
import { getLanguage } from '../data/languages';
import { useHistory } from '../hooks/useHistory';
import { usePresence } from '../services/presence';
import { Avatar } from '../components/ui/Avatar';
import type { Call, DashboardStat } from '../types';
import { firstName, greeting } from '../utils/format';

const DAY = 86_400_000;
const minutesOf = (calls: Call[]) => calls.reduce((sum, c) => sum + Math.round(c.durationSeconds / 60), 0);

/** The four figures, from your real call history. */
function statsFor(calls: Call[]): DashboardStat[] {
  const thisWeek = calls.filter((c) => Date.now() - new Date(c.startedAt).getTime() < 7 * DAY);
  const counts = new Map<string, number>();
  for (const c of calls) for (const l of new Set([c.sourceLanguage, c.targetLanguage])) counts.set(l, (counts.get(l) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const translated = calls.filter((c) => c.translatedSegments > 0);
  const none = 'No calls yet';
  return [
    { id: 'calls', label: 'Total Calls', value: String(calls.length), change: calls.length ? `+${thisWeek.length} this week` : none, trend: thisWeek.length ? 'up' : 'flat' },
    { id: 'minutes', label: 'Call Minutes', value: String(minutesOf(calls)), change: calls.length ? `+${minutesOf(thisWeek)} this week` : none, trend: minutesOf(thisWeek) ? 'up' : 'flat' },
    { id: 'languages', label: 'Languages Used', value: String(counts.size), change: top ? `${getLanguage(top as Call['sourceLanguage']).name} most used` : none, trend: 'flat' },
    { id: 'sessions', label: 'Translation Sessions', value: String(translated.length), change: calls.length ? `${translated.reduce((s, c) => s + c.translatedSegments, 0)} lines translated` : none, trend: 'flat' },
  ];
}

/** Minutes talked on each of the last 7 days, oldest first. */
function weekly(calls: Call[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today.getTime() - (6 - i) * DAY);
    const minutes = minutesOf(calls.filter((c) => {
      const d = new Date(c.startedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === day.getTime();
    }));
    return { day: i === 6 ? 'Today' : day.toLocaleDateString('en-US', { weekday: 'short' }), minutes };
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { settings } = useCallSettings();
  const { calls, contacts } = useHistory();
  const presence = usePresence(contacts.map((c) => c.id));
  const online = contacts.filter((c) => presence[c.id] === 'online' || presence[c.id] === 'busy');
  const dashboardStats = statsFor(calls);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif-display text-4xl text-fg sm:text-5xl">
            {greeting()}, {firstName(user?.fullName ?? 'there')}
          </h1>
          <p className="mt-1.5 text-muted">Ready to connect without language barriers?</p>
        </div>
        <Badge tone="brand" icon={<Languages className="size-3" />}>
          Default: <LanguagePair from={settings.myLanguage} to={settings.targetLanguage} className="text-xs" />
        </Badge>
      </div>

      {/* Primary actions */}
      <div className="grid gap-4 md:grid-cols-[1.35fr_1fr]">
        <Link
          to="/start-call"
          className="group relative isolate flex min-h-52 overflow-hidden rounded-xl bg-brand-800 p-6 text-white transition-shadow duration-300 hover:shadow-lift sm:p-7"
        >
          <img
            src={media.family}
            alt=""
            className="absolute inset-y-0 right-0 -z-10 h-full w-3/5 object-cover object-[35%_center] transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-800 from-40% via-brand-800/85 via-55% to-brand-800/10" aria-hidden />
          <div className="flex flex-col">
            <Video className="size-6 text-accent-300" aria-hidden />
            <h2 className="mt-auto pt-8 text-2xl font-semibold">Start a new call</h2>
            <p className="mt-1 max-w-[16rem] text-sm text-white/80">Create a room, pick your languages and invite someone.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
              Start now <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>
        <Link
          to="/join-call"
          className="group card relative flex flex-col overflow-hidden p-6 transition-all duration-300 hover:border-brand-300 hover:shadow-lift sm:p-7 dark:hover:border-brand-500/40"
        >
          <span className="text-brand-600 dark:text-brand-300">
            <LogIn className="size-6" aria-hidden />
          </span>
          <h2 className="mt-auto pt-8 text-2xl font-semibold text-fg">Join a call</h2>
          <p className="mt-1 text-sm text-muted">Have a room code like <span className="font-mono font-medium text-fg">BOLO-4829</span>? Jump right in.</p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-300">
            Enter code <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </div>

      {/* Statistics */}
      <section aria-label="Statistics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {dashboardStats.map((s) => (
          <StatCard key={s.id} stat={s} />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityChart weeklyMinutes={weekly(calls)} />
        </div>
        <div className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-fg">Online now</h2>
            <Link to="/contacts" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300">
              All contacts
            </Link>
          </div>
          {online.length === 0 ? (
            <p className="text-sm text-muted">No one is online right now. People you have calls with appear here when they’re online.</p>
          ) : (
            <ul className="space-y-1">
              {online.map((c) => (
                <li key={c.id}>
                  <Link to={`/start-call?contact=${c.id}`} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2">
                    <Avatar name={c.fullName} size="sm" status={presence[c.id]} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">{c.fullName}</p>
                      <p className="text-xs text-subtle">{presence[c.id] === 'busy' ? 'On a call' : `Speaks ${getLanguage(c.preferredLanguage).name}`}</p>
                    </div>
                    <Video className="size-4 text-subtle" aria-label={`Call ${c.fullName}`} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <RecentCalls calls={calls.slice(0, 5)} />
    </div>
  );
}
