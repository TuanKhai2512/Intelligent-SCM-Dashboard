import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  actionWarnings,
  dateInTz,
  NOTE_EDIT_WINDOW_HOURS,
  validateActionInput,
  type ActionView,
  type CreateActionResult,
} from '@ims/shared';
import type { AuthUser } from '../common/auth-user';
import { Clock } from '../common/clock';
import { fromDateOnly } from '../common/dates';
import { validationFailed } from '../common/validation';
import { PricingService } from '../pricing/pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { ACTION_INCLUDE, toActionView } from './action.mapper';
import { CreateActionDto } from './dto/create-action.dto';

@Injectable()
export class ActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly clock: Clock,
  ) {}

  async create(user: AuthUser, vehicleId: string, dto: CreateActionDto): Promise<CreateActionResult> {
    return this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findFirst({
        where: { id: vehicleId, dealershipId: user.dealershipId },
        include: { dealership: true },
      });
      if (!vehicle) throw new NotFoundException('Vehicle not found');
      if (vehicle.status !== 'IN_STOCK') {
        throw new ConflictException('Actions can only be logged for vehicles in stock');
      }

      const now = this.clock.now();
      const currentPrice = Number(vehicle.listPrice);
      const errors = validateActionInput(dto, { today: dateInTz(now, vehicle.dealership.timezone) });
      if (errors.length) throw validationFailed(errors);
      if (dto.status === 'PRICE_REDUCED' && dto.newPrice === currentPrice) {
        throw new ConflictException('New price must differ from the current list price');
      }

      const action = await tx.vehicleAction.create({
        data: {
          vehicleId,
          status: dto.status,
          note: dto.note ?? null,
          targetDate: dto.targetDate ? fromDateOnly(dto.targetDate) : null,
          newPrice: dto.newPrice ?? null,
          source: dto.suggestionCode ? 'SUGGESTION' : 'MANUAL',
          suggestionCode: dto.suggestionCode ?? null,
          createdBy: user.id,
          createdAt: now,
        },
        include: ACTION_INCLUDE,
      });

      if (dto.status === 'PRICE_REDUCED') {
        await this.pricing.changeListPrice(tx, {
          vehicleId,
          previousPrice: vehicle.listPrice,
          newPrice: dto.newPrice!,
          reason: 'PRICE_REDUCED_ACTION',
          changedBy: user.id,
          actionId: action.id,
        });
      }

      return { action: toActionView(action), warnings: actionWarnings(dto, currentPrice) };
    });
  }

  async list(dealershipId: string, vehicleId: string): Promise<ActionView[]> {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, dealershipId }, select: { id: true } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    const actions = await this.prisma.vehicleAction.findMany({
      where: { vehicleId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: ACTION_INCLUDE,
    });
    return actions.map(toActionView);
  }

  async updateNote(user: AuthUser, actionId: string, note: string): Promise<ActionView> {
    const action = await this.prisma.vehicleAction.findFirst({
      where: { id: actionId, vehicle: { dealershipId: user.dealershipId } },
    });
    if (!action) throw new NotFoundException('Action not found');
    if (action.createdBy !== user.id) throw new ForbiddenException('Only the author can edit the note');
    const now = this.clock.now();
    if (now.getTime() - action.createdAt.getTime() > NOTE_EDIT_WINDOW_HOURS * 3_600_000) {
      throw new ForbiddenException('Notes can only be edited within 24 hours');
    }
    const updated = await this.prisma.vehicleAction.update({
      where: { id: actionId },
      data: { note, editedAt: now },
      include: ACTION_INCLUDE,
    });
    return toActionView(updated);
  }
}
