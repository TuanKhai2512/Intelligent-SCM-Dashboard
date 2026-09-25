import { PrismaClient } from '@prisma/client';
import { runSeed } from './seed';

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await runSeed(prisma, { now: new Date(), reset: process.argv.includes('--reset') });
    console.log(result.skipped ? 'Seed skipped: data already exists' : `Seeded ${result.vehicles} vehicles`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
