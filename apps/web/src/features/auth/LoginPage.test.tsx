import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { tokenStore } from '../../lib/api';
import { ME } from '../../test/fixtures';
import { mockApi, reply } from '../../test/mock-api';
import { renderWithProviders } from '../../test/render';
import { LoginPage } from './LoginPage';

const routes = (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/overview" element={<p>Overview page</p>} />
  </Routes>
);

describe('LoginPage', () => {
  it('shows the demo account and signs in with it', async () => {
    mockApi({ 'POST /api/auth/login': { accessToken: 'tok-1' }, 'GET /api/auth/me': ME });
    renderWithProviders(routes, { route: '/login' });

    expect(screen.getByText(/manager@demo\.local/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Overview page')).toBeInTheDocument();
    expect(tokenStore.get()).toBe('tok-1');
  });

  it('shows an error for a wrong password', async () => {
    mockApi({ 'POST /api/auth/login': reply({ statusCode: 401, message: 'Invalid email or password' }, 401) });
    renderWithProviders(routes, { route: '/login' });

    const password = screen.getByLabelText('Password');
    await userEvent.clear(password);
    await userEvent.type(password, 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(tokenStore.get()).toBeNull();
  });
});
