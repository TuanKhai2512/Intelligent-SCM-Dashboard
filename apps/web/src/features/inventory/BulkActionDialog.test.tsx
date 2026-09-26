import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockApi } from '../../test/mock-api';
import { renderWithProviders } from '../../test/render';
import { BulkActionDialog } from './BulkActionDialog';
import { bulkFormSchema } from './bulk-form';

describe('bulkFormSchema', () => {
  const schema = bulkFormSchema('2026-06-15');
  it('rejects Price Reduced and requires dates like single actions', () => {
    expect(schema.safeParse({ status: 'PRICE_REDUCED' }).success).toBe(false);
    expect(schema.safeParse({ status: 'ON_HOLD', targetDate: '' }).success).toBe(false);
    expect(schema.safeParse({ status: 'ON_HOLD', targetDate: '2026-06-20' }).success).toBe(true);
  });
});

describe('BulkActionDialog', () => {
  it('logs one action for every selected vehicle', async () => {
    const post = vi.fn<(body: unknown) => { bulkId: string; count: number }>(() => ({ bulkId: 'b-1', count: 2 }));
    mockApi({ 'POST /api/actions/bulk': ({ body }: { body: unknown }) => post(body) });
    const onDone = vi.fn();
    renderWithProviders(
      <BulkActionDialog open onOpenChange={() => {}} vehicleIds={['v1', 'v2']} timezone="Asia/Saigon" onDone={onDone} />,
    );

    const status = screen.getByLabelText('Status');
    expect(within(status).queryByRole('option', { name: 'Price Reduced' })).not.toBeInTheDocument();
    await userEvent.selectOptions(status, 'MARKETING_PUSH');
    await userEvent.type(screen.getByLabelText('Note'), 'Weekend event');
    await userEvent.click(screen.getByRole('button', { name: 'Log for 2 vehicles' }));

    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith({ bulkId: 'b-1', count: 2 }));
    expect(post).toHaveBeenCalledWith({ vehicleIds: ['v1', 'v2'], status: 'MARKETING_PUSH', note: 'Weekend event' });
  });
});
