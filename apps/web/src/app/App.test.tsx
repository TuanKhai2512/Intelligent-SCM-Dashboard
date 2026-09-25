import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { tokenStore } from '../lib/api';
import { ME, SETTINGS } from '../test/fixtures';
import { mockApi } from '../test/mock-api';
import { renderWithProviders } from '../test/render';
import { AppRoutes } from './App';

describe('AppRoutes', () => {
  it('sends signed-out users to the login page', async () => {
    mockApi({});
    const { location } = renderWithProviders(<AppRoutes />, { route: '/inventory' });
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(location().pathname).toBe('/login');
  });

  it('shows the layout with navigation for a signed-in manager', async () => {
    tokenStore.set('tok-1');
    mockApi({ 'GET /api/auth/me': ME, 'GET /api/dealership/settings': SETTINGS });
    const { location } = renderWithProviders(<AppRoutes />, { route: '/' });

    expect(await screen.findByText('Saigon Auto Center')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inventory & Aging' })).toHaveAttribute('href', '/inventory');
    expect(screen.getByText('Minh Tran')).toBeInTheDocument();
    expect(location().pathname).toBe('/overview');
  });
});
