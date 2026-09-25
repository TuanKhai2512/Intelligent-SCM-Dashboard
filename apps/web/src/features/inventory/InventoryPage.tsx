import { BULK_MAX_VEHICLES } from '@ims/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, ErrorState, Spinner } from '../../components/ui';
import { downloadBlob } from '../../lib/download';
import { api } from '../../lib/endpoints';
import { POLL_MS, qk } from '../../lib/query';
import { useDealership } from '../../lib/settings';
import { VehicleDrawer } from '../vehicle/VehicleDrawer';
import { AgingSection } from './AgingSection';
import { BulkActionDialog } from './BulkActionDialog';
import { FilterBar } from './FilterBar';
import { EMPTY_FILTERS, filtersToParams, parseFilters, toApiQuery, updateFilters, type InventoryFilters } from './filters';
import { InventoryTable } from './InventoryTable';
import { Pagination } from './Pagination';

/** Filters and the open vehicle both live in the URL, so any view can be bookmarked or shared. */
export function useInventoryUrlState() {
  const [sp, setSp] = useSearchParams();
  const filters = useMemo(() => parseFilters(sp), [sp]);
  const vehicleId = sp.get('vehicle');

  const setFilters = useCallback(
    (next: InventoryFilters) =>
      setSp((prev) => {
        const out = filtersToParams(next);
        const open = prev.get('vehicle');
        if (open) out.set('vehicle', open);
        return out;
      }),
    [setSp],
  );

  const setVehicleId = useCallback(
    (id: string | null) =>
      setSp((prev) => {
        const out = new URLSearchParams(prev);
        if (id) out.set('vehicle', id);
        else out.delete('vehicle');
        return out;
      }),
    [setSp],
  );

  return { filters, setFilters, vehicleId, setVehicleId };
}

export function InventoryPage() {
  const { filters, setFilters, vehicleId, setVehicleId } = useInventoryUrlState();
  const { timezone, currency } = useDealership();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const query = toApiQuery(filters);
  const list = useQuery({
    queryKey: qk.vehicles(query),
    queryFn: () => api.vehicles(query),
    placeholderData: keepPreviousData,
    refetchInterval: POLL_MS,
  });
  const options = useQuery({ queryKey: qk.filters, queryFn: api.filterOptions, staleTime: 60_000 });

  const change = (patch: Partial<InventoryFilters>) => setFilters(updateFilters(filters, patch));
  const toggle = useCallback(
    (id: string) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else if (next.size < BULK_MAX_VEHICLES) next.add(id);
        return next;
      }),
    [],
  );
  const toggleAll = useCallback(
    (ids: string[], on: boolean) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (!on) {
          ids.forEach((id) => next.delete(id));
          return next;
        }
        for (const id of ids) {
          if (next.has(id)) continue;
          if (next.size >= BULK_MAX_VEHICLES) break;
          next.add(id);
        }
        return next;
      }),
    [],
  );

  const exportCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const { blob, filename } = await api.exportCsv(toApiQuery(filters, { paging: false }));
      downloadBlob(blob, filename);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const count = selected.size;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Inventory & Aging</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportCsv} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
          <Button disabled={count === 0 || count > BULK_MAX_VEHICLES} onClick={() => setBulkOpen(true)}>
            Log action for {count} vehicle{count === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
      {exportError && <ErrorState error={new Error(exportError)} />}
      {count > BULK_MAX_VEHICLES && (
        <p className="text-sm text-amber-700">Select at most {BULK_MAX_VEHICLES} vehicles for one bulk action.</p>
      )}

      <AgingSection selected={selected} onToggle={toggle} onOpen={setVehicleId} />

      <section className="space-y-3">
        <FilterBar filters={filters} options={options.data} onChange={change} onClear={() => setFilters(EMPTY_FILTERS)} />
        {list.error ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data ? (
          <>
            <InventoryTable rows={list.data.items} sort={filters.sort} onSortChange={(sort) => change({ sort })}
              selected={selected} onToggle={toggle} onToggleAll={toggleAll} onOpen={setVehicleId}
              currency={currency} timezone={timezone} />
            <Pagination page={filters.page} pageSize={filters.pageSize} total={list.data.total}
              onPageChange={(page) => change({ page })} onPageSizeChange={(pageSize) => change({ pageSize })} />
          </>
        ) : (
          <Spinner label="Loading inventory" />
        )}
      </section>

      <VehicleDrawer vehicleId={vehicleId} onClose={() => setVehicleId(null)} />
      <BulkActionDialog open={bulkOpen} onOpenChange={setBulkOpen} vehicleIds={[...selected]} timezone={timezone}
        onDone={() => setSelected(new Set())} />
    </div>
  );
}
