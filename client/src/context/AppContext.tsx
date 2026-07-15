import { createContext, useContext, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { FileRecord, Notification, Overview, Plan, Settings, Subscription, User } from '../types/app';

type AuthMode = 'login' | 'register';

type AppContextValue = {
  user: User | null;
  plans: Plan[];
  subscription: Subscription;
  notifications: Notification[];
  users: User[];
  files: FileRecord[];
  settings: Settings | null;
  overview: Overview;
  theme: 'light' | 'dark';
  status: string;
  authMode: AuthMode;
  authForm: { name: string; email: string; password: string };
  setAuthMode: (mode: AuthMode) => void;
  setAuthForm: (form: { name: string; email: string; password: string }) => void;
  handleAuth: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleUpgrade: (planId: string, interval: 'MONTHLY' | 'YEARLY') => Promise<void>;
  handleTheme: () => Promise<void>;
  handleSettings: () => Promise<void>;
  handleFileUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  createPlan: (data: unknown) => Promise<void>;
  isAuthenticated: boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [overview, setOverview] = useState<Overview>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [status, setStatus] = useState('');

  const loadProfile = async () => {
    try {
      const response = await api.get<{ user: User | null }>('/api/auth/me');
      setUser(response.user);
      setTheme(response.user?.settings?.theme ?? 'dark');
      setSettings(response.user?.settings ?? null);
      const subscriptionResponse = await api.get<{ subscription: Subscription }>('/api/subscriptions/me');
      setSubscription(subscriptionResponse.subscription);
      const notificationsResponse = await api.get<{ notifications: Notification[] }>('/api/notifications');
      setNotifications(notificationsResponse.notifications);
    } catch {
      setUser(null);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await api.get<{ plans: Plan[] }>('/api/plans');
      setPlans(response.plans);
    } catch {
      setStatus('Unable to load plans.');
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        await api.initialize();
      } catch {
        setStatus('Unable to initialize secure session. Please refresh and try again.');
      }
      await Promise.all([loadProfile(), loadPlans()]);
    })();
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      void (async () => {
        const usersResponse = await api.get<{ users: User[] }>('/api/users');
        setUsers(usersResponse.users);
        const overviewResponse = await api.get<{ overview: Overview }>('/api/reports/overview');
        setOverview(overviewResponse.overview);
      })();
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const path = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await api.post<{ user: User; message: string }>(path, authForm);
      setStatus(response.message);
      await loadProfile();
      navigate('/');
    } catch {
      setStatus('Authentication failed. Try again.');
    }
  };

  const handleLogout = async () => {
    await api.post('/api/auth/logout');
    setUser(null);
    navigate('/');
  };

  const handleUpgrade = async (planId: string, interval: 'MONTHLY' | 'YEARLY') => {
    try {
      await api.post('/api/subscriptions/checkout', { planId, interval });
      await loadProfile();
      setStatus('Subscription updated.');
    } catch {
      setStatus('Unable to update subscription');
    }
  };

  const handleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    await api.put('/api/settings/me', { theme: next });
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.upload<{ file: FileRecord }>('/api/files', formData);
    setFiles((prev) => [response.file, ...prev]);
  };

  const handleSettings = async () => {
    await api.put('/api/settings/me', { notificationsEnabled: true, timezone: 'UTC', language: 'en' });
    setStatus('Preferences saved.');
  };

  const createPlan = async (data: unknown) => {
    try {
      const response = await api.post<{ plan: Plan }>('/api/plans', data);
      setPlans((current) => [response.plan, ...current]);
      setStatus('Plan created');
    } catch {
      setStatus('Unable to create plan');
    }
  };

  const value = useMemo<AppContextValue>(() => ({
    user,
    plans,
    subscription,
    notifications,
    users,
    files,
    settings,
    overview,
    theme,
    status,
    authMode,
    authForm,
    setAuthMode,
    setAuthForm,
    handleAuth,
    handleLogout,
    handleUpgrade,
    handleTheme,
    handleSettings,
    handleFileUpload,
    createPlan,
    isAuthenticated: Boolean(user),
  }), [user, plans, subscription, notifications, users, files, settings, overview, theme, status, authMode, authForm]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
