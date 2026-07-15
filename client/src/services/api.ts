class ApiClient {
  private csrfToken = '';

  async initialize() {
    const response = await fetch('/api/auth/csrf-token', { credentials: 'include' });
    if (!response.ok) throw new Error('Unable to initialize session security');
    this.csrfToken = (await response.json() as { csrfToken: string }).csrfToken;
  }

  private headers(contentType = true): Record<string, string> {
    return { ...(contentType ? { 'Content-Type': 'application/json' } : {}), ...(this.csrfToken ? { 'X-CSRF-Token': this.csrfToken } : {}) };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(path, { credentials: 'include', ...init });
    if (!response.ok) throw new Error('Request failed');
    return response.json() as Promise<T>;
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body?: unknown) { return this.request<T>(path, { method: 'POST', headers: this.headers(), body: body ? JSON.stringify(body) : undefined }); }
  put<T>(path: string, body?: unknown) { return this.request<T>(path, { method: 'PUT', headers: this.headers(), body: body ? JSON.stringify(body) : undefined }); }
  patch<T>(path: string, body?: unknown) { return this.request<T>(path, { method: 'PATCH', headers: this.headers(), body: body ? JSON.stringify(body) : undefined }); }
  delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE', headers: this.headers() }); }
  upload<T>(path: string, body: FormData) { return this.request<T>(path, { method: 'POST', headers: this.headers(false), body }); }
}

export const api = new ApiClient();
