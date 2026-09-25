import { Injectable } from '@nestjs/common';
import type { Dealership } from '@prisma/client';
import type { DealershipSettings } from '@ims/shared';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const toView = (d: Dealership): DealershipSettings => ({
  id: d.id,
  name: d.name,
  timezone: d.timezone,
  currency: d.currency,
  agingThresholdDays: d.agingThresholdDays,
  staleActionDays: d.staleActionDays,
  dailyHoldingCost: Number(d.dailyHoldingCost),
});

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(dealershipId: string): Promise<DealershipSettings> {
    return toView(await this.prisma.dealership.findUniqueOrThrow({ where: { id: dealershipId } }));
  }

  async update(dealershipId: string, dto: UpdateSettingsDto): Promise<DealershipSettings> {
    return toView(await this.prisma.dealership.update({ where: { id: dealershipId }, data: dto }));
  }
}
