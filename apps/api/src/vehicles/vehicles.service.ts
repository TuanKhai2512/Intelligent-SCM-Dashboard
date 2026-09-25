import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ACTION_STATUS_LABELS,
  dateInTz,
  type FilterOptions,
  type Paginated,
  type VehicleDetail,
  type VehicleView,
} from '@ims/shared';
import { ACTION_INCLUDE, toActionView } from '../actions/action.mapper';
import { Clock } from '../common/clock';
import { CSV_MAX_ROWS, toCsv } from '../common/csv';
import { toNumberOrNull } from '../common/money';
import { validationFailed } from '../common/validation';
import { PricingService } from '../pricing/pricing.service';
import { PRICE_HISTORY_INCLUDE, toPriceHistoryView } from '../pricing/price-history.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { CloseVehicleDto } from './dto/close-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { toVehicleView } from './vehicle.mapper';
import { VehicleSummaryRepository } from './vehicle-summary.repository';
import type { VehicleSummaryRow } from './vehicle-summary.sql';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly summaries: VehicleSummaryRepository,
    private readonly pricing: PricingService,
    private readonly clock: Clock,
  ) {}

  async list(dealershipId: string, q: VehicleQueryDto): Promise<Paginated<VehicleView>> {
    const { rows, total } = await this.summaries.search(dealershipId, q, {
      sort: q.sort,
      limit: q.pageSize,
      offset: (q.page - 1) * q.pageSize,
    });
    return { items: rows.map(toVehicleView), total, page: q.page, pageSize: q.pageSize };
  }

  async exportCsv(dealershipId: string, q: VehicleQueryDto): Promise<{ filename: string; body: string }> {
    const dealership = await this.prisma.dealership.findUniqueOrThrow({ where: { id: dealershipId } });
    const { rows } = await this.summaries.search(dealershipId, q, { sort: q.sort, limit: CSV_MAX_ROWS });
    const tz = dealership.timezone;
    const body = toCsv(
      ['VIN', 'Make', 'Model', 'Year', 'Trim', 'Color', 'Mileage', 'List price', 'Purchase cost', 'Status',
        'Stocked at', 'Age (days)', 'Bucket', 'Holding cost', 'Latest action', 'Latest action date', 'Latest action note'],
      rows.map(toVehicleView).map((v) => [
        v.vin, v.make, v.model, v.year, v.trim, v.color, v.mileage, v.listPrice, v.purchaseCost, v.status,
        dateInTz(new Date(v.stockedAt), tz), v.ageDays, v.bucket, v.holdingCost,
        v.latestAction ? ACTION_STATUS_LABELS[v.latestAction.status] : null,
        v.latestAction ? dateInTz(new Date(v.latestAction.createdAt), tz) : null,
        v.latestAction?.note,
      ]),
    );
    return { filename: `inventory-${dateInTz(this.clock.now(), tz)}.csv`, body };
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

  async findRowOrThrow(dealershipId: string, id: string): Promise<VehicleSummaryRow> {
    const row = await this.summaries.findOne(dealershipId, id);
    if (!row) throw new NotFoundException('Vehicle not found');
    return row;
  }

  async detail(dealershipId: string, id: string): Promise<VehicleDetail> {
    const row = await this.findRowOrThrow(dealershipId, id);
    const [actions, priceHistory] = await Promise.all([
      this.prisma.vehicleAction.findMany({
        where: { vehicleId: id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: ACTION_INCLUDE,
      }),
      this.prisma.vehiclePriceHistory.findMany({
        where: { vehicleId: id },
        orderBy: [{ changedAt: 'asc' }, { id: 'asc' }],
        include: PRICE_HISTORY_INCLUDE,
      }),
    ]);
    return {
      ...toVehicleView(row),
      actions: actions.map(toActionView),
      priceHistory: priceHistory.map(toPriceHistoryView),
    };
  }

  async update(dealershipId: string, userId: string, id: string, dto: UpdateVehicleDto): Promise<VehicleDetail> {
    await this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findFirst({ where: { id, dealershipId } });
      if (!vehicle) throw new NotFoundException('Vehicle not found');
      const { listPrice, ...descriptive } = dto;
      if (listPrice !== undefined && listPrice !== Number(vehicle.listPrice)) {
        if (vehicle.status !== 'IN_STOCK') throw new ConflictException('Only in-stock vehicles can be repriced');
        await this.pricing.changeListPrice(tx, {
          vehicleId: id,
          previousPrice: vehicle.listPrice,
          newPrice: listPrice,
          reason: 'MANUAL_EDIT',
          changedBy: userId,
        });
      }
      if (Object.keys(descriptive).length) {
        await tx.vehicle.update({ where: { id }, data: descriptive });
      }
    });
    return this.detail(dealershipId, id);
  }

  async close(
    dealershipId: string,
    id: string,
    dto: CloseVehicleDto,
    status: 'SOLD' | 'WHOLESALED',
  ): Promise<VehicleDetail> {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, dealershipId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.status !== 'IN_STOCK') throw new ConflictException('Vehicle is not in stock');
    const now = this.clock.now();
    const soldAt = dto.soldAt ? new Date(dto.soldAt) : now;
    if (soldAt > now || soldAt < vehicle.stockedAt) {
      throw validationFailed([{ field: 'soldAt', message: 'soldAt must be between stockedAt and now' }]);
    }
    const updated = await this.prisma.vehicle.updateMany({
      where: { id, status: 'IN_STOCK' },
      data: { status, salePrice: dto.salePrice, soldAt },
    });
    if (updated.count === 0) throw new ConflictException('Vehicle is not in stock');
    return this.detail(dealershipId, id);
  }
}
