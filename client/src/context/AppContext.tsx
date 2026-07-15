import { createContext, useContext, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { ActivityLog, FileRecord, Notification, Organization, Overview, Plan, Settings, Subscription, User } from '../types/app';

type AuthMode = 'login' | 'register';

type AppContextValue = {
  user: User | null;
  plans: Plan[];
  subscription: Subscription;
  notifications: Notification[];
  notificationCount: number;
  organization: Organization | null;
  activityLogs: ActivityLog[];
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
  loading: boolean;
  sessionLoaded: boolean;
  handleAuth: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  submitAuth: (mode: AuthMode, form: { name: string; email: string; password: string }) => Promise<void>;
  handleLogout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string; avatarUrl?: string | null }) => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  handleUpgrade: (planId: string, interval: 'MONTHLY' | 'YEARLY') => Promise<void>;
  handleTheme: () => Promise<void>;
  handleSettings: () => Promise<void>;
  handleFileUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<FileRecord | null>;
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
  const [notificationCount, setNotificationCount] = useState(0);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [overview, setOverview] = useState<Overview>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  const loadProfile = async () => {
    try {
      const response = await api.get<{ user: { profile: User; role: string; permissions: string[]; organization: unknown; settings: Settings | null; emailVerified: boolean; status: string } }>('/api/auth/me');
      const profile = response.user?.profile ?? null;
      setUser(profile);
      setTheme(response.user?.settings?.theme ?? 'dark');
      setSettings(response.user?.settings ?? null);
      const subscriptionResponse = await api.get<{ subscription: Subscription }>('/api/subscriptions/me');
      setSubscription(subscriptionResponse.subscription);
      const [notificationsResponse, notificationSummary, organizationResponse, filesResponse, activityResponse] = await Promise.all([
        api.get<{ notifications: Notification[] }>('/api/notifications'),
        api.get<{ unreadCount: number }>('/api/notifications/summary'),
        api.get<{ organization: Organization | null }>('/api/organization/me'),
        api.get<{ files: FileRecord[] }>('/api/files'),
        api.get<{ logs: ActivityLog[] }>('/api/logs/me'),
      ]);
      setNotifications(notificationsResponse.notifications);
      setNotificationCount(notificationSummary.unreadCount);
      setOrganization(organizationResponse.organization);
      setFiles(filesResponse.files);
      setActivityLogs(activityResponse.logs);
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
      setLoading(false);
      setSessionLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      void (async () => {
        try {
          const usersResponse = await api.get<{ users: User[] }>('/api/users');
          setUsers(usersResponse.users);
          const overviewResponse = await api.get<{ overview: Overview }>('/api/reports/overview');
          setOverview(overviewResponse.overview);
        } catch {
          setUsers([]);
        }
      })();
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const submitAuth = async (mode: AuthMode, form: { name: string; email: string; password: string }) => {
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await api.post<{ user: User; message: string; requiresVerification?: boolean }>(path, form);
      setStatus(response.message);
      await loadProfile();
      if (response.requiresVerification) {
        navigate('/verify-email', { replace: true, state: { email: form.email } });
        return;
      }
      navigate('/', { replace: true });
    } catch {
      setStatus('Authentication failed. Try again.');
      throw new Error('Authentication failed');
    }
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitAuth(authMode, authForm);
  };

  const handleLogout = async () => {
    await api.post('/api/auth/logout');
    setUser(null);
    navigate('/login');
  };

  const forgotPassword = async (email: string) => {
    await api.post('/api/auth/forgot-password', { email });
    setStatus('If the email exists, a reset link was sent.');
  };

  const resetPassword = async (token: string, password: string) => {
    await api.post('/api/auth/reset-password', { token, password });
    setStatus('Password updated successfully.');
    navigate('/login');
  };

  const verifyEmail = async (token: string) => {
    await api.post('/api/auth/verify-email', { token });
    setStatus('Email verified successfully.');
    await loadProfile();
    navigate('/', { replace: true });
  };

  const resendVerification = async (email: string) => {
    await api.post('/api/auth/resend-verification', { email });
    setStatus('If the email exists, a verification email was sent.');
  };

  const updateProfile = async (data: { name?: string; phone?: string; avatarUrl?: string | null }) => {
    const response = await api.put<{ user: User }>('/api/auth/profile', data);
    setUser((current) => current ? { ...current, ...response.user } : current);
    setStatus('Profile updated successfully.');
    await loadProfile();
  };

  const changePassword = async (data: { currentPassword: string; newPassword: string }) => {
    await api.post('/api/auth/change-password', data);
    setStatus('Password updated successfully.');
  };

  const updateWorkspace = async (data: { name: string; logoUrl?: string | null; contactEmail?: string | null; contactPhone?: string | null; address?: string | null; timezone?: string; currency?: string; language?: string; primaryColor?: string; secondaryColor?: string; appearance?: string }) => {
    const response = await api.put<{ organization: Organization }>('/api/organization/me', data);
    setOrganization(response.organization);
    setStatus('Workspace updated.');
  };

  const inviteMember = async (data: { email: string; role?: string }) => {
    await api.post('/api/organization/members/invite', data);
    setStatus('Invitation sent.');
  };

  const removeMember = async (userId: string) => {
    await api.delete(`/api/organization/members/${userId}` as any);
    setStatus('Member removed.');
    if (organization) {
      setOrganization({
        ...organization,
        members: organization.members?.filter((member) => member.user.id !== userId),
      });
    }
  };

  const markNotificationRead = async (id: string) => {
    await api.patch(`/api/notifications/${id}/read`);
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
  };

  const markAllNotificationsRead = async () => {
    await api.patch('/api/notifications/read-all');
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
  };

  const deleteNotification = async (id: string) => {
    await api.delete(`/api/notifications/${id}` as any);
    setNotifications((current) => current.filter((item) => item.id !== id));
  };

  const refreshFiles = async () => {
    const response = await api.get<{ files: FileRecord[] }>('/api/files');
    setFiles(response.files);
  };

  const deleteFile = async (id: string) => {
    await api.delete(`/api/files/${id}` as any);
    await refreshFiles();
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
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.upload<{ file: FileRecord }>('/api/files', formData);
    setFiles((prev) => [response.file, ...prev]);
    return response.file;
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
    notificationCount,
    organization,
    activityLogs,
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
    loading,
    sessionLoaded,
    handleAuth,
    submitAuth,
    handleLogout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    updateProfile,
    changePassword,
    updateWorkspace,
    inviteMember,
    removeMember,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    deleteFile,
    refreshFiles,
    handleUpgrade,
    handleTheme,
    handleSettings,
    handleFileUpload,
    createPlan,
    isAuthenticated: Boolean(user),
  }), [user, plans, subscription, notifications, notificationCount, organization, activityLogs, users, files, settings, overview, theme, status, authMode, authForm, loading, sessionLoaded]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
