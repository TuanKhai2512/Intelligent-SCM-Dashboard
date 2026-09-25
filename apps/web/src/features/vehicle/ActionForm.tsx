import { zodResolver } from '@hookform/resolvers/zod';
import {
  ACTION_RULES,
  ACTION_STATUSES,
  ACTION_STATUS_LABELS,
  NOTE_MAX_LENGTH,
  actionWarnings,
  dateInTz,
  type CreateActionResult,
  type Suggestion,
  type VehicleDetail,
} from '@ims/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { SuggestionChip } from '../../components/vehicle-badges';
import { Button, Field, Input, Select, Textarea } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { api, type CreateActionBody } from '../../lib/endpoints';
import { addDays, formatMoney } from '../../lib/format';
import { invalidateInventory } from '../../lib/query';
import { actionFormSchema, toActionBody, type ActionFormValues } from './action-form';

type FieldName = 'status' | 'note' | 'targetDate' | 'newPrice';
const FIELDS: FieldName[] = ['status', 'note', 'targetDate', 'newPrice'];
const DEFAULTS: ActionFormValues = { status: 'MARKETING_PUSH', note: '', targetDate: '' };

export function ActionForm({
  vehicle,
  timezone,
  currency,
  onSaved,
}: {
  vehicle: VehicleDetail;
  timezone: string;
  currency: string;
  onSaved?: (result: CreateActionResult) => void;
}) {
  const qc = useQueryClient();
  const today = dateInTz(new Date(), timezone);
  const schema = useMemo(() => actionFormSchema({ today, currentPrice: vehicle.listPrice }), [today, vehicle.listPrice]);
  const { register, handleSubmit, watch, setValue, setError, reset, formState: { errors, isSubmitting } } =
    useForm<ActionFormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  const status = watch('status');
  const newPrice = watch('newPrice');
  const suggestionCode = watch('suggestionCode');
  const rule = ACTION_RULES[status];
  const warnings = actionWarnings({ status, newPrice: newPrice as number | undefined }, vehicle.listPrice);

  const mutation = useMutation({
    mutationFn: (body: CreateActionBody) => api.createAction(vehicle.id, body),
    onSuccess: async (result) => {
      reset(DEFAULTS);
      await invalidateInventory(qc);
      onSaved?.(result);
    },
  });

  const applySuggestion = (s: Suggestion) => {
    setValue('suggestionCode', s.code);
    if (s.suggestedStatus) {
      setValue('status', s.suggestedStatus);
      if (ACTION_RULES[s.suggestedStatus].targetDate === 'required') setValue('targetDate', addDays(today, 7));
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(toActionBody(values));
    } catch (e) {
      const known = e instanceof ApiError ? e.details.filter((d) => FIELDS.includes(d.field as FieldName)) : [];
      if (known.length) known.forEach((d) => setError(d.field as FieldName, { message: d.message }));
      else setError('root', { message: e instanceof Error ? e.message : 'Could not save the action' });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      {vehicle.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {vehicle.suggestions.map((s) => (
            <SuggestionChip key={s.code} suggestion={s} onApply={() => applySuggestion(s)} />
          ))}
        </div>
      )}
      <Field label="Status" htmlFor="action-status" error={errors.status?.message}>
        <Select id="action-status" {...register('status')}>
          {ACTION_STATUSES.map((s) => (
            <option key={s} value={s}>{ACTION_STATUS_LABELS[s]}</option>
          ))}
        </Select>
      </Field>
      {status === 'PRICE_REDUCED' && (
        <Field label={`New price (${currency})`} htmlFor="action-price" error={errors.newPrice?.message}
          hint={`Current list price: ${formatMoney(vehicle.listPrice, currency)}`}>
          <Input id="action-price" type="number" inputMode="numeric" min={1}
            aria-invalid={errors.newPrice ? true : undefined}
            {...register('newPrice', { setValueAs: (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)) })} />
        </Field>
      )}
      <Field label={rule.targetDate === 'required' ? 'Target date' : 'Target date (optional)'} htmlFor="action-date"
        error={errors.targetDate?.message}>
        <Input id="action-date" type="date" min={today} aria-invalid={errors.targetDate ? true : undefined} {...register('targetDate')} />
      </Field>
      <Field label="Note" htmlFor="action-note" error={errors.note?.message}>
        <Textarea id="action-note" maxLength={NOTE_MAX_LENGTH} {...register('note')} />
      </Field>
      {warnings.includes('PRICE_INCREASED') && (
        <p className="text-xs text-amber-700">The new price is higher than the current list price.</p>
      )}
      {suggestionCode && (
        <p className="text-xs text-violet-700">
          Logged as an accepted suggestion ({suggestionCode}).{' '}
          <button type="button" className="underline" onClick={() => setValue('suggestionCode', undefined)}>
            Remove
          </button>
        </p>
      )}
      {errors.root && (
        <p role="alert" className="text-sm text-red-600">{errors.root.message}</p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        Log action
      </Button>
    </form>
  );
}
