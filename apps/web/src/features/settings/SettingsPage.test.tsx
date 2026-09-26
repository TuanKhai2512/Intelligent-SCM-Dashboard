import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../../lib/api';
import { ME, SETTINGS } from '../../test/fixtures';
import { mockApi } from '../../test/mock-api';
import { renderWithProviders } from '../../test/render';
import { isValidTimeZone, settingsSchema } from './settings-form';
import { SettingsPage } from './SettingsPage';

describe('settingsSchema', () => {
  it('enforces the API ranges', () => {
    const ok = { agingThresholdDays: 90, staleActionDays: 14, dailyHoldingCost: 150000, timezone: 'Asia/Saigon' };
    expect(settingsSchema.safeParse(ok).success).toBe(true);
    expect(settingsSchema.safeParse({ ...ok, agingThresholdDays: 59 }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, staleActionDays: 0 }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...ok, dailyHoldingCost: -1 }).success).toBe(false);
    expect(isValidTimeZone('Mars/Base')).toBe(false);
  });
});

describe('SettingsPage', () => {
  it('loads settings, validates and saves changes', async () => {
    tokenStore.set('tok-1');
    const patch = vi.fn((body: unknown) => ({ ...SETTINGS, ...(body as object) }));
    mockApi({
      'GET /api/auth/me': ME,
      'GET /api/dealership/settings': SETTINGS,
      'PATCH /api/dealership/settings': ({ body }: { body: unknown }) => patch(body),
    });
    renderWithProviders(<SettingsPage />, { route: '/settings' });

    const threshold = await screen.findByLabelText('Aging threshold (days)');
    expect(threshold).toHaveValue(90);

    await userEvent.clear(threshold);
    await userEvent.type(threshold, '30');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText(/greater than or equal to 60/)).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();

    await userEvent.clear(threshold);
    await userEvent.type(threshold, '60');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Settings saved.')).toBeInTheDocument();
    expect(patch).toHaveBeenCalledWith({ agingThresholdDays: 60, staleActionDays: 14, dailyHoldingCost: 150000, timezone: 'Asia/Saigon' });
  });
});
