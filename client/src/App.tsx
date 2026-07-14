import { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { Bell, Building2, CreditCard, FileCheck2, LayoutDashboard, LogOut, MoonStar, Settings, ShieldCheck, Sparkles, Sun, Users, BarChart3 } from 'lucide-react';

const api = {
  csrfToken: '',
  async initialize() {
    const response = await fetch('/api/auth/csrf-token', { credentials: 'include' });
    if (!response.ok) throw new Error('Unable to initialize session security');
    const payload = await response.json() as { csrfToken: string };
    this.csrfToken = payload.csrfToken;
  },
  headers(): Record<string, string> {
    return this.csrfToken ? { 'X-CSRF-Token': this.csrfToken } : {};
  },
  async get<T>(path: string): Promise<T> {
    const response = await fetch(path, { credentials: 'include' });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  },
  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.headers() },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  },
  async put<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.headers() },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  },
  async patch<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...this.headers() },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  },
  async upload(path: string, formData: FormData): Promise<any> {
    const response = await fetch(path, { method: 'POST', credentials: 'include', headers: this.headers(), body: formData });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },
};

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function App() {
  const [user, setUser] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [theme, setTheme] = useState('dark');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const loadProfile = async () => {
    try {
      const response = await api.get<{ user: any }>('/api/auth/me');
      setUser(response.user);
      setTheme(response.user?.settings?.theme ?? 'dark');
      setSettings(response.user?.settings ?? null);
      const subscriptionResponse = await api.get<{ subscription: any }>('/api/subscriptions/me');
      setSubscription(subscriptionResponse.subscription);
      const notificationsResponse = await api.get<{ notifications: any[] }>('/api/notifications');
      setNotifications(notificationsResponse.notifications);
    } catch {
      setUser(null);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await api.get<{ plans: any[] }>('/api/plans');
      setPlans(response.plans);
    } catch {
      console.error('Unable to load plans');
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
        const usersResponse = await api.get<{ users: any[] }>('/api/users');
        setUsers(usersResponse.users);
        const overviewResponse = await api.get<{ overview: any }>('/api/reports/overview');
        setOverview(overviewResponse.overview);
      })();
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const path = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await api.post<{ user: any; message: string }>(path, authForm);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.upload('/api/files', formData);
    setFiles((prev) => [response.file, ...prev]);
  };

  const handleSettings = async () => {
    await api.put('/api/settings/me', { notificationsEnabled: true, timezone: 'UTC', language: 'en' });
    setStatus('Preferences saved.');
  };

  const canRenderDashboard = user || !user; 

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Sparkles size={18} /></div>
          <div>
            <h1>Northstar</h1>
            <p>Revenue OS</p>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="nav-item">
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="ghost-button" onClick={handleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <MoonStar size={16} />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'} mode</span>
          </button>
          {user && (
            <button className="ghost-button" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          )}
        </div>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">SaaS command center</p>
            <h2>{user ? `Welcome back, ${user.name}` : 'Launch your premium operations suite'}</h2>
          </div>
          <div className="profile-card">
            <div className="avatar">{user?.name?.[0] ?? 'N'}</div>
            <div>
              <strong>{user?.name ?? 'Guest'}</strong>
              <p>{user?.email ?? 'Sign in to continue'}</p>
            </div>
          </div>
        </header>

        {status ? <div className="status-banner">{status}</div> : null}

        <Routes>
          <Route path="/" element={user ? <Dashboard user={user} plans={plans} subscription={subscription} notifications={notifications} overview={overview} /> : <AuthView authMode={authMode} setAuthMode={setAuthMode} authForm={authForm} setAuthForm={setAuthForm} onSubmit={handleAuth} />} />
          <Route path="/billing" element={user ? <BillingView user={user} plans={plans} subscription={subscription} onUpgrade={handleUpgrade} onCreatePlan={async (data: any) => { try { const res = await api.post<{ plan: any }>('/api/plans', data); setPlans((p) => [res.plan, ...p]); setStatus('Plan created'); } catch { setStatus('Unable to create plan'); } }} /> : <AuthView authMode={authMode} setAuthMode={setAuthMode} authForm={authForm} setAuthForm={setAuthForm} onSubmit={handleAuth} />} />
          <Route path="/users" element={user ? <UsersView users={users} /> : <AuthView authMode={authMode} setAuthMode={setAuthMode} authForm={authForm} setAuthForm={setAuthForm} onSubmit={handleAuth} />} />
          <Route path="/reports" element={user ? <ReportsView overview={overview} /> : <AuthView authMode={authMode} setAuthMode={setAuthMode} authForm={authForm} setAuthForm={setAuthForm} onSubmit={handleAuth} />} />
          <Route path="/settings" element={user ? <SettingsView settings={settings} onSave={handleSettings} onUpload={handleFileUpload} files={files} /> : <AuthView authMode={authMode} setAuthMode={setAuthMode} authForm={authForm} setAuthForm={setAuthForm} onSubmit={handleAuth} />} />
        </Routes>
      </main>
    </div>
  );
}

function AuthView({ authMode, setAuthMode, authForm, setAuthForm, onSubmit }: any) {
  return (
    <section className="panel auth-panel">
      <div className="auth-copy">
        <h3>Secure, modern SaaS operations</h3>
        <p>Manage subscriptions, users, logs, files, and reporting from one premium experience.</p>
        <div className="feature-list">
          <div><ShieldCheck size={16} /> RBAC and audit logs</div>
          <div><Building2 size={16} /> Multi-plan billing workflow</div>
          <div><FileCheck2 size={16} /> Secure uploads and exports</div>
        </div>
      </div>
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="switcher">
          <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Login</button>
          <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Register</button>
        </div>
        {authMode === 'register' ? <input placeholder="Full name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} /> : null}
        <input type="email" placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
        <input type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
        <button className="primary-button" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
    </section>
  );
}

function Dashboard({ user, plans, subscription, notifications, overview }: any) {
  return (
    <section className="dashboard-grid">
      <div className="panel hero-card">
        <p className="eyebrow">Subscription health</p>
        <h3>{subscription?.plan?.name ?? 'Free'} plan active</h3>
        <p>Your workspace is equipped for secure collaboration and billing automation.</p>
      </div>
      <div className="panel metric-card">
        <p className="eyebrow">Users</p>
        <h3>{overview?.users ?? 1}</h3>
      </div>
      <div className="panel metric-card">
        <p className="eyebrow">Activity</p>
        <h3>{overview?.activityLogs ?? 0}</h3>
      </div>
      <div className="panel metric-card">
        <p className="eyebrow">Plans</p>
        <h3>{plans.length}</h3>
      </div>
      <div className="panel wide-panel">
        <h4>Recent notifications</h4>
        <ul className="list-view">
          {notifications.map((item: any) => (
            <li key={item.id}><strong>{item.title}</strong><span>{item.message}</span></li>
          ))}
        </ul>
      </div>
      <div className="panel wide-panel">
        <h4>Plan lineup</h4>
        <div className="cards-row">
          {plans.map((plan: any) => (
            <div key={plan.id} className="mini-card">
              <strong>{plan.name}</strong>
              <p>{plan.description}</p>
              <span>${plan.priceMonthly}/mo</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BillingView({ user, plans, subscription, onUpgrade, onCreatePlan }: any) {
  return (
    <section className="panel">
      <h3>Plans and billing</h3>
      {user?.role === 'ADMIN' ? (
        <div className="panel">
          <h4>Create plan</h4>
          <PlanBuilder onCreate={onCreatePlan} />
        </div>
      ) : null}
      <div className="cards-row">
        {plans.map((plan: any) => (
          <div key={plan.id} className="plan-card">
            <h4>{plan.name}</h4>
            <p>{plan.description}</p>
            <div className="price">${plan.priceMonthly}<span>/mo</span></div>
            <p>{plan.features}</p>
            <div className="button-row">
              <button className="primary-button" onClick={() => onUpgrade(plan.id, 'MONTHLY')}>Monthly</button>
              <button className="ghost-button" onClick={() => onUpgrade(plan.id, 'YEARLY')}>Yearly</button>
            </div>
            <small>{subscription?.plan?.id === plan.id ? 'Current plan' : 'Available now'}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanBuilder({ onCreate }: any) {
  const [form, setForm] = useState({ name: '', slug: '', description: '', priceMonthly: 0, priceYearly: 0, features: '' });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onCreate({ ...form, priceMonthly: Number(form.priceMonthly), priceYearly: Number(form.priceYearly) });
      }}
    >
      <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
      <input placeholder="Price monthly" type="number" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: Number(e.target.value) })} />
      <input placeholder="Price yearly" type="number" value={form.priceYearly} onChange={(e) => setForm({ ...form, priceYearly: Number(e.target.value) })} />
      <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <textarea placeholder="Features" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
      <button className="primary-button" type="submit">Create plan</button>
    </form>
  );
}

function UsersView({ users }: any) {
  return (
    <section className="panel">
      <h3>User management</h3>
      <table className="table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
        </thead>
        <tbody>
          {users.map((user: any) => (
            <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td>{user.status}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ReportsView({ overview }: any) {
  return (
    <section className="panel">
      <h3>Reports and exports</h3>
      <div className="cards-row">
        <div className="mini-card"><strong>Users</strong><span>{overview?.users ?? 0}</span></div>
        <div className="mini-card"><strong>Subscriptions</strong><span>{overview?.subscriptions ?? 0}</span></div>
        <div className="mini-card"><strong>Activity</strong><span>{overview?.activityLogs ?? 0}</span></div>
      </div>
      <a className="primary-button" href="/api/reports/export" target="_blank">Export invoices</a>
    </section>
  );
}

function SettingsView({ settings, onSave, onUpload, files }: any) {
  return (
    <section className="dashboard-grid">
      <div className="panel">
        <h3>Preferences</h3>
        <p>Theme: {settings?.theme ?? 'dark'}</p>
        <p>Notifications: {settings?.notificationsEnabled ? 'Enabled' : 'Disabled'}</p>
        <button className="primary-button" onClick={onSave}>Save preferences</button>
      </div>
      <div className="panel">
        <h3>File uploads</h3>
        <input type="file" onChange={onUpload} />
        <ul className="list-view">
          {files.map((file: any) => <li key={file.id}><strong>{file.originalName}</strong><span>{file.mimeType}</span></li>)}
        </ul>
      </div>
    </section>
  );
}

export default App;
