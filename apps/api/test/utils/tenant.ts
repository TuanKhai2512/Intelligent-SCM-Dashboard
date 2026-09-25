import { INestApplication } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import type { TestApp } from './app';

export const PASSWORD = 'Password123!';
let passwordHash: string | undefined;

export interface Tenant {
  dealershipId: string;
  managerId: string;
  email: string;
  token: string;
}

export function createDealership(
  prisma: PrismaClient,
  overrides: Partial<Prisma.DealershipUncheckedCreateInput> = {},
) {
  return prisma.dealership.create({
    data: {
      name: 'Test Motors',
      timezone: 'Asia/Saigon',
      currency: 'VND',
      agingThresholdDays: 90,
      staleActionDays: 14,
      dailyHoldingCost: 150_000,
      ...overrides,
    },
  });
}

export async function createManager(
  prisma: PrismaClient,
  dealershipId: string,
  email: string,
  overrides: Partial<Prisma.EmployeeUncheckedCreateInput> = {},
) {
  passwordHash ??= await bcrypt.hash(PASSWORD, 4);
  return prisma.employee.create({
    data: { dealershipId, fullName: 'Test Manager', email, passwordHash, role: 'MANAGER', ...overrides },
  });
}

export async function login(app: INestApplication, email: string, password = PASSWORD): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  return res.body.accessToken as string;
}

export async function setupTenant(
  t: TestApp,
  opts: { email?: string; dealership?: Partial<Prisma.DealershipUncheckedCreateInput> } = {},
): Promise<Tenant> {
  const email = opts.email ?? 'manager@test.local';
  const dealership = await createDealership(t.prisma, opts.dealership);
  const manager = await createManager(t.prisma, dealership.id, email);
  const token = await login(t.app, email);
  return { dealershipId: dealership.id, managerId: manager.id, email, token };
}

export function api(app: INestApplication, token?: string) {
  const server = app.getHttpServer();
  const auth = (req: request.Test) => (token ? req.set('Authorization', `Bearer ${token}`) : req);
  return {
    get: (url: string) => auth(request(server).get(url)),
    post: (url: string) => auth(request(server).post(url)),
    patch: (url: string) => auth(request(server).patch(url)),
  };
}
