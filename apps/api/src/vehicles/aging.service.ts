import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AgingReport } from '@ims/shared';
import { Clock } from '../common/clock';
import { PrismaService } from '../prisma/prisma.service';
import { vehicleSummary } from './vehicle-summary.sql';

interface AgingRow {
  total_in_stock: number;
  aging_count: number;
  watch_count: number;
  capital_tied_up: Prisma.Decimal;
  holding_cost_so_far: Prisma.Decimal;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** One aggregate query, so the cost does not grow with the number of aging vehicles returned. */
@Injectable()
export class AgingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  async report(dealershipId: string): Promise<AgingReport> {
    const [dealership, [r]] = await Promise.all([
      this.prisma.dealership.findUniqueOrThrow({ where: { id: dealershipId } }),
      this.prisma.$queryRaw<AgingRow[]>`
        SELECT
          COUNT(*)::int AS total_in_stock,
          COUNT(*) FILTER (WHERE vs.bucket = 'AGING')::int AS aging_count,
          COUNT(*) FILTER (WHERE vs.bucket = 'WATCH')::int AS watch_count,
          COALESCE(SUM(vs.purchase_cost) FILTER (WHERE vs.bucket = 'AGING'), 0) AS capital_tied_up,
          COALESCE(SUM(vs.holding_cost) FILTER (WHERE vs.bucket = 'AGING'), 0) AS holding_cost_so_far
        FROM (${vehicleSummary(this.clock.now(), dealershipId)}) vs
        WHERE vs.status = 'IN_STOCK'`,
    ]);
    return {
      summary: {
        thresholdDays: dealership.agingThresholdDays,
        totalInStock: r.total_in_stock,
        agingCount: r.aging_count,
        watchCount: r.watch_count,
        agingPct: r.total_in_stock ? round1((r.aging_count / r.total_in_stock) * 100) : 0,
        capitalTiedUp: Number(r.capital_tied_up),
        holdingCostSoFar: Number(r.holding_cost_so_far),
      },
    };
  }
}
