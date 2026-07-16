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

  it('renders the library workspace for authenticated sessions', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'Library User', email: 'library@example.com', role: 'USER', emailVerified: true }, role: 'USER', permissions: ['students:read'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/library/categories')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ categories: [] }) });
      if (url.includes('/api/library/books')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ books: [] }) });
      if (url.includes('/api/library/members')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ members: [] }) });
      if (url.includes('/api/library/issues')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ issues: [] }) });
      if (url.includes('/api/library/reports')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ books: [], issues: [], fines: [] }) });
      if (url.includes('/api/plans')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      if (url.includes('/api/subscriptions/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      if (url.includes('/api/notifications')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/library']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Library Hub/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^Books$/i }).some((link) => link.getAttribute('href') === '/library/books')).toBe(true);
  });

  it('renders the communication workspace for authenticated sessions', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'Comm User', email: 'comm@example.com', role: 'USER', emailVerified: true }, role: 'USER', permissions: ['students:read'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/communication')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ announcements: [], templates: [], groups: [], notifications: [], messages: [], sms: [], email: [], whatsapp: [] }) });
      if (url.includes('/api/plans')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      if (url.includes('/api/subscriptions/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      if (url.includes('/api/notifications')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/communication']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Communication Hub/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Announcements/i }).some((link) => link.getAttribute('href') === '/communication/announcements')).toBe(true);
  });

  it('renders the communication messages workspace for authenticated sessions', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'Comm User', email: 'comm@example.com', role: 'USER', emailVerified: true }, role: 'USER', permissions: ['students:read'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/communication/messages')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ messages: [] }) });
      if (url.includes('/api/plans')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      if (url.includes('/api/subscriptions/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      if (url.includes('/api/notifications')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/communication/messages']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Messages' })).toBeInTheDocument();
  });

  it('renders the parent portal workspace for portal users', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'Parent User', email: 'parent@example.com', role: 'PARENT', emailVerified: true }, role: 'PARENT', permissions: ['auth:me'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/parent/profile')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ parent: { students: [] }, account: null }) });
      if (url.includes('/api/parent/student')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ students: [] }) });
      if (url.includes('/api/parent/attendance')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ attendance: [] }) });
      if (url.includes('/api/parent/fees')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ invoices: [], payments: [] }) });
      if (url.includes('/api/parent/results')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) });
      if (url.includes('/api/parent/certificates')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ certificates: [] }) });
      if (url.includes('/api/parent/announcements')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ announcements: [] }) });
      if (url.includes('/api/plans')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      if (url.includes('/api/subscriptions/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      if (url.includes('/api/notifications')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/parent/dashboard']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Parent Portal/i)).toBeInTheDocument();
  });

  it('renders the teacher portal workspace for portal users', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'Teacher User', email: 'teacher@example.com', role: 'TEACHER', emailVerified: true }, role: 'TEACHER', permissions: ['auth:me'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/portal/teacher/dashboard')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ employee: null, classes: [], metrics: { classes: 0, attendanceMarks: 0, resultsEntry: 0 } }) });
      }
      if (url.includes('/api/plans')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      if (url.includes('/api/subscriptions/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      if (url.includes('/api/notifications')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/portal/teacher/dashboard']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Teacher Portal/i)).toBeInTheDocument();
  });

  it('renders the cms workspace and public website routes', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'CMS User', email: 'cms@example.com', role: 'USER', emailVerified: true }, role: 'USER', permissions: ['auth:me'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/cms/websites')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ websites: [] }) });
      if (url.includes('/api/cms/public/about')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ page: { title: 'About', slug: 'about', sections: [] } }) });
      if (url.includes('/api/plans')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      if (url.includes('/api/subscriptions/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      if (url.includes('/api/notifications')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/cms']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Website CMS/i)).toBeInTheDocument();
  });

  it('renders the analytics workspace for authenticated sessions', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'Analytics User', email: 'analytics@example.com', role: 'USER', emailVerified: true }, role: 'USER', permissions: ['auth:me'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/reports/dashboard')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ dashboard: { students: 1, attendance: 1 } }) });
      if (url.includes('/api/plans')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      if (url.includes('/api/subscriptions/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      if (url.includes('/api/notifications')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/analytics/dashboard']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Executive Dashboard/i)).toBeInTheDocument();
  });

  it('renders the public admissions and admin admissions routes', async () => {
    mockFetch.mockImplementation((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { profile: { id: '1', name: 'Admissions User', email: 'admissions@example.com', role: 'USER', emailVerified: true }, role: 'USER', permissions: ['auth:me'], organization: null, settings: { theme: 'dark' }, emailVerified: true, status: 'ACTIVE' } }) });
      }
      if (url.includes('/api/admissions/programs')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ programs: [{ id: '1', name: 'Hifz', description: 'Admission ready', department: { name: 'General' } }] }) });
      if (url.includes('/api/admissions/forms')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ forms: [] }) });
      if (url.includes('/api/admissions/reports/summary')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ summary: { total: 1, admitted: 1 } }) });
      if (url.includes('/api/admissions/reports/conversion')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ conversion: [] }) });
      if (url.includes('/api/plans')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ plans: [] }) });
      if (url.includes('/api/subscriptions/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ subscription: null }) });
      if (url.includes('/api/notifications')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ notifications: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter initialEntries={['/admissions']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Admissions' })).toBeInTheDocument();
  });
});
