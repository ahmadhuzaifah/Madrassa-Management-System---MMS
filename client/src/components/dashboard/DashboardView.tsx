export function DashboardView({ plans, subscription, notifications, overview }: any) {
  return (
    <section className="dashboard-grid">
      <div className="panel hero-card">
        <p className="eyebrow">Subscription health</p>
        <h3>{subscription?.plan?.name ?? 'Free'} plan active</h3>
        <p>Your workspace is equipped for secure collaboration and billing automation.</p>
      </div>
      <div className="panel metric-card">
        <p className="eyebrow">Users</p>
        <h3>{overview?.users ?? 1}</h3>
      </div>
      <div className="panel metric-card">
        <p className="eyebrow">Activity</p>
        <h3>{overview?.activityLogs ?? 0}</h3>
      </div>
      <div className="panel metric-card">
        <p className="eyebrow">Plans</p>
        <h3>{plans.length}</h3>
      </div>
      <div className="panel wide-panel">
        <h4>Recent notifications</h4>
        <ul className="list-view">
          {notifications.map((item: any) => (
            <li key={item.id}><strong>{item.title}</strong><span>{item.message}</span></li>
          ))}
        </ul>
      </div>
      <div className="panel wide-panel">
        <h4>Plan lineup</h4>
        <div className="cards-row">
          {plans.map((plan: any) => (
            <div key={plan.id} className="mini-card">
              <strong>{plan.name}</strong>
              <p>{plan.description}</p>
              <span>${plan.priceMonthly}/mo</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
