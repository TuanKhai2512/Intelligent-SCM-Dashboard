import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, ErrorState, Field, Input, Spinner } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { api } from '../../lib/endpoints';
import { useSettings } from '../../lib/settings';
import { settingsSchema, type SettingsFormValues } from './settings-form';

export function SettingsPage() {
  const qc = useQueryClient();
  const settings = useSettings();
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } =
    useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema) });

  useEffect(() => {
    if (settings.data) {
      const { agingThresholdDays, staleActionDays, dailyHoldingCost, timezone } = settings.data;
      reset({ agingThresholdDays, staleActionDays, dailyHoldingCost, timezone });
    }
  }, [settings.data, reset]);

  const save = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: async () => {
      setSaved(true);
      // Threshold and holding cost change every computed number, so refresh everything.
      await qc.invalidateQueries();
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSaved(false);
    try {
      await save.mutateAsync(values);
    } catch (e) {
      if (e instanceof ApiError && e.details.length) {
        e.details.forEach((d) => setError(d.field as keyof SettingsFormValues, { message: d.message }));
      } else {
        setError('root', { message: e instanceof Error ? e.message : 'Could not save settings' });
      }
    }
  });

  if (settings.error) return <ErrorState error={settings.error} onRetry={() => settings.refetch()} />;
  if (!settings.data) return <Spinner label="Loading settings" />;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card title={settings.data.name}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Aging threshold (days)" htmlFor="threshold" error={errors.agingThresholdDays?.message}
            hint="Vehicles older than this are aging stock. The Watch tier is the 30 days before it.">
            <Input id="threshold" type="number" {...register('agingThresholdDays', { valueAsNumber: true })} />
          </Field>
          <Field label="Stale action limit (days)" htmlFor="stale" error={errors.staleActionDays?.message}
            hint="An in-stock vehicle whose latest action is older than this gets the Stale badge.">
            <Input id="stale" type="number" {...register('staleActionDays', { valueAsNumber: true })} />
          </Field>
          <Field label={`Daily holding cost per vehicle (${settings.data.currency})`} htmlFor="holding"
            error={errors.dailyHoldingCost?.message} hint="Floorplan interest, depreciation and lot space per day.">
            <Input id="holding" type="number" {...register('dailyHoldingCost', { valueAsNumber: true })} />
          </Field>
          <Field label="Timezone" htmlFor="timezone" error={errors.timezone?.message}
            hint="Used for vehicle age, day boundaries and dates.">
            <Input id="timezone" {...register('timezone')} />
          </Field>
          {errors.root && <p role="alert" className="text-sm text-red-600">{errors.root.message}</p>}
          {saved && <p className="text-sm text-green-700">Settings saved.</p>}
          <Button type="submit" disabled={isSubmitting}>Save settings</Button>
        </form>
      </Card>
    </div>
  );
}
