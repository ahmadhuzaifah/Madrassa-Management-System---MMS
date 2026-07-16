import { Link, Outlet } from 'react-router-dom';
import { Bell, CalendarDays, CreditCard, GraduationCap, LayoutDashboard, LibraryBig, MessageSquare, UserCircle2 } from 'lucide-react';

const portalLinks = [
  { to: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: 'attendance', label: 'Attendance', icon: CalendarDays },
  { to: 'fees', label: 'Fees', icon: CreditCard },
  { to: 'results', label: 'Results', icon: GraduationCap },
  { to: 'certificates', label: 'Certificates', icon: LibraryBig },
  { to: 'profile', label: 'Profile', icon: UserCircle2 },
  { to: 'notifications', label: 'Notifications', icon: Bell },
  { to: 'announcements', label: 'Announcements', icon: MessageSquare },
];

export function PortalLayout({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="panel-grid">
      <section className="panel">
        <p className="eyebrow">Portal access</p>
        <h3>{title}</h3>
        <p>{subtitle}</p>
        <div className="link-grid" style={{ marginTop: '1rem' }}>
          {portalLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="card-link">
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </section>
      <Outlet />
    </div>
  );
}
