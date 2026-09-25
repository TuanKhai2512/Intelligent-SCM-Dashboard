import type { OverviewReport } from '@ims/shared';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui';
import { NEEDS_ATTENTION_LINKS } from './links';

const ROWS = [
  { key: 'noAction', label: 'Aging vehicles with no action' },
  { key: 'stale', label: 'Stale actions' },
  { key: 'overdue', label: 'Overdue plans' },
] as const;

export function NeedsAttention({ counts }: { counts: OverviewReport['needsAttention'] }) {
  return (
    <Card title="Needs attention">
      <ul className="divide-y divide-slate-100">
        {ROWS.map((r) => (
          <li key={r.key}>
            <Link to={NEEDS_ATTENTION_LINKS[r.key]} className="flex items-center justify-between py-2 text-sm hover:underline">
              <span>{r.label}</span>
              <span className={clsx('rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                counts[r.key] > 0 ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600')}>
                {counts[r.key]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
