import { Button, Select } from '../../components/ui';
import { formatNumber } from '../../lib/format';
import { PAGE_SIZES } from './filters';

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
      <span className="whitespace-nowrap">
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}
      </span>
      <div className="flex items-center gap-2">
        <Select aria-label="Rows per page" className="w-20" value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}>
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </Select>
        <Button variant="secondary" size="sm" disabled={current <= 1} onClick={() => onPageChange(current - 1)}>
          Previous
        </Button>
        <span className="whitespace-nowrap">Page {current} of {pages}</span>
        <Button variant="secondary" size="sm" disabled={current >= pages} onClick={() => onPageChange(current + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
