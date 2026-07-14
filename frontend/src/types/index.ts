export type ThemeMode = 'light' | 'dark';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
}

export interface AuthState {
  user: User | null;
  token: string | null;
}
