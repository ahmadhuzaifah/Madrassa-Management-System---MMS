import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppContext } from '../context/AppContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAppContext();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
