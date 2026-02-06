const API_BASE = import.meta.env.DEV ? '' : 'http://localhost:8080';

export interface AuthResponse {
  token: string;
  email: string;
  name: string;
  userId: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export const authService = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Registration failed. Email may already be in use.');
    }
    return response.json();
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Invalid email or password');
    }
    return response.json();
  },

  saveToken(token: string) {
    localStorage.setItem('authToken', token);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `authToken=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Expires=${expires}`;
  },

  getToken(): string | null {
    const ls = localStorage.getItem('authToken');
    if (ls) return ls;
    const match = document.cookie.split('; ').find((c) => c.startsWith('authToken='));
    return match ? decodeURIComponent(match.split('=')[1]) : null;
  },

  saveUser(user: { email: string; name: string; userId: number }) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser(): { email: string; name: string; userId: number } | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    document.cookie = 'authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
