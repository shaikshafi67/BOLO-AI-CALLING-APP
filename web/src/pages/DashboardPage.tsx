import { Link } from 'react-router-dom';
import { ArrowRight, Languages, LogIn, Video } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { ActivityChart } from '../components/dashboard/ActivityChart';
import { RecentCalls } from '../components/dashboard/RecentCalls';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { PrototypeNotice } from '../components/ui/Misc';
import { LanguagePair } from '../components/translation/LanguageBits';
import { useAuth } from '../context/AuthContext';
import { useCallSettings } from '../context/CallSettingsContext';
import { dashboardStats } from '../data/stats';
import { calls } from '../data/calls';
import { contacts } from '../data/contacts';
import { media } from '../data/media';
import { firstName, greeting } from '../utils/format';

export default function DashboardPage() {
  const { user } = useAuth();
  const { settings } = useCallSettings();
  const onlineContacts = contacts.filter((c) => c.status === 'online');

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
          <ActivityChart />
        </div>
        <div className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-fg">Online now</h2>
            <Link to="/contacts" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300">
              All contacts
            </Link>
          </div>
          <ul className="space-y-1">
            {onlineContacts.map((c) => (
              <li key={c.id}>
                <Link to={`/start-call?contact=${c.id}`} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-2">
                  <Avatar name={c.fullName} size="sm" status={c.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{c.fullName}</p>
                    <p className="text-xs text-subtle">{c.location}</p>
                  </div>
                  <Video className="size-4 text-subtle" aria-label={`Call ${c.fullName}`} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <RecentCalls calls={calls.slice(0, 5)} />

      <PrototypeNotice>
        <strong className="font-semibold">Sample data.</strong> Statistics and call history on this dashboard are mock data. They’ll be loaded
        from the BoloAI backend once the database is connected.
      </PrototypeNotice>
    </div>
  );
}
