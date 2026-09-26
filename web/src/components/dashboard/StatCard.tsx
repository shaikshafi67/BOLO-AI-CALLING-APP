import { Captions, Clock, Languages, Minus, PhoneCall, TrendingDown, TrendingUp } from 'lucide-react';
import type { DashboardStat } from '../../types';
import { cn } from '../../utils/format';

const icons: Record<string, typeof PhoneCall> = {
  calls: PhoneCall,
  minutes: Clock,
  languages: Languages,
  sessions: Captions,
};

export function StatCard({ stat }: { stat: DashboardStat }) {
  const Icon = icons[stat.id] ?? PhoneCall;
  const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : Minus;
  return (
    <div className="card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{stat.label}</p>
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-fg">{stat.value}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
        <TrendIcon
          className={cn(
            'size-3.5',
            stat.trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
            stat.trend === 'down' && 'text-amber-600 dark:text-amber-400',
          )}
          aria-hidden
        />
        {stat.change}
      </p>
    </div>
  );
}
