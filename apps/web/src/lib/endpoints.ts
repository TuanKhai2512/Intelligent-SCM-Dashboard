import type {
  ActionStatus,
  ActionStatusCount,
  ActionView,
  AgingReport,
  AuthUserView,
  BucketCount,
  BulkActionResult,
  CreateActionResult,
  DealershipSettings,
  FilterOptions,
  LoginResult,
  OverviewReport,
  Paginated,
  SuggestionCode,
  VehicleDetail,
  VehicleView,
} from '@ims/shared';
import { apiFetch, apiRaw, json } from './api';

export interface CreateActionBody {
  status: ActionStatus;
  note?: string;
  targetDate?: string;
  newPrice?: number;
  suggestionCode?: SuggestionCode;
}

export interface BulkActionBody extends Omit<CreateActionBody, 'newPrice'> {
  vehicleIds: string[];
}

export type SettingsPatch = Partial<
  Pick<DealershipSettings, 'agingThresholdDays' | 'staleActionDays' | 'dailyHoldingCost' | 'timezone'>
>;

const post = (body: unknown): RequestInit => ({ method: 'POST', ...json(body) });
const patch = (body: unknown): RequestInit => ({ method: 'PATCH', ...json(body) });

export const api = {
  login: (email: string, password: string) => apiFetch<LoginResult>('/auth/login', post({ email, password })),
  me: () => apiFetch<AuthUserView>('/auth/me'),
  settings: () => apiFetch<DealershipSettings>('/dealership/settings'),
  updateSettings: (body: SettingsPatch) => apiFetch<DealershipSettings>('/dealership/settings', patch(body)),
  vehicles: (query: string) => apiFetch<Paginated<VehicleView>>(`/vehicles?${query}`),
  filterOptions: () => apiFetch<FilterOptions>('/vehicles/filters'),
  aging: () => apiFetch<AgingReport>('/vehicles/aging'),
  vehicle: (id: string) => apiFetch<VehicleDetail>(`/vehicles/${id}`),
  createAction: (vehicleId: string, body: CreateActionBody) =>
    apiFetch<CreateActionResult>(`/vehicles/${vehicleId}/actions`, post(body)),
  bulkAction: (body: BulkActionBody) => apiFetch<BulkActionResult>('/actions/bulk', post(body)),
  updateNote: (actionId: string, note: string) => apiFetch<ActionView>(`/actions/${actionId}/note`, patch({ note })),
  closeVehicle: (id: string, kind: 'sell' | 'wholesale', body: { salePrice: number }) =>
    apiFetch<VehicleDetail>(`/vehicles/${id}/${kind}`, post(body)),
  overview: () => apiFetch<OverviewReport>('/reports/overview'),
  ageDistribution: () => apiFetch<BucketCount[]>('/reports/age-distribution'),
  agingActions: () => apiFetch<ActionStatusCount[]>('/reports/aging-actions'),
  async exportCsv(query: string): Promise<{ blob: Blob; filename: string }> {
    const res = await apiRaw(`/vehicles/export.csv?${query}`);
    const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '');
    return { blob: await res.blob(), filename: match?.[1] ?? 'inventory.csv' };
  },
};
