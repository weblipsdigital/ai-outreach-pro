// Centralized API client for AI Outreach Pro

const rawBase = import.meta.env.VITE_API_URL || '/api';
export const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('ai_outreach_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    localStorage.removeItem('ai_outreach_token');
    localStorage.removeItem('ai_outreach_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  // Handle both JSON and non-JSON responses safely
  const contentType = response.headers.get('content-type') || '';
  let data: any = {};
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text().catch(() => '');
    data = { error: text || `HTTP ${response.status} ${response.statusText}` };
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with HTTP ${response.status}`);
  }

  return data as T;
}
