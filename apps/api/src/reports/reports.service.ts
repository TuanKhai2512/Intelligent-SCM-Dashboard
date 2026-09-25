import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  ACTION_STATUSES,
  BUCKETS,
  type ActionStatusCount,
  type BucketCount,
  type OverviewReport,
} from '@ims/shared';
import { Clock } from '../common/clock';
import { PrismaService } from '../prisma/prisma.service';
import { vehicleSummary } from '../vehicles/vehicle-summary.sql';

interface OverviewRow {
  total_in_stock: number;
  avg_age: Prisma.Decimal | null;
  aging_count: number;
  capital_tied_up: Prisma.Decimal;
  holding_cost_so_far: Prisma.Decimal;
  no_action: number;
  stale: number;
  overdue: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  async overview(dealershipId: string): Promise<OverviewReport> {
    const [r] = await this.prisma.$queryRaw<OverviewRow[]>`
      SELECT
        COUNT(*)::int AS total_in_stock,
        AVG(vs.age_days) AS avg_age,
        COUNT(*) FILTER (WHERE vs.bucket = 'AGING')::int AS aging_count,
        COALESCE(SUM(vs.purchase_cost) FILTER (WHERE vs.bucket = 'AGING'), 0) AS capital_tied_up,
        COALESCE(SUM(vs.holding_cost) FILTER (WHERE vs.bucket = 'AGING'), 0) AS holding_cost_so_far,
        COUNT(*) FILTER (WHERE vs.badge_no_action)::int AS no_action,
        COUNT(*) FILTER (WHERE vs.badge_stale)::int AS stale,
        COUNT(*) FILTER (WHERE vs.badge_overdue)::int AS overdue
      FROM (${vehicleSummary(this.clock.now(), dealershipId)}) vs
      WHERE vs.status = 'IN_STOCK'`;
    return {
      totalInStock: r.total_in_stock,
      avgAgeDays: r.avg_age === null ? 0 : round1(Number(r.avg_age)),
      agingCount: r.aging_count,
      agingPct: r.total_in_stock ? round1((r.aging_count / r.total_in_stock) * 100) : 0,
      capitalTiedUp: Number(r.capital_tied_up),
      holdingCostSoFar: Number(r.holding_cost_so_far),
      needsAttention: { noAction: r.no_action, stale: r.stale, overdue: r.overdue },
    };
  }

  async ageDistribution(dealershipId: string): Promise<BucketCount[]> {
    const rows = await this.prisma.$queryRaw<{ bucket: string; count: number }[]>`
      SELECT vs.bucket, COUNT(*)::int AS count
      FROM (${vehicleSummary(this.clock.now(), dealershipId)}) vs
      WHERE vs.status = 'IN_STOCK'
      GROUP BY vs.bucket`;
    const counts = new Map(rows.map((r) => [r.bucket, r.count]));
    return BUCKETS.map((bucket) => ({ bucket, count: counts.get(bucket) ?? 0 }));
  }

  async agingActions(dealershipId: string): Promise<ActionStatusCount[]> {
    const rows = await this.prisma.$queryRaw<{ status: string; count: number }[]>`
      SELECT COALESCE(vs.latest_action_status, 'NONE') AS status, COUNT(*)::int AS count
      FROM (${vehicleSummary(this.clock.now(), dealershipId)}) vs
      WHERE vs.bucket = 'AGING'
      GROUP BY 1`;
    const counts = new Map(rows.map((r) => [r.status, r.count]));
    return (['NONE', ...ACTION_STATUSES] as const).map((status) => ({ status, count: counts.get(status) ?? 0 }));
  }
}
