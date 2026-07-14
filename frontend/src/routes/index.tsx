import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { routes } from '../constants/routes';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path={routes.auth} element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path={routes.home} element={<Navigate to={routes.dashboard} replace />} />
          <Route path={routes.dashboard} element={<DashboardPage />} />
          <Route path={routes.settings} element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
