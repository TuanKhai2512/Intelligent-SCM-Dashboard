import { ACTION_STATUS_LABELS, type ActionStatus, type ActionStatusCount } from '@ims/shared';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { EmptyState } from '../../components/ui';

const COLORS = ['#dc2626', '#0f172a', '#2563eb', '#7c3aed', '#0891b2', '#d97706', '#16a34a', '#64748b'];

export function AgingActionsChart({ data, onSelect }: { data: ActionStatusCount[]; onSelect: (status: ActionStatus | 'NONE') => void }) {
  const rows = data
    .filter((d) => d.count > 0)
    .map((d) => ({ ...d, label: d.status === 'NONE' ? 'No action' : ACTION_STATUS_LABELS[d.status] }));
  if (rows.length === 0) return <EmptyState>No aging vehicles.</EmptyState>;
  return (
    <div className="h-64" aria-label="Aging vehicles by latest action">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="count" nameKey="label" innerRadius="55%" outerRadius="85%" paddingAngle={2}
            cursor="pointer" onClick={(_, index) => onSelect(rows[index].status)}>
            {rows.map((r) => (
              <Cell key={r.status} fill={COLORS[data.findIndex((d) => d.status === r.status) % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={48} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
