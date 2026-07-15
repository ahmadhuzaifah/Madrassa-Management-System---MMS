import { Navigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export function HomePage() {
  const { isAuthenticated, user, loading } = useAppContext();

  if (loading) return <div className="panel">Loading session...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.emailVerified === false) return <Navigate to="/verify-email" replace state={{ email: user.email }} />;
  return <Navigate to="/dashboard" replace />;
}
