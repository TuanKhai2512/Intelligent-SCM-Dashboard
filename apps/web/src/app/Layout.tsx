import clsx from 'clsx';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settings';

const NAV = [
  { to: '/overview', label: 'Overview' },
  { to: '/inventory', label: 'Inventory & Aging' },
  { to: '/settings', label: 'Settings' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const settings = useSettings();
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="px-5 py-4">
          <p className="text-sm font-semibold">Inventory Dashboard</p>
          <p className="text-xs text-slate-500">{settings.data?.name ?? ' '}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                clsx(
                  'whitespace-nowrap rounded-md px-3 py-2 text-sm',
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-4 py-3 text-sm lg:px-6">
          <span className="text-slate-600">{user?.fullName}</span>
          <Button variant="secondary" size="sm" onClick={logout}>
            Sign out
          </Button>
        </header>
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
