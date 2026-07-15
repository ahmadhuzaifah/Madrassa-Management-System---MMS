import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppContext } from '../context/AppContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, user } = useAppContext();
  const location = useLocation();

  if (loading) {
    return <div className="panel">Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.emailVerified === false) {
    return <Navigate to="/verify-email" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, user } = useAppContext();

  if (loading) {
    return <div className="panel">Loading session...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to={user?.emailVerified === false ? '/verify-email' : '/'} replace />;
  }

  return <>{children}</>;
}
