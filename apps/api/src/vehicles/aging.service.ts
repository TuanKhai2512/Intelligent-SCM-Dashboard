import { Injectable } from '@nestjs/common';
import type { AgingReport } from '@ims/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toVehicleView } from './vehicle.mapper';
import { VehicleSummaryRepository } from './vehicle-summary.repository';

const round1 = (n: number) => Math.round(n * 10) / 10;

@Injectable()
export class AgingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly summaries: VehicleSummaryRepository,
  ) {}

  async report(dealershipId: string): Promise<AgingReport> {
    const [dealership, { rows }, totalInStock] = await Promise.all([
      this.prisma.dealership.findUniqueOrThrow({ where: { id: dealershipId } }),
      this.summaries.search(dealershipId, { status: ['IN_STOCK'], bucket: ['AGING', 'WATCH'] }, { sort: 'age:desc' }),
      this.summaries.count(dealershipId, { status: ['IN_STOCK'] }),
    ]);
    const views = rows.map(toVehicleView);
    const aging = views.filter((v) => v.bucket === 'AGING');
    const watch = views.filter((v) => v.bucket === 'WATCH');
    return {
      summary: {
        thresholdDays: dealership.agingThresholdDays,
        totalInStock,
        agingCount: aging.length,
        watchCount: watch.length,
        agingPct: totalInStock ? round1((aging.length / totalInStock) * 100) : 0,
        capitalTiedUp: aging.reduce((sum, v) => sum + v.purchaseCost, 0),
        holdingCostSoFar: aging.reduce((sum, v) => sum + v.holdingCost, 0),
      },
      aging,
      watch,
    };
  }
}
