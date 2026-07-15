import { Link } from 'react-router-dom';
import { BarChart3, CreditCard, LayoutDashboard, LogOut, MoonStar, Settings, Sparkles, Sun, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type { User } from '../../types/app';

const navigation = [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }, { to: '/billing', label: 'Billing', icon: CreditCard }, { to: '/users', label: 'Users', icon: Users }, { to: '/reports', label: 'Reports', icon: BarChart3 }, { to: '/settings', label: 'Settings', icon: Settings }];

export function AppShell({ user, theme, status, onThemeToggle, onLogout, children }: { user: User | null; theme: 'light' | 'dark'; status: string; onThemeToggle: () => void; onLogout: () => void; children: ReactNode }) {
  return <div className="shell"><aside className="sidebar"><div className="brand"><div className="brand-icon"><Sparkles size={18} /></div><div><h1>Northstar</h1><p>Revenue OS</p></div></div><nav className="nav-list">{navigation.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="nav-item"><Icon size={18} /><span>{label}</span></Link>)}</nav><div className="sidebar-footer"><button className="ghost-button" onClick={onThemeToggle}>{theme === 'dark' ? <Sun size={16} /> : <MoonStar size={16} />}<span>{theme === 'dark' ? 'Light' : 'Dark'} mode</span></button>{user && <button className="ghost-button" onClick={onLogout}><LogOut size={16} /><span>Sign out</span></button>}</div></aside><main className="content"><header className="topbar"><div><p className="eyebrow">SaaS command center</p><h2>{user ? `Welcome back, ${user.name}` : 'Launch your premium operations suite'}</h2></div><div className="profile-card"><div className="avatar">{user?.name?.[0] ?? 'N'}</div><div><strong>{user?.name ?? 'Guest'}</strong><p>{user?.email ?? 'Sign in to continue'}</p></div></div></header>{status && <div className="status-banner">{status}</div>}{children}</main></div>;
}
