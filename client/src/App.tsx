import { Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './layouts/AppLayout';
import { AdminRoute, GuestRoute, ProtectedRoute } from './routes/ProtectedRoute';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { HomePage } from './pages/home/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { UnauthorizedPage } from './pages/auth/UnauthorizedPage';
import { SessionExpiredPage } from './pages/auth/SessionExpiredPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { BillingPage } from './pages/billing/BillingPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { UsersPage } from './pages/users/UsersPage';
import { WorkspaceSettingsPage } from './pages/settings/WorkspaceSettingsPage';
import { MembersPage } from './pages/settings/MembersPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { FilesPage } from './pages/files/FilesPage';
import { ActivityPage } from './pages/activity/ActivityPage';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminOrganizationsPage } from './pages/admin/AdminOrganizationsPage';
import { AdminRolesPage } from './pages/admin/AdminRolesPage';
import { AdminPermissionsPage } from './pages/admin/AdminPermissionsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route index element={<HomePage />} />
        <Route
          path="/login"
          element={<GuestRoute><LoginPage /></GuestRoute>}
        />
        <Route
          path="/register"
          element={<GuestRoute><RegisterPage /></GuestRoute>}
        />
        <Route
          path="/forgot-password"
          element={<GuestRoute><ForgotPasswordPage /></GuestRoute>}
        />
        <Route
          path="/reset-password"
          element={<GuestRoute><ResetPasswordPage /></GuestRoute>}
        />
        <Route
          path="/verify-email"
          element={<VerifyEmailPage />}
        />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/session-expired" element={<SessionExpiredPage />} />
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="organizations" element={<AdminOrganizationsPage />} />
          <Route path="roles" element={<AdminRolesPage />} />
          <Route path="permissions" element={<AdminPermissionsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="logs" element={<AdminLogsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/settings/workspace" element={<ProtectedRoute><WorkspaceSettingsPage /></ProtectedRoute>} />
          <Route path="/settings/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/files" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </AppProvider>
  );
}

export default App;
