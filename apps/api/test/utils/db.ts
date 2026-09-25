import type { PrismaClient } from '@prisma/client';

export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE vehicle_actions, vehicle_price_history, vehicles, employees, dealerships CASCADE',
  );
}
