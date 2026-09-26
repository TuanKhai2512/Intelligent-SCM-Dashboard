import { useQuery } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { api } from '../../lib/endpoints';
import { qk } from '../../lib/query';
import { makeDetail } from '../../test/fixtures';
import { mockApi, reply } from '../../test/mock-api';
import { renderWithProviders } from '../../test/render';
import { CloseVehicleButton } from './CloseVehicleButton';

function Harness({ id }: { id: string }) {
  const q = useQuery({ queryKey: qk.vehicle(id), queryFn: () => api.vehicle(id) });
  return q.data ? <CloseVehicleButton vehicle={q.data} kind="sell" currency="VND" /> : <span>loading</span>;
}

describe('CloseVehicleButton', () => {
  it('refetches the vehicle when closing returns 409', async () => {
    const detail = makeDetail({ id: 'veh-1', listPrice: 500_000_000 });
    const get = vi.fn(() => detail);
    mockApi({
      'GET /api/vehicles/veh-1': () => get(),
      'POST /api/vehicles/veh-1/sell': reply({ statusCode: 409, message: 'Vehicle is already sold' }, 409),
    });
    renderWithProviders(<Harness id="veh-1" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Mark as sold' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Vehicle is already sold')).toBeInTheDocument();
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });
});
