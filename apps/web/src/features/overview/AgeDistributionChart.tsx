import type { Bucket, BucketCount } from '@ims/shared';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BUCKET_LABELS } from '../../lib/labels';

export const BUCKET_COLORS: Record<Bucket, string> = { FRESH: '#16a34a', NORMAL: '#2563eb', WATCH: '#d97706', AGING: '#dc2626' };

export function AgeDistributionChart({ data, onSelect }: { data: BucketCount[]; onSelect: (bucket: Bucket) => void }) {
  const rows = data.map((d) => ({ ...d, label: BUCKET_LABELS[d.bucket] }));
  return (
    <div className="h-64" aria-label="Vehicles in stock by age bucket">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" name="Vehicles" cursor="pointer" onClick={(_, index) => onSelect(rows[index].bucket)}>
            {rows.map((r) => (
              <Cell key={r.bucket} fill={BUCKET_COLORS[r.bucket]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
