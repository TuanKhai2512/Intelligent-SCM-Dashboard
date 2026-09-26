import type { Bucket } from './buckets';
import type {
  ActionSource,
  ActionStatus,
  PriceChangeReason,
  Role,
  SuggestionCode,
  VehicleStatus,
} from './enums';

export interface FieldError {
  field: string;
  message: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EmployeeRef {
  id: string;
  fullName: string;
}

export interface Suggestion {
  code: SuggestionCode;
  /** Status to pre-fill in the action form; null means "review the plan". */
  suggestedStatus: ActionStatus | null;
  reason: string;
}

export interface LatestActionView {
  id: string;
  status: ActionStatus;
  createdAt: string;
  targetDate: string | null;
  note: string | null;
  daysAgo: number;
}

export interface VehicleView {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  color: string | null;
  mileage: number;
  purchaseCost: number;
  listPrice: number;
  salePrice: number | null;
  status: VehicleStatus;
  stockedAt: string;
  soldAt: string | null;
  ageDays: number;
  /** null when the vehicle is no longer in stock */
  bucket: Bucket | null;
  holdingCost: number;
  everReduced: boolean;
  latestAction: LatestActionView | null;
  badges: { noAction: boolean; stale: boolean; overdue: boolean };
  suggestions: Suggestion[];
}

export interface ActionView {
  id: string;
  vehicleId: string;
  status: ActionStatus;
  note: string | null;
  targetDate: string | null;
  newPrice: number | null;
  source: ActionSource;
  suggestionCode: SuggestionCode | null;
  bulkId: string | null;
  editedAt: string | null;
  createdAt: string;
  createdBy: EmployeeRef;
}

export interface PriceHistoryView {
  id: string;
  price: number;
  previousPrice: number | null;
  reason: PriceChangeReason;
  actionId: string | null;
  changedAt: string;
  changedBy: EmployeeRef;
}

export interface VehicleDetail extends VehicleView {
  actions: ActionView[];
  priceHistory: PriceHistoryView[];
}

export type ActionWarning = 'PRICE_INCREASED';

export interface CreateActionResult {
  action: ActionView;
  warnings: ActionWarning[];
}

export interface BulkActionResult {
  bulkId: string;
  count: number;
}

export interface AgingSummary {
  thresholdDays: number;
  totalInStock: number;
  agingCount: number;
  watchCount: number;
  /** aging share of in-stock vehicles, 0–100, one decimal */
  agingPct: number;
  /** sum of purchase cost of aging vehicles */
  capitalTiedUp: number;
  /** sum of holding cost so far of aging vehicles */
  holdingCostSoFar: number;
}

/** Summary only; the lists come from GET /vehicles?bucket=AGING|WATCH (paginated). */
export interface AgingReport {
  summary: AgingSummary;
}

export interface OverviewReport {
  totalInStock: number;
  avgAgeDays: number;
  agingCount: number;
  agingPct: number;
  capitalTiedUp: number;
  holdingCostSoFar: number;
  needsAttention: { noAction: number; stale: number; overdue: number };
}

export interface BucketCount {
  bucket: Bucket;
  count: number;
}

export interface ActionStatusCount {
  status: ActionStatus | 'NONE';
  count: number;
}

export interface FilterOptions {
  makes: { make: string; models: string[] }[];
  year: { min: number | null; max: number | null };
  price: { min: number | null; max: number | null };
}

export interface DealershipSettings {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  agingThresholdDays: number;
  staleActionDays: number;
  dailyHoldingCost: number;
}

export interface AuthUserView {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  dealershipId: string;
}

export interface LoginResult {
  accessToken: string;
}
