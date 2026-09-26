import type { PriceHistoryView } from '@ims/shared';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '../../components/ui';
import { formatDate, formatMoney, formatMoneyCompact } from '../../lib/format';

/** Smallest 1/2/5 × 10^n step that is >= raw. */
function niceStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 5, 10].find((m) => m * magnitude >= raw) ?? 10) * magnitude;
}

/**
 * Y-axis with padding (±5% for a single price, 20% of the range otherwise),
 * snapped to round steps so tick labels are distinct and readable.
 */
export function priceAxis(prices: number[]): { domain: [number, number]; ticks: number[] } {
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const pad = hi === lo ? Math.max(hi * 0.05, 1) : (hi - lo) * 0.2;
  const min = Math.max(0, lo - pad);
  const max = hi + pad;
  const step = niceStep((max - min) / 4);
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= end + step / 2; t += step) ticks.push(Math.round(t));
  return { domain: [start, end], ticks };
}

export function PriceHistoryChart({ history, timezone, currency }: { history: PriceHistoryView[]; timezone: string; currency: string }) {
  if (history.length === 0) return <EmptyState>No price history.</EmptyState>;
  const data = history.map((p) => ({ date: formatDate(p.changedAt, timezone), price: p.price }));
  const axis = priceAxis(data.map((d) => d.price));
  return (
    <div className="h-48" aria-label="List price over time">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis width={72} tick={{ fontSize: 11 }} domain={axis.domain} ticks={axis.ticks} tickFormatter={(v: number) => formatMoneyCompact(v, currency)} />
          <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
          <Line type="stepAfter" dataKey="price" stroke="#0f172a" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
