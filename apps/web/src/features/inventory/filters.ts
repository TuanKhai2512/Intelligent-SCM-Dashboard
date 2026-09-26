import {
  ACTION_STATUSES,
  BUCKETS,
  VEHICLE_BADGES,
  VEHICLE_STATUSES,
  type ActionStatus,
  type Bucket,
  type VehicleBadge,
  type VehicleStatus,
} from '@ims/shared';

export type ActionFilter = ActionStatus | 'NONE';

export interface InventoryFilters {
  make: string[];
  model: string[];
  bucket: Bucket[];
  actionStatus: ActionFilter[];
  status: VehicleStatus[];
  badge: VehicleBadge[];
  yearMin?: number;
  yearMax?: number;
  ageMin?: number;
  ageMax?: number;
  priceMin?: number;
  priceMax?: number;
  q: string;
  sort: string;
  page: number;
  pageSize: number;
}

export const SORT_FIELDS = ['age', 'listPrice', 'year', 'make', 'stockedAt', 'latestActionAt'] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export const DEFAULT_SORT = 'age:desc';
export const PAGE_SIZES = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;
const SORT_RE = new RegExp(`^(${SORT_FIELDS.join('|')}):(asc|desc)$`);

const LIST_KEYS = ['make', 'model', 'bucket', 'actionStatus', 'status', 'badge'] as const;
const NUM_KEYS = ['yearMin', 'yearMax', 'ageMin', 'ageMax', 'priceMin', 'priceMax'] as const;
type NumKey = (typeof NUM_KEYS)[number];
/** Mirrors the API DTO: integer years/ages and non-negative ages/prices. */
const INT_KEYS: readonly NumKey[] = ['yearMin', 'yearMax', 'ageMin', 'ageMax'];
const NON_NEGATIVE_KEYS: readonly NumKey[] = ['ageMin', 'ageMax', 'priceMin', 'priceMax'];
const ACTION_FILTERS: readonly ActionFilter[] = [...ACTION_STATUSES, 'NONE'];

export function parseFilters(sp: URLSearchParams): InventoryFilters {
  const list = <T extends string>(key: string, allowed?: readonly T[]): T[] =>
    sp
      .getAll(key)
      .flatMap((v) => v.split(','))
      .map((v) => v.trim())
      .filter((v) => v !== '' && (!allowed || allowed.includes(v as T))) as T[];
  const readNum = (key: string): number | undefined => {
    const raw = sp.get(key);
    if (raw === null || raw.trim() === '') return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  const num = (key: NumKey): number | undefined => {
    const n = readNum(key);
    if (n === undefined) return undefined;
    if (INT_KEYS.includes(key) && !Number.isInteger(n)) return undefined;
    if (NON_NEGATIVE_KEYS.includes(key) && n < 0) return undefined;
    return n;
  };
  const page = readNum('page');
  const pageSize = readNum('pageSize');
  const sort = sp.get('sort') ?? '';

  return {
    make: list('make'),
    model: list('model'),
    bucket: list('bucket', BUCKETS),
    actionStatus: list('actionStatus', ACTION_FILTERS),
    status: list('status', VEHICLE_STATUSES),
    badge: list('badge', VEHICLE_BADGES),
    yearMin: num('yearMin'),
    yearMax: num('yearMax'),
    ageMin: num('ageMin'),
    ageMax: num('ageMax'),
    priceMin: num('priceMin'),
    priceMax: num('priceMax'),
    q: (sp.get('q') ?? '').trim(),
    sort: SORT_RE.test(sort) ? sort : DEFAULT_SORT,
    page: page !== undefined && Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: PAGE_SIZES.includes(pageSize as (typeof PAGE_SIZES)[number]) ? (pageSize as number) : DEFAULT_PAGE_SIZE,
  };
}

const empty = parseFilters(new URLSearchParams());
for (const key of LIST_KEYS) Object.freeze(empty[key]);
export const EMPTY_FILTERS: InventoryFilters = Object.freeze(empty);

/** URL form: omits defaults so links stay short. */
export function filtersToParams(f: InventoryFilters, { paging = true }: { paging?: boolean } = {}): URLSearchParams {
  const sp = new URLSearchParams();
  for (const key of LIST_KEYS) for (const v of f[key]) sp.append(key, v);
  for (const key of NUM_KEYS) if (f[key] !== undefined) sp.set(key, String(f[key]));
  if (f.q) sp.set('q', f.q);
  if (f.sort !== DEFAULT_SORT) sp.set('sort', f.sort);
  if (paging) {
    if (f.page !== 1) sp.set('page', String(f.page));
    if (f.pageSize !== DEFAULT_PAGE_SIZE) sp.set('pageSize', String(f.pageSize));
  }
  return sp;
}

/** API form: always sends sort (and paging unless disabled, e.g. for CSV export). */
export function toApiQuery(f: InventoryFilters, { paging = true }: { paging?: boolean } = {}): string {
  const sp = filtersToParams(f, { paging: false });
  sp.set('sort', f.sort);
  if (paging) {
    sp.set('page', String(f.page));
    sp.set('pageSize', String(f.pageSize));
  }
  return sp.toString();
}

export function updateFilters(f: InventoryFilters, patch: Partial<InventoryFilters>): InventoryFilters {
  return { ...f, ...patch, page: patch.page ?? 1 };
}

export function nextSort(current: string, field: SortField): string {
  const [f, dir] = current.split(':');
  return f === field && dir === 'desc' ? `${field}:asc` : `${field}:desc`;
}
