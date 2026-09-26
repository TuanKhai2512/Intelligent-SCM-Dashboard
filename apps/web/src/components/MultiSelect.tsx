import { useEffect, useId, useRef, useState } from 'react';
import { cn } from './ui';

export interface Option<T extends string> {
  value: T;
  label: string;
}

/**
 * Checkbox dropdown. Closes on a click outside it (which includes opening another
 * MultiSelect, whether by mouse or keyboard) and on Escape, so only one filter
 * dropdown is open at a time.
 */
export function MultiSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T[];
  onChange: (next: T[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = (v: T) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 hover:bg-slate-50',
          open && 'border-slate-500 ring-2 ring-slate-200',
        )}
      >
        {label}
        {value.length > 0 && <span className="rounded-full bg-slate-900 px-1.5 text-xs text-white">{value.length}</span>}
        <span aria-hidden className="text-xs text-slate-400">▾</span>
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="absolute z-20 mt-1 max-h-72 w-60 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"
        >
          {options.length === 0 ? (
            <p className="p-2 text-xs text-slate-500">No options</p>
          ) : (
            options.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
                {o.label}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
