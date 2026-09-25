import { Injectable } from '@nestjs/common';
import type { FilterOptions, Paginated, VehicleView } from '@ims/shared';
import { toNumberOrNull } from '../common/money';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { toVehicleView } from './vehicle.mapper';
import { VehicleSummaryRepository } from './vehicle-summary.repository';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly summaries: VehicleSummaryRepository,
  ) {}

  async list(dealershipId: string, q: VehicleQueryDto): Promise<Paginated<VehicleView>> {
    const { rows, total } = await this.summaries.search(dealershipId, q, {
      sort: q.sort,
      limit: q.pageSize,
      offset: (q.page - 1) * q.pageSize,
    });
    return { items: rows.map(toVehicleView), total, page: q.page, pageSize: q.pageSize };
  }

  async filterOptions(dealershipId: string): Promise<FilterOptions> {
    const [pairs, agg] = await Promise.all([
      this.prisma.vehicle.groupBy({
        by: ['make', 'model'],
        where: { dealershipId },
        orderBy: [{ make: 'asc' }, { model: 'asc' }],
      }),
      this.prisma.vehicle.aggregate({
        where: { dealershipId },
        _min: { year: true, listPrice: true },
        _max: { year: true, listPrice: true },
      }),
    ]);
    const makes = new Map<string, string[]>();
    for (const { make, model } of pairs) {
      if (!makes.has(make)) makes.set(make, []);
      makes.get(make)!.push(model);
    }
    return {
      makes: [...makes].map(([make, models]) => ({ make, models })),
      year: { min: agg._min.year, max: agg._max.year },
      price: { min: toNumberOrNull(agg._min.listPrice), max: toNumberOrNull(agg._max.listPrice) },
    };
  }
}
