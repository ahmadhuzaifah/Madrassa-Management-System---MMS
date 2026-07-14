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
  it('renders the Northstar brand and login form', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Northstar/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
  });
});
