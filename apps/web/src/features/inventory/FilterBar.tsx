import {
  ACTION_STATUSES,
  ACTION_STATUS_LABELS,
  BUCKETS,
  VEHICLE_BADGES,
  VEHICLE_STATUSES,
  type FilterOptions,
} from '@ims/shared';
import { useEffect, useRef, useState } from 'react';
import { MultiSelect } from '../../components/MultiSelect';
import { RangeInput } from '../../components/RangeInput';
import { Button, Input } from '../../components/ui';
import { BADGE_LABELS, BUCKET_LABELS, VEHICLE_STATUS_LABELS } from '../../lib/labels';
import type { ActionFilter, InventoryFilters } from './filters';

const MILLION = 1_000_000;

function SearchInput({ value, onCommit }: { value: string; onCommit: (q: string) => void }) {
  const [text, setText] = useState(value);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text.trim() === value) return;
    const t = setTimeout(() => commitRef.current(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text, value]);

  return (
    <Input aria-label="Search VIN, make or model" placeholder="Search VIN, make or model" className="w-64"
      value={text} onChange={(e) => setText(e.target.value)} />
  );
}

export function FilterBar({
  filters,
  options,
  onChange,
  onClear,
}: {
  filters: InventoryFilters;
  options?: FilterOptions;
  onChange: (patch: Partial<InventoryFilters>) => void;
  onClear: () => void;
}) {
  const makes = options?.makes ?? [];
  const modelsFor = (selected: string[]) =>
    (selected.length ? makes.filter((m) => selected.includes(m.make)) : makes).flatMap((m) => m.models);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <SearchInput value={filters.q} onCommit={(q) => onChange({ q })} />
      <MultiSelect
        label="Make"
        options={makes.map((m) => ({ value: m.make, label: m.make }))}
        value={filters.make}
        onChange={(make) => {
          const allowed = new Set(modelsFor(make));
          onChange({ make, model: filters.model.filter((m) => allowed.has(m)) });
        }}
      />
      <MultiSelect
        label="Model"
        options={[...new Set(modelsFor(filters.make))].map((m) => ({ value: m, label: m }))}
        value={filters.model}
        onChange={(model) => onChange({ model })}
      />
      <MultiSelect
        label="Age bucket"
        options={BUCKETS.map((b) => ({ value: b, label: BUCKET_LABELS[b] }))}
        value={filters.bucket}
        onChange={(bucket) => onChange({ bucket })}
      />
      <MultiSelect<ActionFilter>
        label="Latest action"
        options={[
          { value: 'NONE', label: 'No action' },
          ...ACTION_STATUSES.map((s) => ({ value: s, label: ACTION_STATUS_LABELS[s] })),
        ]}
        value={filters.actionStatus}
        onChange={(actionStatus) => onChange({ actionStatus })}
      />
      <MultiSelect
        label="Needs attention"
        options={VEHICLE_BADGES.map((b) => ({ value: b, label: BADGE_LABELS[b] }))}
        value={filters.badge}
        onChange={(badge) => onChange({ badge })}
      />
      <MultiSelect
        label="Status"
        options={VEHICLE_STATUSES.map((s) => ({ value: s, label: VEHICLE_STATUS_LABELS[s] }))}
        value={filters.status}
        onChange={(status) => onChange({ status })}
      />
      <RangeInput label="Year" min={filters.yearMin} max={filters.yearMax}
        onCommit={(yearMin, yearMax) => onChange({ yearMin, yearMax })} />
      <RangeInput label="Age (days)" min={filters.ageMin} max={filters.ageMax}
        onCommit={(ageMin, ageMax) => onChange({ ageMin, ageMax })} />
      <RangeInput label="Price (M)" scale={MILLION} min={filters.priceMin} max={filters.priceMax}
        onCommit={(priceMin, priceMax) => onChange({ priceMin, priceMax })} />
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
