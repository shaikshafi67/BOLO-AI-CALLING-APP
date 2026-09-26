import { useState } from 'react';
import { weeklyMinutes } from '../../data/stats';
import { cn } from '../../utils/format';

/** Single-series bar chart of call minutes per weekday. */
export function ActivityChart() {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...weeklyMinutes.map((d) => d.minutes));
  const ceiling = Math.ceil(max / 25) * 25;
  const total = weeklyMinutes.reduce((s, d) => s + d.minutes, 0);
  const gridLines = [ceiling, ceiling / 2, 0];

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-fg">Call minutes this week</h2>
          <p className="mt-0.5 text-sm text-muted">{total} minutes total</p>
        </div>
      </div>

      <div className="relative flex h-48 gap-3">
        {/* Y axis labels */}
        <div className="flex w-7 flex-col justify-between pb-6 text-right text-[11px] text-subtle" aria-hidden>
          {gridLines.map((g) => (
            <span key={g} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{g}</span>
          ))}
        </div>

        <div className="relative flex-1">
          {/* Recessive grid */}
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden>
            {gridLines.map((g) => (
              <span key={g} className="h-px w-full bg-line/70" />
            ))}
          </div>

          <div className="absolute inset-x-0 top-0 bottom-6 flex items-end gap-0.5" aria-hidden>
            {weeklyMinutes.map((d, i) => (
              <div
                key={d.day}
                className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div
                  className={cn(
                    'w-full max-w-10 rounded-t-[4px] transition-colors duration-150',
                    hover === i ? 'bg-brand-600 dark:bg-brand-400' : 'bg-brand-500/80 dark:bg-brand-500/70',
                  )}
                  style={{ height: `${(d.minutes / ceiling) * 100}%` }}
                />
                {hover === i && (
                  <div
                    className="pointer-events-none absolute z-10 -translate-y-2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lift"
                    style={{ bottom: `${(d.minutes / ceiling) * 100}%` }}
                  >
                    <span className="font-semibold text-fg">{d.minutes} min</span>
                    <span className="ml-1.5 text-muted">{d.day}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex gap-0.5" aria-hidden>
            {weeklyMinutes.map((d) => (
              <span key={d.day} className="flex-1 text-center text-[11px] text-subtle">
                {d.day}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Table view for screen readers */}
      <table className="sr-only">
        <caption>Call minutes per day this week</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Minutes</th>
          </tr>
        </thead>
        <tbody>
          {weeklyMinutes.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{d.minutes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
