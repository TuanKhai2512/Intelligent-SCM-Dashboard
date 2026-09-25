export interface Option<T extends string> {
  value: T;
  label: string;
}

/** Dropdown of checkboxes built on <details>, so it needs no JS positioning. */
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
  const toggle = (v: T) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <details className="relative">
      <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 hover:bg-slate-50">
        {label}
        {value.length > 0 && <span className="rounded-full bg-slate-900 px-1.5 text-xs text-white">{value.length}</span>}
      </summary>
      <div className="absolute z-20 mt-1 max-h-72 w-60 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
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
    </details>
  );
}
