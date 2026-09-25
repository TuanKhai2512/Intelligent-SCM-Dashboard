import { useEffect, useState } from 'react';
import { Input } from './ui';

/** Two number inputs that commit on blur or Enter. `scale` converts display units (e.g. millions). */
export function RangeInput({
  label,
  min,
  max,
  scale = 1,
  onCommit,
}: {
  label: string;
  min?: number;
  max?: number;
  scale?: number;
  onCommit: (min: number | undefined, max: number | undefined) => void;
}) {
  const [lo, setLo] = useState('');
  const [hi, setHi] = useState('');

  useEffect(() => {
    setLo(min === undefined ? '' : String(min / scale));
    setHi(max === undefined ? '' : String(max / scale));
  }, [min, max, scale]);

  const parse = (s: string) => (s.trim() === '' ? undefined : Number(s) * scale);
  const commit = () => {
    const a = parse(lo);
    const b = parse(hi);
    if ((a !== undefined && !Number.isFinite(a)) || (b !== undefined && !Number.isFinite(b))) return;
    if (a !== min || b !== max) onCommit(a, b);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
  };

  return (
    <fieldset>
      <legend className="mb-1 text-xs font-medium text-slate-600">{label}</legend>
      <div className="flex items-center gap-1">
        <Input aria-label={`${label} from`} className="w-20" inputMode="numeric" placeholder="min" value={lo}
          onChange={(e) => setLo(e.target.value)} onBlur={commit} onKeyDown={onKeyDown} />
        <span className="text-slate-400">–</span>
        <Input aria-label={`${label} to`} className="w-20" inputMode="numeric" placeholder="max" value={hi}
          onChange={(e) => setHi(e.target.value)} onBlur={commit} onKeyDown={onKeyDown} />
      </div>
    </fieldset>
  );
}
