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
});
