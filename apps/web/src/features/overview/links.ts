import type { ActionStatus, Bucket } from '@ims/shared';
import { EMPTY_FILTERS, filtersToParams, type InventoryFilters } from '../inventory/filters';

export function inventoryLink(patch: Partial<InventoryFilters>): string {
  const qs = filtersToParams({ ...EMPTY_FILTERS, ...patch }).toString();
  return qs ? `/inventory?${qs}` : '/inventory';
}

export const bucketLink = (bucket: Bucket) => inventoryLink({ bucket: [bucket] });
export const agingActionLink = (status: ActionStatus | 'NONE') =>
  inventoryLink({ bucket: ['AGING'], actionStatus: [status] });

export const NEEDS_ATTENTION_LINKS = {
  noAction: inventoryLink({ badge: ['NO_ACTION'] }),
  stale: inventoryLink({ badge: ['STALE'] }),
  overdue: inventoryLink({ badge: ['OVERDUE'] }),
};
