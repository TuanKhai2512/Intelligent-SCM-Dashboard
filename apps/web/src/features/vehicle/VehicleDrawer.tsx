import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Drawer } from '../../components/dialog';
import { BucketBadge, VehicleBadges } from '../../components/vehicle-badges';
import { ErrorState, Spinner } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/endpoints';
import { formatDate, formatMoney, formatNumber } from '../../lib/format';
import { VEHICLE_STATUS_LABELS } from '../../lib/labels';
import { qk } from '../../lib/query';
import { useDealership } from '../../lib/settings';
import { ActionForm } from './ActionForm';
import { ActionTimeline } from './ActionTimeline';
import { CloseVehicleButton } from './CloseVehicleButton';
import { PriceHistoryChart } from './PriceHistoryChart';

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {children}
    </section>
  );
}

function VehicleDetailBody({ id }: { id: string }) {
  const { timezone, currency } = useDealership();
  const { user } = useAuth();
  const q = useQuery({ queryKey: qk.vehicle(id), queryFn: () => api.vehicle(id) });
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Spinner label="Loading vehicle" />;
  const v = q.data;
  const inStock = v.status === 'IN_STOCK';

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">
              {v.year} {v.make} {v.model}
              {v.trim ? ` ${v.trim}` : ''}
            </h3>
            <p className="font-mono text-xs text-slate-500">{v.vin}</p>
          </div>
          <BucketBadge bucket={v.bucket} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Stat label="List price">{formatMoney(v.listPrice, currency)}</Stat>
          <Stat label="Purchase cost">{formatMoney(v.purchaseCost, currency)}</Stat>
          <Stat label="Age">{v.ageDays} days</Stat>
          <Stat label="Holding cost so far">{formatMoney(v.holdingCost, currency)}</Stat>
          <Stat label="In stock since">{formatDate(v.stockedAt, timezone)}</Stat>
          <Stat label="Status">{VEHICLE_STATUS_LABELS[v.status]}</Stat>
          <Stat label="Color">{v.color ?? '—'}</Stat>
          <Stat label="Mileage">{formatNumber(v.mileage)} km</Stat>
          {v.salePrice !== null && <Stat label="Sale price">{formatMoney(v.salePrice, currency)}</Stat>}
        </dl>
        <div className="mt-3">
          <VehicleBadges badges={v.badges} />
        </div>
      </section>

      {inStock && (
        <Section title="Log an action">
          <ActionForm vehicle={v} timezone={timezone} currency={currency} />
        </Section>
      )}
      <Section title="Action history">
        <ActionTimeline actions={v.actions} meId={user?.id} timezone={timezone} currency={currency} />
      </Section>
      <Section title="Price history">
        <PriceHistoryChart history={v.priceHistory} timezone={timezone} currency={currency} />
      </Section>
      {inStock && (
        <section className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <CloseVehicleButton vehicle={v} kind="sell" currency={currency} />
          <CloseVehicleButton vehicle={v} kind="wholesale" currency={currency} />
        </section>
      )}
    </div>
  );
}

export function VehicleDrawer({ vehicleId, onClose }: { vehicleId: string | null; onClose: () => void }) {
  return (
    <Drawer open={vehicleId !== null} onOpenChange={(open) => !open && onClose()} title="Vehicle details">
      {vehicleId && <VehicleDetailBody id={vehicleId} />}
    </Drawer>
  );
}
