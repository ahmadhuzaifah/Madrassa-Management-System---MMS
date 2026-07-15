import { AuthPage } from '../auth/AuthPage';
import { DashboardPage } from '../dashboard/DashboardPage';
import { useAppContext } from '../../context/AppContext';

export function HomePage() {
  const { isAuthenticated } = useAppContext();
  return isAuthenticated ? <DashboardPage /> : <AuthPage />;
}
