import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

const mockFetch = vi.fn();

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  mockFetch.mockImplementation((input: RequestInfo) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/api/auth/me')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: null }) });
    }
    if (url.includes('/api/plans')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  vi.stubGlobal('fetch', mockFetch);
});

describe('App shell', () => {
  it('renders the login page for anonymous sessions', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
  });

  it('restores an authenticated session and shows the dashboard shell', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'QA Tester', email: 'qa@example.com', role: 'USER', emailVerified: true }, role: 'USER', permissions: ['auth:me'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/plans')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      }
      if (url.includes('/api/subscriptions/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      }
      if (url.includes('/api/notifications')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Welcome back, QA Tester/i)).toBeInTheDocument();
  });

  it('renders the admin dashboard for admin sessions', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', emailVerified: true }, role: 'ADMIN', permissions: ['users:read'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/admin/dashboard')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ metrics: { totalUsers: 10, activeUsers: 8, organizations: 2, subscriptions: 4, revenue: 1200, roles: 2, permissions: 8, storageBytes: 2048 }, recentActivity: [], growth: [] }) });
      }
      if (url.includes('/api/plans')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      }
      if (url.includes('/api/subscriptions/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      }
      if (url.includes('/api/notifications')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      }
      if (url.includes('/api/organization/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ organization: null }) });
      }
      if (url.includes('/api/files')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ files: [] }) });
      }
      if (url.includes('/api/logs/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ logs: [] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Platform oversight/i)).toBeInTheDocument();
    expect(screen.getByText(/Total users/i)).toBeInTheDocument();
  });

  it('renders the fees workspace for authenticated sessions', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'Fee User', email: 'fee@example.com', role: 'USER', emailVerified: true }, role: 'USER', permissions: ['students:read'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/plans')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      if (url.includes('/api/subscriptions/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      if (url.includes('/api/notifications')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/fees']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Fees/i)).toBeInTheDocument();
    expect(screen.getByText(/Fee structures/i)).toBeInTheDocument();
  });

  it('renders the exams workspace for authenticated sessions', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'Exam User', email: 'exam@example.com', role: 'USER', emailVerified: true }, role: 'USER', permissions: ['students:read'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/plans')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      if (url.includes('/api/subscriptions/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      if (url.includes('/api/notifications')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/exams']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Exams/i)).toBeInTheDocument();
    expect(screen.getByText(/Create exam/i)).toBeInTheDocument();
  });

  it('renders the certificates workspace and public verification page', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'Cert User', email: 'cert@example.com', role: 'USER', emailVerified: true }, role: 'USER', permissions: ['students:read'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/plans')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      if (url.includes('/api/subscriptions/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      if (url.includes('/api/notifications')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      if (url.includes('/api/certificates/verify/')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ certificate: { certificateNumber: 'CERT-2026-0001' }, verification: {} }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/certificates']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Certificates/i)).toBeInTheDocument();
    expect(screen.getByText(/Templates/i)).toBeInTheDocument();
  });

  it('renders the finance workspace for authenticated sessions', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'Finance User', email: 'finance@example.com', role: 'USER', emailVerified: true }, role: 'USER', permissions: ['students:read'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/plans')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      if (url.includes('/api/subscriptions/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      if (url.includes('/api/notifications')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/finance']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Finance/i)).toBeInTheDocument();
    expect(screen.getByText(/Accounts/i)).toBeInTheDocument();
  });

  it('renders the HR workspace for authenticated sessions', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'HR User', email: 'hr@example.com', role: 'USER', emailVerified: true }, role: 'USER', permissions: ['students:read'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/hr/departments')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ departments: [] }) });
      if (url.includes('/api/hr/designations')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ designations: [] }) });
      if (url.includes('/api/hr/employees')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ employees: [] }) });
      if (url.includes('/api/hr/attendance')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ attendance: [] }) });
      if (url.includes('/api/hr/leaves')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ leaves: [] }) });
      if (url.includes('/api/hr/payroll')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ payroll: [] }) });
      if (url.includes('/api/plans')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      if (url.includes('/api/subscriptions/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      if (url.includes('/api/notifications')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/hr']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Human Resources/i)).toBeInTheDocument();
    expect(screen.getByText(/Manage employees, attendance, leave, and payroll\./i)).toBeInTheDocument();
  });

  it('renders the inventory workspace for authenticated sessions', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'Inventory User', email: 'inventory@example.com', role: 'USER', emailVerified: true }, role: 'USER', permissions: ['students:read'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/inventory/categories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ categories: [] }) });
      if (url.includes('/api/inventory/assets')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ assets: [] }) });
      if (url.includes('/api/inventory/items')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [] }) });
      if (url.includes('/api/inventory/suppliers')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ suppliers: [] }) });
      if (url.includes('/api/inventory/purchases')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ purchases: [] }) });
      if (url.includes('/api/inventory/maintenance')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ maintenance: [] }) });
      if (url.includes('/api/inventory/reports')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ assets: [], items: [], purchases: [] }) });
      if (url.includes('/api/plans')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      if (url.includes('/api/subscriptions/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      if (url.includes('/api/notifications')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Inventory Hub/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Assets$/i })).toBeInTheDocument();
  });
});
