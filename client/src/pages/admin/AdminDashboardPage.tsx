import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { AdminDashboard } from '../../types/app';

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  useEffect(() => { void api.get<{ metrics: AdminDashboard['metrics']; recentActivity: AdminDashboard['recentActivity']; growth: AdminDashboard['growth'] }>('/api/admin/dashboard').then((response) => setDashboard(response as AdminDashboard)); }, []);

  return (
    <section className="grid-dashboard">
      <div className="card-grid">
        <div className="mini-card"><strong>Total users</strong><span>{dashboard?.metrics.totalUsers ?? 0}</span></div>
        <div className="mini-card"><strong>Active users</strong><span>{dashboard?.metrics.activeUsers ?? 0}</span></div>
        <div className="mini-card"><strong>Organizations</strong><span>{dashboard?.metrics.organizations ?? 0}</span></div>
        <div className="mini-card"><strong>Subscriptions</strong><span>{dashboard?.metrics.subscriptions ?? 0}</span></div>
        <div className="mini-card"><strong>Revenue</strong><span>${dashboard?.metrics.revenue ?? 0}</span></div>
        <div className="mini-card"><strong>Storage</strong><span>{Math.round((dashboard?.metrics.storageBytes ?? 0) / 1024)} KB</span></div>
      </div>
      <div className="panel"><h3>Recent activity</h3>{dashboard?.recentActivity?.length ? dashboard.recentActivity.map((item) => <p key={item.id}>{item.action} · {item.user?.name ?? 'System'}</p>) : <p>No activity found.</p>}</div>
    </section>
  );
}
