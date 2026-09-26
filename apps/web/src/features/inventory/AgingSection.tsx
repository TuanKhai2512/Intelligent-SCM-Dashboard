import { ACTION_STATUS_LABELS, WATCH_WINDOW_DAYS, type AgingReport, type VehicleView } from '@ims/shared';
import { useQuery } from '@tanstack/react-query';
import { SuggestionChip, VehicleBadges } from '../../components/vehicle-badges';
import { Card, EmptyState, ErrorState, Spinner } from '../../components/ui';
import { api } from '../../lib/endpoints';
import { formatMoney, formatMoneyCompact } from '../../lib/format';
import { POLL_MS, qk } from '../../lib/query';
import { useDealership } from '../../lib/settings';

interface SelectionProps {
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}

/**
 * Every row uses the same fixed column template (from lg up), so days, price and
 * action line up regardless of how long the badges or suggestion text are.
 * Below lg the cells wrap as a simple flex row.
 */
const ROW =
  'flex flex-wrap items-center gap-x-4 gap-y-1 py-2 lg:grid lg:grid-cols-[1rem_minmax(0,1fr)_5.5rem_9.5rem_10rem_minmax(0,28rem)]';

function AgingList({ vehicles, currency, selected, onToggle, onOpen }: SelectionProps & { vehicles: VehicleView[]; currency: string }) {
  return (
    <ul className="divide-y divide-slate-100">
      {vehicles.map((v) => (
        <li key={v.id} data-testid="aging-row" className={ROW}>
          <input type="checkbox" aria-label={`Select ${v.vin}`} checked={selected.has(v.id)} onChange={() => onToggle(v.id)} />
          <button type="button" onClick={() => onOpen(v.id)} className="min-w-0 truncate text-left hover:underline">
            <span className="font-medium">{v.year} {v.make} {v.model}</span>{' '}
            <span className="font-mono text-xs text-slate-500">{v.vin}</span>
          </button>
          <span className="text-right text-sm tabular-nums">{v.ageDays} days</span>
          <span className="text-right text-sm tabular-nums">{formatMoney(v.listPrice, currency)}</span>
          <span className="truncate text-xs text-slate-600">
            {v.latestAction ? ACTION_STATUS_LABELS[v.latestAction.status] : '—'}
          </span>
          <div className="flex min-w-0 items-center gap-1.5">
            <VehicleBadges badges={v.badges} />
            {v.suggestions[0] && (
              <div className="min-w-0">
                <SuggestionChip suggestion={v.suggestions[0]} onApply={() => onOpen(v.id)} />
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AgingSectionView({ report, currency, ...selection }: SelectionProps & { report: AgingReport; currency: string }) {
  const s = report.summary;
  return (
    <Card title={`Aging stock (over ${s.thresholdDays} days)`}>
      <p data-testid="aging-summary" className="mb-2 text-sm text-slate-700">
        <strong>{s.agingCount}</strong> vehicles over {s.thresholdDays} days · {s.agingPct}% of stock · capital tied up{' '}
        <strong>{formatMoneyCompact(s.capitalTiedUp, currency)}</strong> · holding cost so far{' '}
        <strong>{formatMoneyCompact(s.holdingCostSoFar, currency)}</strong>
      </p>
      {report.aging.length === 0 ? (
        <EmptyState>No vehicles over the aging threshold.</EmptyState>
      ) : (
        <AgingList vehicles={report.aging} currency={currency} {...selection} />
      )}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          Watch ({s.thresholdDays - WATCH_WINDOW_DAYS + 1}–{s.thresholdDays} days): {s.watchCount}
        </summary>
        <div className="mt-2">
          {report.watch.length === 0 ? (
            <EmptyState>Nothing on the watch list.</EmptyState>
          ) : (
            <AgingList vehicles={report.watch} currency={currency} {...selection} />
          )}
        </div>
      </details>
    </Card>
  );
}

export function AgingSection(props: SelectionProps) {
  const { currency } = useDealership();
  const q = useQuery({ queryKey: qk.aging, queryFn: api.aging, refetchInterval: POLL_MS });
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner label="Loading aging stock" />;
  return <AgingSectionView report={q.data} currency={currency} {...props} />;
}
