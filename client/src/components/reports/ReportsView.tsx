export function ReportsView({ overview }: any) {
  return (
    <section className="panel">
      <h3>Reports and exports</h3>
      <div className="cards-row">
        <div className="mini-card"><strong>Users</strong><span>{overview?.users ?? 0}</span></div>
        <div className="mini-card"><strong>Subscriptions</strong><span>{overview?.subscriptions ?? 0}</span></div>
        <div className="mini-card"><strong>Activity</strong><span>{overview?.activityLogs ?? 0}</span></div>
      </div>
      <a className="primary-button" href="/api/reports/export" target="_blank" rel="noreferrer">Export invoices</a>
    </section>
  );
}
