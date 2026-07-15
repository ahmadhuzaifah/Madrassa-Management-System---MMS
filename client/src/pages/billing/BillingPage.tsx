import { BillingView } from '../../components/billing/BillingView';
import { useAppContext } from '../../context/AppContext';

export function BillingPage() {
  const { user, plans, subscription, handleUpgrade, createPlan } = useAppContext();
  return <BillingView user={user} plans={plans} subscription={subscription} onUpgrade={handleUpgrade} onCreatePlan={createPlan} />;
}
