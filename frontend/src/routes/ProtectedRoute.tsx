import { Navigate, Outlet } from 'react-router-dom';
import { routes } from '../constants/routes';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute() {
  const user = useAuthStore((state) => state.user);
  return user ? <Outlet /> : <Navigate to={routes.auth} replace />;
}
