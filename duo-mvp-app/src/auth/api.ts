import { API_BASE_URL } from '@/config';

async function post(path: string, body: object) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as { access_token: string; refresh_token: string };
}

export const apiLogin    = (email: string, password: string) => post('/auth/login',   { email, password });
export const apiRegister = (email: string, password: string) => post('/auth/register', { email, password });
export const apiRefresh  = (refresh_token: string)           => post('/auth/refresh',  { refresh_token });
