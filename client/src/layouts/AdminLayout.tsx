import { NavLink, Outlet } from 'react-router-dom';
import { Shield, LayoutDashboard, Users, Building2, KeyRound, ShieldCheck, Settings, BookOpenText, FileText } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/organizations', label: 'Organizations', icon: Building2 },
  { to: '/admin/roles', label: 'Roles', icon: Shield },
  { to: '/admin/permissions', label: 'Permissions', icon: KeyRound },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/logs', label: 'Logs', icon: FileText },
  { to: '/admin/reports', label: 'Reports', icon: BookOpenText },
];

export function AdminLayout() {
  const { user, handleLogout } = useAppContext();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><ShieldCheck size={18} /></div>
          <div>
            <h1>Northstar Admin</h1>
            <p>Control center</p>
          </div>
        </div>
        <nav className="nav-list">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className="nav-item">
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="panel">
            <strong>{user?.name}</strong>
            <p>{user?.email}</p>
          </div>
          <button className="ghost-button" onClick={() => void handleLogout()}>Sign out</button>
        </div>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Administration</p>
            <h2>Platform oversight</h2>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
