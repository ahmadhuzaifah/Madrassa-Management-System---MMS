import { Home, Settings, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { routes } from '../../constants/routes';
import { cn } from '../../utils/cn';

const items = [
  { label: 'Dashboard', to: routes.dashboard, icon: Home },
  { label: 'Settings', to: routes.settings, icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden w-72 flex-col border-r border-slate-800 bg-slate-950/90 p-6 lg:flex">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-slate-100 p-2 text-slate-950">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Northstar</p>
          <p className="text-xs text-slate-400">SaaS foundation</p>
        </div>
      </div>
      <nav className="space-y-2">
        {items.map(({ label, to, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link key={to} to={to} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition', active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white')}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
