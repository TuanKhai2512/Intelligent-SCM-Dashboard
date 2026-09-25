import { zodResolver } from '@hookform/resolvers/zod';
import {
  ACTION_RULES,
  ACTION_STATUS_LABELS,
  NOTE_MAX_LENGTH,
  dateInTz,
  type BulkActionResult,
} from '@ims/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../components/dialog';
import { Button, Field, Input, Select, Textarea } from '../../components/ui';
import { api } from '../../lib/endpoints';
import { invalidateInventory } from '../../lib/query';
import { BULK_STATUSES, bulkFormSchema, type BulkFormValues } from './bulk-form';

const DEFAULTS: BulkFormValues = { status: 'MARKETING_PUSH', note: '', targetDate: '' };

export function BulkActionDialog({
  open,
  onOpenChange,
  vehicleIds,
  timezone,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleIds: string[];
  timezone: string;
  onDone: (result: BulkActionResult) => void;
}) {
  const qc = useQueryClient();
  const today = dateInTz(new Date(), timezone);
  const schema = useMemo(() => bulkFormSchema(today), [today]);
  const { register, handleSubmit, watch, reset, setError, formState: { errors, isSubmitting } } =
    useForm<BulkFormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const status = watch('status');
  const count = vehicleIds.length;

  const bulk = useMutation({
    mutationFn: (v: BulkFormValues) =>
      api.bulkAction({
        vehicleIds,
        status: v.status,
        ...(v.note?.trim() ? { note: v.note.trim() } : {}),
        ...(v.targetDate ? { targetDate: v.targetDate } : {}),
      }),
    onSuccess: async (result) => {
      reset(DEFAULTS);
      await invalidateInventory(qc);
      onDone(result);
      onOpenChange(false);
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await bulk.mutateAsync(v);
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'Bulk action failed' });
    }
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Log action for ${count} vehicle${count === 1 ? '' : 's'}`}
      description="The same status, note and target date are saved for every selected vehicle. All are saved, or none.">
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <Field label="Status" htmlFor="bulk-status" error={errors.status?.message}>
          <Select id="bulk-status" {...register('status')}>
            {BULK_STATUSES.map((s) => (
              <option key={s} value={s}>{ACTION_STATUS_LABELS[s]}</option>
            ))}
          </Select>
        </Field>
        <Field label={ACTION_RULES[status].targetDate === 'required' ? 'Target date' : 'Target date (optional)'}
          htmlFor="bulk-date" error={errors.targetDate?.message}>
          <Input id="bulk-date" type="date" min={today} {...register('targetDate')} />
        </Field>
        <Field label="Note" htmlFor="bulk-note" error={errors.note?.message}>
          <Textarea id="bulk-note" maxLength={NOTE_MAX_LENGTH} {...register('note')} />
        </Field>
        {errors.root && <p role="alert" className="text-sm text-red-600">{errors.root.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || count === 0}>
            Log for {count} vehicle{count === 1 ? '' : 's'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
