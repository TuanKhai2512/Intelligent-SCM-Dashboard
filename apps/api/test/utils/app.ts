import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { Clock, FixedClock } from '../../src/common/clock';
import { configureApp } from '../../src/configure-app';
import { PrismaService } from '../../src/prisma/prisma.service';

/** 12:00 local time in Asia/Saigon on 2026-06-15. */
export const TEST_NOW = new Date('2026-06-15T05:00:00.000Z');
export const TODAY = '2026-06-15';
export const YESTERDAY = '2026-06-14';
export const TOMORROW = '2026-06-16';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  clock: FixedClock;
}

export async function createTestApp(
  opts: { clock?: FixedClock; configure?: (b: TestingModuleBuilder) => TestingModuleBuilder } = {},
): Promise<TestApp> {
  const clock = opts.clock ?? new FixedClock(TEST_NOW);
  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue(clock);
  if (opts.configure) builder = opts.configure(builder);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService), clock };
}
