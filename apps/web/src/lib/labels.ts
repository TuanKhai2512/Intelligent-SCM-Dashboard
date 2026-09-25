import {
  ACTION_STATUS_LABELS,
  type Bucket,
  type Suggestion,
  type VehicleBadge,
  type VehicleStatus,
} from '@ims/shared';

export const BUCKET_LABELS: Record<Bucket, string> = {
  FRESH: 'Fresh',
  NORMAL: 'Normal',
  WATCH: 'Watch',
  AGING: 'Aging',
};

/** Filter labels; "Aging, no action" avoids clashing with the "No action" latest-action option. */
export const BADGE_LABELS: Record<VehicleBadge, string> = {
  NO_ACTION: 'Aging, no action',
  STALE: 'Stale action',
  OVERDUE: 'Overdue plan',
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  IN_STOCK: 'In stock',
  SOLD: 'Sold',
  WHOLESALED: 'Wholesaled',
};

export function suggestionLabel(s: Suggestion): string {
  return s.suggestedStatus ? `Suggested: ${ACTION_STATUS_LABELS[s.suggestedStatus]}` : 'Suggested: review the plan';
}
