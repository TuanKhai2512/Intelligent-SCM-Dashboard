import { Prisma } from '@prisma/client';
import type { ActionStatus, Bucket, VehicleStatus } from '@ims/shared';

export interface VehicleSummaryRow {
  id: string;
  dealership_id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  color: string | null;
  mileage: number;
  purchase_cost: Prisma.Decimal;
  list_price: Prisma.Decimal;
  sale_price: Prisma.Decimal | null;
  status: VehicleStatus;
  stocked_at: Date;
  sold_at: Date | null;
  aging_threshold_days: number;
  stale_action_days: number;
  today: Date;
  age_days: number;
  bucket: Bucket | null;
  holding_cost: Prisma.Decimal;
  latest_action_id: string | null;
  latest_action_status: ActionStatus | null;
  latest_action_at: Date | null;
  latest_action_target_date: Date | null;
  latest_action_note: string | null;
  latest_action_days: number | null;
  ever_reduced: boolean;
  badge_no_action: boolean;
  badge_stale: boolean;
  badge_overdue: boolean;
}

/**
 * One row per vehicle of one dealership, with every aging field computed in SQL.
 * `now` comes from Clock (never SQL now()) so results are deterministic in tests.
 * The bucket CASE must stay identical to bucketFor() in @ims/shared.
 */
export function vehicleSummary(now: Date, dealershipId: string): Prisma.Sql {
  return Prisma.sql`
    SELECT b.*,
      COALESCE(b.bucket = 'AGING' AND b.latest_action_id IS NULL, false) AS badge_no_action,
      COALESCE(b.status = 'IN_STOCK' AND b.latest_action_days > b.stale_action_days, false) AS badge_stale,
      COALESCE(b.status = 'IN_STOCK' AND b.latest_action_target_date < b.today, false) AS badge_overdue
    FROM (
      SELECT
        v.id, v.dealership_id, v.vin, v.make, v.model, v.year, v.trim, v.color, v.mileage,
        v.purchase_cost, v.list_price, v.sale_price, v.status::text AS status, v.stocked_at, v.sold_at,
        d.aging_threshold_days, d.stale_action_days,
        a.today,
        a.age_days,
        CASE
          WHEN v.status <> 'IN_STOCK' THEN NULL
          WHEN a.age_days <= 30 THEN 'FRESH'
          WHEN a.age_days > d.aging_threshold_days THEN 'AGING'
          WHEN a.age_days > d.aging_threshold_days - 30 THEN 'WATCH'
          ELSE 'NORMAL'
        END AS bucket,
        a.age_days * d.daily_holding_cost AS holding_cost,
        la.id AS latest_action_id,
        la.status::text AS latest_action_status,
        la.created_at AS latest_action_at,
        la.target_date AS latest_action_target_date,
        la.note AS latest_action_note,
        a.today - (la.created_at AT TIME ZONE d.timezone)::date AS latest_action_days,
        EXISTS (
          SELECT 1 FROM vehicle_price_history ph
          WHERE ph.vehicle_id = v.id AND ph.reason = 'PRICE_REDUCED_ACTION'
        ) AS ever_reduced
      FROM vehicles v
      JOIN dealerships d ON d.id = v.dealership_id
      CROSS JOIN LATERAL (
        SELECT
          (${now}::timestamptz AT TIME ZONE d.timezone)::date AS today,
          (((CASE WHEN v.status = 'IN_STOCK' THEN ${now}::timestamptz ELSE v.sold_at END)
              AT TIME ZONE d.timezone)::date
            - (v.stocked_at AT TIME ZONE d.timezone)::date) AS age_days
      ) a
      LEFT JOIN LATERAL (
        SELECT x.id, x.status, x.created_at, x.target_date, x.note
        FROM vehicle_actions x
        WHERE x.vehicle_id = v.id
        ORDER BY x.created_at DESC, x.id DESC
        LIMIT 1
      ) la ON true
      WHERE v.dealership_id = ${dealershipId}
    ) b`;
}
