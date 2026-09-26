import {
  ACTION_STATUS_LABELS,
  WATCH_WINDOW_DAYS,
  type AgingSummary,
  type Paginated,
  type VehicleView,
} from '@ims/shared';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { SuggestionChip, VehicleBadges } from '../../components/vehicle-badges';
import { Card, EmptyState, ErrorState, Spinner } from '../../components/ui';
import { api } from '../../lib/endpoints';
import { formatMoney, formatMoneyCompact } from '../../lib/format';
import { POLL_MS, qk } from '../../lib/query';
import { useDealership } from '../../lib/settings';
import { EMPTY_FILTERS, toApiQuery } from './filters';
import { Pagination } from './Pagination';

export const AGING_PAGE_SIZE = 10;

type ListBucket = 'AGING' | 'WATCH';

/** Same endpoint and query-key family as the inventory table, so invalidation and polling apply. */
export function agingListQuery(bucket: ListBucket, page: number): string {
  return toApiQuery({ ...EMPTY_FILTERS, bucket: [bucket], sort: 'age:desc', page, pageSize: AGING_PAGE_SIZE });
}

function useBucketPage(bucket: ListBucket, page: number, enabled: boolean) {
  const query = agingListQuery(bucket, page);
  return useQuery({
    queryKey: qk.vehicles(query),
    queryFn: () => api.vehicles(query),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: POLL_MS,
  });
}

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

function BucketList({
  query,
  page,
  onPageChange,
  empty,
  currency,
  ...selection
}: SelectionProps & {
  query: UseQueryResult<Paginated<VehicleView>>;
  page: number;
  onPageChange: (page: number) => void;
  empty: string;
  currency: string;
}) {
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / AGING_PAGE_SIZE));

  // If actions or sales shrink the list, don't leave the user on a page that no longer exists.
  useEffect(() => {
    if (query.data && page > pages) onPageChange(pages);
  }, [query.data, page, pages, onPageChange]);

  if (query.error) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data) return <Spinner label="Loading vehicles" />;
  if (total === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <div className="space-y-2">
      <AgingList vehicles={query.data.items} currency={currency} {...selection} />
      {total > AGING_PAGE_SIZE && (
        <Pagination page={page} pageSize={AGING_PAGE_SIZE} total={total} onPageChange={onPageChange} />
      )}
    </div>
  );
}

function SummaryLine({ s, currency }: { s: AgingSummary; currency: string }) {
  return (
    <p data-testid="aging-summary" className="mb-2 text-sm text-slate-700">
      <strong>{s.agingCount}</strong> vehicles over {s.thresholdDays} days · {s.agingPct}% of stock · capital tied up{' '}
      <strong>{formatMoneyCompact(s.capitalTiedUp, currency)}</strong> · holding cost so far{' '}
      <strong>{formatMoneyCompact(s.holdingCostSoFar, currency)}</strong>
    </p>
  );
}

export function AgingSection(selection: SelectionProps) {
  const { currency } = useDealership();
  const [agingPage, setAgingPage] = useState(1);
  const [watchPage, setWatchPage] = useState(1);
  const [watchOpen, setWatchOpen] = useState(false);

  const summary = useQuery({ queryKey: qk.aging, queryFn: api.aging, refetchInterval: POLL_MS });
  const aging = useBucketPage('AGING', agingPage, true);
  const watch = useBucketPage('WATCH', watchPage, watchOpen);

  if (summary.error) return <ErrorState error={summary.error} onRetry={() => summary.refetch()} />;
  if (!summary.data) return <Spinner label="Loading aging stock" />;
  const s = summary.data.summary;

  return (
    <Card title={`Aging stock (over ${s.thresholdDays} days)`}>
      <SummaryLine s={s} currency={currency} />
      <BucketList query={aging} page={agingPage} onPageChange={setAgingPage}
        empty="No vehicles over the aging threshold." currency={currency} {...selection} />
      <section className="mt-4">
        <button type="button" aria-expanded={watchOpen} aria-controls="watch-list"
          onClick={() => setWatchOpen((o) => !o)}
          className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900">
          <span aria-hidden>{watchOpen ? '▾' : '▸'}</span>
          Watch ({s.thresholdDays - WATCH_WINDOW_DAYS + 1}–{s.thresholdDays} days): {s.watchCount}
        </button>
        {watchOpen && (
          <div id="watch-list" data-testid="watch-list" className="mt-2">
            <BucketList query={watch} page={watchPage} onPageChange={setWatchPage}
              empty="Nothing on the watch list." currency={currency} {...selection} />
          </div>
        )}
      </section>
    </Card>
  );
}
