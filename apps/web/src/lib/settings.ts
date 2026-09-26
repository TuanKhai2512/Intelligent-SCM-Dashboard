import type { DealershipSettings } from '@ims/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from './endpoints';
import { qk } from './query';

export function useSettings() {
  return useQuery({ queryKey: qk.settings, queryFn: api.settings, staleTime: 5 * 60_000 });
}

/** Dealership display settings with safe defaults while loading. */
export function useDealership(): {
  timezone: string;
  currency: string;
  thresholdDays: number;
  settings?: DealershipSettings;
} {
  const { data } = useSettings();
  return {
    timezone: data?.timezone ?? 'Asia/Saigon',
    currency: data?.currency ?? 'VND',
    thresholdDays: data?.agingThresholdDays ?? 90,
    settings: data,
  };
}
