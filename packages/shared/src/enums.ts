export const ROLES = ['MANAGER'] as const;
export type Role = (typeof ROLES)[number];

export const VEHICLE_STATUSES = ['IN_STOCK', 'SOLD', 'WHOLESALED'] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const ACTION_STATUSES = [
  'PRICE_REDUCTION_PLANNED',
  'PRICE_REDUCED',
  'MARKETING_PUSH',
  'TRANSFER_PLANNED',
  'SEND_TO_AUCTION',
  'RECONDITIONING',
  'ON_HOLD',
] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  PRICE_REDUCTION_PLANNED: 'Price Reduction Planned',
  PRICE_REDUCED: 'Price Reduced',
  MARKETING_PUSH: 'Marketing Push',
  TRANSFER_PLANNED: 'Transfer Planned',
  SEND_TO_AUCTION: 'Send to Auction',
  RECONDITIONING: 'Reconditioning',
  ON_HOLD: 'On Hold',
};

export const ACTION_SOURCES = ['MANUAL', 'SUGGESTION'] as const;
export type ActionSource = (typeof ACTION_SOURCES)[number];

export const PRICE_CHANGE_REASONS = ['INITIAL', 'PRICE_REDUCED_ACTION', 'MANUAL_EDIT'] as const;
export type PriceChangeReason = (typeof PRICE_CHANGE_REASONS)[number];

export const SUGGESTION_CODES = ['NEVER_REDUCED', 'STALE_PLAN', 'AUCTION', 'ABOUT_TO_AGE'] as const;
export type SuggestionCode = (typeof SUGGESTION_CODES)[number];

export const VEHICLE_BADGES = ['NO_ACTION', 'STALE', 'OVERDUE'] as const;
export type VehicleBadge = (typeof VEHICLE_BADGES)[number];
