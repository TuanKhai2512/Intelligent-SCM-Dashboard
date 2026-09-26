import { suggestionsFor, type LatestActionView, type VehicleView } from '@ims/shared';
import { toDateOnly } from '../common/dates';
import { toNumber, toNumberOrNull } from '../common/money';
import type { VehicleSummaryRow } from './vehicle-summary.sql';

export function toVehicleView(r: VehicleSummaryRow): VehicleView {
  const latestAction: LatestActionView | null = r.latest_action_id
    ? {
        id: r.latest_action_id,
        status: r.latest_action_status!,
        createdAt: r.latest_action_at!.toISOString(),
        targetDate: r.latest_action_target_date ? toDateOnly(r.latest_action_target_date) : null,
        note: r.latest_action_note,
        daysAgo: r.latest_action_days!,
      }
    : null;

  return {
    id: r.id,
    vin: r.vin,
    make: r.make,
    model: r.model,
    year: r.year,
    trim: r.trim,
    color: r.color,
    mileage: r.mileage,
    purchaseCost: toNumber(r.purchase_cost),
    listPrice: toNumber(r.list_price),
    salePrice: toNumberOrNull(r.sale_price),
    status: r.status,
    stockedAt: r.stocked_at.toISOString(),
    soldAt: r.sold_at ? r.sold_at.toISOString() : null,
    ageDays: r.age_days,
    bucket: r.bucket,
    holdingCost: toNumber(r.holding_cost),
    everReduced: r.ever_reduced,
    latestAction,
    badges: { noAction: r.badge_no_action, stale: r.badge_stale, overdue: r.badge_overdue },
    suggestions: suggestionsFor({
      status: r.status,
      ageDays: r.age_days,
      thresholdDays: r.aging_threshold_days,
      everReduced: r.ever_reduced,
      hasAction: latestAction !== null,
      stale: r.badge_stale,
      latestActionDays: r.latest_action_days,
      latestActionStatus: r.latest_action_status,
    }),
  };
}
