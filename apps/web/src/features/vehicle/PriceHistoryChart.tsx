import type { PriceHistoryView } from '@ims/shared';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '../../components/ui';
import { formatDate, formatMoney, formatMoneyCompact } from '../../lib/format';

export function PriceHistoryChart({ history, timezone, currency }: { history: PriceHistoryView[]; timezone: string; currency: string }) {
  if (history.length === 0) return <EmptyState>No price history.</EmptyState>;
  const data = history.map((p) => ({ date: formatDate(p.changedAt, timezone), price: p.price }));
  return (
    <div className="h-48" aria-label="List price over time">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis width={72} tick={{ fontSize: 11 }} domain={['auto', 'auto']} tickFormatter={(v: number) => formatMoneyCompact(v, currency)} />
          <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
          <Line type="stepAfter" dataKey="price" stroke="#0f172a" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
