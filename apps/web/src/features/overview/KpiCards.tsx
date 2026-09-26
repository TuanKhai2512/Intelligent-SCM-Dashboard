import type { OverviewReport } from '@ims/shared';
import type { ReactNode } from 'react';
import { formatMoneyCompact, formatNumber } from '../../lib/format';

function Kpi({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function KpiCards({ report, currency }: { report: OverviewReport; currency: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Kpi label="In stock" value={formatNumber(report.totalInStock)} />
      <Kpi label="Average age" value={`${report.avgAgeDays} days`} />
      <Kpi label="Aging vehicles" value={formatNumber(report.agingCount)} sub={`${report.agingPct}% of stock`} />
      <Kpi label="Capital tied up in aging" value={formatMoneyCompact(report.capitalTiedUp, currency)} />
      <Kpi label="Holding cost so far (aging)" value={formatMoneyCompact(report.holdingCostSoFar, currency)} />
    </div>
  );
}
