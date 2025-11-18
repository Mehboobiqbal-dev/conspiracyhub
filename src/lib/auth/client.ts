export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  subscriptionTier?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  return response.json();
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  
  // Clear any client-side storage
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export function isAuthenticated(): boolean {
  // Check if we have cookies (they're httpOnly, so we check via API)
  // This is a simple check - the actual auth happens server-side
  return typeof document !== 'undefined' && document.cookie.includes('accessToken');
}

