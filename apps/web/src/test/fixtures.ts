import type {
  ActionView,
  AuthUserView,
  DealershipSettings,
  Paginated,
  VehicleDetail,
  VehicleView,
} from '@ims/shared';

export const ME: AuthUserView = {
  id: 'mgr-1',
  fullName: 'Minh Tran',
  email: 'manager@demo.local',
  role: 'MANAGER',
  dealershipId: 'd-1',
};

export const SETTINGS: DealershipSettings = {
  id: 'd-1',
  name: 'Saigon Auto Center',
  timezone: 'Asia/Saigon',
  currency: 'VND',
  agingThresholdDays: 90,
  staleActionDays: 14,
  dailyHoldingCost: 150_000,
};

let seq = 0;

export function makeVehicle(o: Partial<VehicleView> = {}): VehicleView {
  seq += 1;
  return {
    id: `veh-${seq}`,
    vin: `VIN${String(seq).padStart(14, '0')}`,
    make: 'Toyota',
    model: 'Vios',
    year: 2024,
    trim: null,
    color: 'White',
    mileage: 10_000,
    purchaseCost: 450_000_000,
    listPrice: 500_000_000,
    salePrice: null,
    status: 'IN_STOCK',
    stockedAt: '2026-03-01T03:00:00.000Z',
    soldAt: null,
    ageDays: 10,
    bucket: 'FRESH',
    holdingCost: 1_500_000,
    everReduced: false,
    latestAction: null,
    badges: { noAction: false, stale: false, overdue: false },
    suggestions: [],
    ...o,
  };
}

export function makeDetail(o: Partial<VehicleDetail> = {}): VehicleDetail {
  return { ...makeVehicle(), actions: [], priceHistory: [], ...o };
}

export function makeAction(o: Partial<ActionView> = {}): ActionView {
  seq += 1;
  return {
    id: `act-${seq}`,
    vehicleId: 'veh-1',
    status: 'MARKETING_PUSH',
    note: null,
    targetDate: null,
    newPrice: null,
    source: 'MANUAL',
    suggestionCode: null,
    bulkId: null,
    editedAt: null,
    createdAt: '2026-06-15T05:00:00.000Z',
    createdBy: { id: ME.id, fullName: ME.fullName },
    ...o,
  };
}

export function paginated<T>(items: T[], total = items.length): Paginated<T> {
  return { items, total, page: 1, pageSize: 25 };
}
