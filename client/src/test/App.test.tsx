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
});
