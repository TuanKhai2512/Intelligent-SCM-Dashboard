import { Injectable } from '@nestjs/common';
import type { Prisma, VehiclePriceHistory } from '@prisma/client';
import type { PriceChangeReason } from '@ims/shared';
import { Clock } from '../common/clock';

@Injectable()
export class PricingService {
  constructor(private readonly clock: Clock) {}

  /** Keeps vehicle.listPrice equal to the latest history row. Call inside a transaction. */
  async changeListPrice(
    tx: Prisma.TransactionClient,
    args: {
      vehicleId: string;
      previousPrice: Prisma.Decimal | number;
      newPrice: number;
      reason: PriceChangeReason;
      changedBy: string;
      actionId?: string;
    },
  ): Promise<VehiclePriceHistory> {
    await tx.vehicle.update({ where: { id: args.vehicleId }, data: { listPrice: args.newPrice } });
    return tx.vehiclePriceHistory.create({
      data: {
        vehicleId: args.vehicleId,
        price: args.newPrice,
        previousPrice: args.previousPrice,
        reason: args.reason,
        actionId: args.actionId ?? null,
        changedBy: args.changedBy,
        changedAt: this.clock.now(),
      },
    });
  }
}
