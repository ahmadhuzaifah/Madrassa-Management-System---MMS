import { PlanBuilder } from './PlanBuilder';

export function BillingView({ user, plans, subscription, onUpgrade, onCreatePlan }: any) {
  return (
    <section className="panel">
      <h3>Plans and billing</h3>
      {user?.role === 'ADMIN' ? (
        <div className="panel">
          <h4>Create plan</h4>
          <PlanBuilder onCreate={onCreatePlan} />
        </div>
      ) : null}
      <div className="cards-row">
        {plans.map((plan: any) => (
          <div key={plan.id} className="plan-card">
            <h4>{plan.name}</h4>
            <p>{plan.description}</p>
            <div className="price">${plan.priceMonthly}<span>/mo</span></div>
            <p>{plan.features}</p>
            <div className="button-row">
              <button className="primary-button" onClick={() => onUpgrade(plan.id, 'MONTHLY')}>Monthly</button>
              <button className="ghost-button" onClick={() => onUpgrade(plan.id, 'YEARLY')}>Yearly</button>
            </div>
            <small>{subscription?.plan?.id === plan.id ? 'Current plan' : 'Available now'}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
