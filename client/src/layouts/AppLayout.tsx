import { Outlet } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { useAppContext } from '../context/AppContext';

export function AppLayout() {
  const { user, theme, status, handleTheme, handleLogout } = useAppContext();
  return (
    <AppShell user={user} theme={theme} status={status} onThemeToggle={handleTheme} onLogout={handleLogout}>
      <Outlet />
    </AppShell>
  );
}
