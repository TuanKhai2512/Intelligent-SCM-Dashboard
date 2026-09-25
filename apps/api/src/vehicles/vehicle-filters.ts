import { Prisma } from '@prisma/client';
import type { ActionStatus, Bucket, VehicleStatus } from '@ims/shared';

export interface VehicleFilters {
  make?: string[];
  model?: string[];
  yearMin?: number;
  yearMax?: number;
  ageMin?: number;
  ageMax?: number;
  bucket?: Bucket[];
  priceMin?: number;
  priceMax?: number;
  actionStatus?: (ActionStatus | 'NONE')[];
  status?: VehicleStatus[];
  q?: string;
}

export const SORT_FIELDS = ['age', 'listPrice', 'year', 'make', 'stockedAt', 'latestActionAt'] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export const DEFAULT_SORT = 'age:desc';

const SORT_COLUMNS: Record<SortField, string> = {
  age: 'vs.age_days',
  listPrice: 'vs.list_price',
  year: 'vs.year',
  make: 'vs.make',
  stockedAt: 'vs.stocked_at',
  latestActionAt: 'vs.latest_action_at',
};

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

/** Filters apply to the `vs` alias of vehicleSummary(). */
export function buildVehicleWhere(f: VehicleFilters): Prisma.Sql {
  const c: Prisma.Sql[] = [];
  const statuses = f.status?.length ? f.status : ['IN_STOCK'];
  c.push(Prisma.sql`vs.status IN (${Prisma.join(statuses)})`);
  if (f.make?.length) c.push(Prisma.sql`vs.make IN (${Prisma.join(f.make)})`);
  if (f.model?.length) c.push(Prisma.sql`vs.model IN (${Prisma.join(f.model)})`);
  if (f.yearMin !== undefined) c.push(Prisma.sql`vs.year >= ${f.yearMin}`);
  if (f.yearMax !== undefined) c.push(Prisma.sql`vs.year <= ${f.yearMax}`);
  if (f.ageMin !== undefined) c.push(Prisma.sql`vs.age_days >= ${f.ageMin}`);
  if (f.ageMax !== undefined) c.push(Prisma.sql`vs.age_days <= ${f.ageMax}`);
  if (f.bucket?.length) c.push(Prisma.sql`vs.bucket IN (${Prisma.join(f.bucket)})`);
  if (f.priceMin !== undefined) c.push(Prisma.sql`vs.list_price >= ${f.priceMin}`);
  if (f.priceMax !== undefined) c.push(Prisma.sql`vs.list_price <= ${f.priceMax}`);
  if (f.actionStatus?.length) {
    const named = f.actionStatus.filter((s) => s !== 'NONE');
    const parts: Prisma.Sql[] = [];
    if (named.length) parts.push(Prisma.sql`vs.latest_action_status IN (${Prisma.join(named)})`);
    if (f.actionStatus.includes('NONE')) parts.push(Prisma.sql`vs.latest_action_id IS NULL`);
    c.push(Prisma.sql`(${Prisma.join(parts, ' OR ')})`);
  }
  if (f.q) {
    const like = `%${escapeLike(f.q.trim())}%`;
    c.push(
      Prisma.sql`(vs.vin ILIKE ${like} OR vs.make ILIKE ${like} OR vs.model ILIKE ${like} OR (vs.make || ' ' || vs.model) ILIKE ${like})`,
    );
  }
  return Prisma.join(c, ' AND ');
}

/** `sort` is validated by the DTO; unknown values fall back to the default. */
export function buildOrderBy(sort: string | undefined): Prisma.Sql {
  const [field, dir] = (sort ?? DEFAULT_SORT).split(':');
  const column = SORT_COLUMNS[field as SortField] ?? SORT_COLUMNS.age;
  return Prisma.raw(`${column} ${dir === 'asc' ? 'ASC' : 'DESC'} NULLS LAST, vs.id ASC`);
}
