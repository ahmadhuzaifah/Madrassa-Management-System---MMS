import { DashboardView } from '../../components/dashboard/DashboardView';
import { useAppContext } from '../../context/AppContext';

export function DashboardPage() {
  const { plans, subscription, notifications, overview } = useAppContext();
  return <DashboardView plans={plans} subscription={subscription} notifications={notifications} overview={overview} />;
}
