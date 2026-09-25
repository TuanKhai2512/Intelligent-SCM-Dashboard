import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Clock } from '../common/clock';
import { PrismaService } from '../prisma/prisma.service';
import { buildOrderBy, buildVehicleWhere, VehicleFilters } from './vehicle-filters';
import { vehicleSummary, VehicleSummaryRow } from './vehicle-summary.sql';

@Injectable()
export class VehicleSummaryRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  async findOne(dealershipId: string, id: string): Promise<VehicleSummaryRow | null> {
    const rows = await this.prisma.$queryRaw<VehicleSummaryRow[]>`
      SELECT * FROM (${vehicleSummary(this.clock.now(), dealershipId)}) vs WHERE vs.id = ${id}`;
    return rows[0] ?? null;
  }

  async count(dealershipId: string, filters: VehicleFilters): Promise<number> {
    const [{ count }] = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM (${vehicleSummary(this.clock.now(), dealershipId)}) vs
      WHERE ${buildVehicleWhere(filters)}`;
    return Number(count);
  }

  async search(
    dealershipId: string,
    filters: VehicleFilters,
    opts: { sort?: string; limit?: number; offset?: number } = {},
  ): Promise<{ rows: VehicleSummaryRow[]; total: number }> {
    const base = vehicleSummary(this.clock.now(), dealershipId);
    const where = buildVehicleWhere(filters);
    const page = opts.limit
      ? Prisma.sql`LIMIT ${opts.limit} OFFSET ${opts.offset ?? 0}`
      : Prisma.empty;
    const [rows, total] = await Promise.all([
      this.prisma.$queryRaw<VehicleSummaryRow[]>`
        SELECT * FROM (${base}) vs WHERE ${where} ORDER BY ${buildOrderBy(opts.sort)} ${page}`,
      this.count(dealershipId, filters),
    ]);
    return { rows, total };
  }
}
