import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeAction, makeDetail } from '../../test/fixtures';
import { mockApi, reply } from '../../test/mock-api';
import { renderWithProviders } from '../../test/render';
import { ActionForm } from './ActionForm';

const vehicle = makeDetail({
  id: 'veh-9',
  listPrice: 500_000_000,
  suggestions: [{ code: 'NEVER_REDUCED', suggestedStatus: 'PRICE_REDUCTION_PLANNED', reason: '95 days in stock, price never reduced' }],
});

describe('ActionForm', () => {
  it('shows the price field only for Price Reduced and posts the action', async () => {
    const post = vi.fn<(body: unknown) => unknown>(() => ({ action: makeAction({ status: 'PRICE_REDUCED' }), warnings: [] }));
    mockApi({ 'POST /api/vehicles/veh-9/actions': ({ body }: { body: unknown }) => post(body) });
    const onSaved = vi.fn();
    renderWithProviders(<ActionForm vehicle={vehicle} timezone="Asia/Saigon" currency="VND" onSaved={onSaved} />);

    expect(screen.queryByLabelText(/New price/)).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'PRICE_REDUCED');
    await userEvent.type(screen.getByLabelText(/New price/), '450000000');
    await userEvent.type(screen.getByLabelText('Note'), 'Weekend deal');
    await userEvent.click(screen.getByRole('button', { name: 'Log action' }));

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith({ status: 'PRICE_REDUCED', newPrice: 450_000_000, note: 'Weekend deal' });
  });

  it('applies a suggestion: status, source and a default target date', async () => {
    const post = vi.fn<(body: unknown) => unknown>(() => ({ action: makeAction(), warnings: [] }));
    mockApi({ 'POST /api/vehicles/veh-9/actions': ({ body }: { body: unknown }) => post(body) });
    renderWithProviders(<ActionForm vehicle={vehicle} timezone="Asia/Saigon" currency="VND" />);

    await userEvent.click(screen.getByRole('button', { name: /Suggested: Price Reduction Planned/ }));
    expect(screen.getByLabelText('Status')).toHaveValue('PRICE_REDUCTION_PLANNED');
    expect((screen.getByLabelText('Target date') as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await userEvent.click(screen.getByRole('button', { name: 'Log action' }));

    await vi.waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][0]).toMatchObject({ status: 'PRICE_REDUCTION_PLANNED', suggestionCode: 'NEVER_REDUCED' });
  });

  it('blocks submit when a required target date is missing', async () => {
    const fetchMock = mockApi({});
    renderWithProviders(<ActionForm vehicle={vehicle} timezone="Asia/Saigon" currency="VND" />);
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'ON_HOLD');
    await userEvent.click(screen.getByRole('button', { name: 'Log action' }));
    expect(await screen.findByText('targetDate is required for ON_HOLD')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows server field errors next to the field', async () => {
    mockApi({
      'POST /api/vehicles/veh-9/actions': reply(
        { statusCode: 400, message: 'Validation failed', details: [{ field: 'note', message: 'note is not allowed today' }] },
        400,
      ),
    });
    renderWithProviders(<ActionForm vehicle={vehicle} timezone="Asia/Saigon" currency="VND" />);
    await userEvent.click(screen.getByRole('button', { name: 'Log action' }));
    expect(await screen.findByText('note is not allowed today')).toBeInTheDocument();
  });
});
