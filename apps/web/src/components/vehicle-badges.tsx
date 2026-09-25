import type { Bucket, Suggestion, VehicleView } from '@ims/shared';
import { BUCKET_LABELS, suggestionLabel } from '../lib/labels';
import { Badge, type Tone } from './ui';

export const BUCKET_TONE: Record<Bucket, Tone> = { FRESH: 'green', NORMAL: 'blue', WATCH: 'amber', AGING: 'red' };

export function BucketBadge({ bucket }: { bucket: Bucket | null }) {
  if (!bucket) return <Badge>Closed</Badge>;
  return <Badge tone={BUCKET_TONE[bucket]}>{BUCKET_LABELS[bucket]}</Badge>;
}

export function VehicleBadges({ badges }: { badges: VehicleView['badges'] }) {
  if (!badges.noAction && !badges.stale && !badges.overdue) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {badges.noAction && <Badge tone="red">No action</Badge>}
      {badges.stale && <Badge tone="amber">Stale action</Badge>}
      {badges.overdue && <Badge tone="amber">Overdue plan</Badge>}
    </div>
  );
}

export function SuggestionChip({ suggestion, onApply }: { suggestion: Suggestion; onApply: () => void }) {
  return (
    <button
      type="button"
      title={suggestion.reason}
      onClick={(e) => {
        e.stopPropagation();
        onApply();
      }}
      className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs text-violet-800 hover:bg-violet-100"
    >
      {suggestionLabel(suggestion)} · {suggestion.reason}
    </button>
  );
}
