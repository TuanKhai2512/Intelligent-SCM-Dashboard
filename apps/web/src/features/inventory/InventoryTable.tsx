import { ACTION_STATUS_LABELS, type VehicleView } from '@ims/shared';
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import clsx from 'clsx';
import { useMemo } from 'react';
import { BucketBadge, VehicleBadges } from '../../components/vehicle-badges';
import { formatDate, formatMoney, formatMoneyCompact, formatNumber } from '../../lib/format';
import { nextSort, type SortField } from './filters';

const SORTABLE: Record<string, SortField> = {
  vehicle: 'make',
  year: 'year',
  listPrice: 'listPrice',
  age: 'age',
  latestAction: 'latestActionAt',
};

interface Props {
  rows: VehicleView[];
  sort: string;
  onSortChange: (sort: string) => void;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], on: boolean) => void;
  onOpen: (id: string) => void;
  currency: string;
  timezone: string;
}

export function InventoryTable({ rows, sort, onSortChange, selected, onToggle, onToggleAll, onOpen, currency, timezone }: Props) {
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const columns = useMemo<ColumnDef<VehicleView>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <input type="checkbox" aria-label="Select all on this page" checked={allSelected}
            onChange={(e) => onToggleAll(rows.map((r) => r.id), e.target.checked)} />
        ),
        cell: ({ row }) => (
          <input type="checkbox" aria-label={`Select ${row.original.vin}`} checked={selected.has(row.original.id)}
            onClick={(e) => e.stopPropagation()} onChange={() => onToggle(row.original.id)} />
        ),
      },
      {
        id: 'vehicle',
        header: 'Vehicle',
        cell: ({ row: { original: v } }) => (
          <div>
            <div className="font-medium">{v.make} {v.model}</div>
            <div className="font-mono text-xs text-slate-500">{v.vin}</div>
          </div>
        ),
      },
      { id: 'year', header: 'Year', cell: ({ row }) => row.original.year },
      { id: 'color', header: 'Color', cell: ({ row }) => row.original.color ?? '—' },
      { id: 'mileage', header: 'Mileage', cell: ({ row }) => `${formatNumber(row.original.mileage)} km` },
      { id: 'listPrice', header: 'List price', cell: ({ row }) => formatMoney(row.original.listPrice, currency) },
      {
        id: 'age',
        header: 'Age',
        cell: ({ row: { original: v } }) => (
          <div className="flex items-center gap-2">
            <span className="tabular-nums">{v.ageDays} d</span>
            <BucketBadge bucket={v.bucket} />
          </div>
        ),
      },
      { id: 'holdingCost', header: 'Holding cost', cell: ({ row }) => formatMoneyCompact(row.original.holdingCost, currency) },
      {
        id: 'latestAction',
        header: 'Latest action',
        cell: ({ row: { original: v } }) =>
          v.latestAction ? (
            <div>
              <div>{ACTION_STATUS_LABELS[v.latestAction.status]}</div>
              <div className="text-xs text-slate-500">{formatDate(v.latestAction.createdAt, timezone)}</div>
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      { id: 'flags', header: 'Flags', cell: ({ row }) => <VehicleBadges badges={row.original.badges} /> },
    ],
    [rows, selected, allSelected, currency, timezone, onToggle, onToggleAll],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (r) => r.id,
    manualSorting: true,
    manualPagination: true,
  });
  const [sortField, sortDir] = sort.split(':');

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => {
                const field = SORTABLE[h.column.id];
                const active = field !== undefined && field === sortField;
                const content = flexRender(h.column.columnDef.header, h.getContext());
                return (
                  <th key={h.id} className="whitespace-nowrap px-3 py-2 font-medium"
                    aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {field ? (
                      <button type="button" className="inline-flex items-center gap-1 uppercase hover:text-slate-900"
                        onClick={() => onSortChange(nextSort(sort, field))}>
                        {content}
                        <span aria-hidden>{active ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
                      </button>
                    ) : (
                      content
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-6 text-center text-slate-500">
                No vehicles match these filters.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((r) => (
              <tr key={r.id} onClick={() => onOpen(r.original.id)}
                className={clsx('cursor-pointer border-t border-slate-100 hover:bg-slate-50', selected.has(r.id) && 'bg-sky-50')}>
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="whitespace-nowrap px-3 py-2 align-middle">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
