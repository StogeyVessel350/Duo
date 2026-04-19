import { API_BASE_URL } from '@/config';

async function post(path: string, body: object, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const apiLogin    = (email: string, password: string) => post('/auth/login',   { email, password });
export const apiRegister = (email: string, password: string) => post('/auth/register', { email, password });
export const apiRefresh  = (refresh_token: string)           => post('/auth/refresh',  { refresh_token });

export const apiVerifyEmail         = (code: string, token: string)  => post('/auth/verify-email',        { code }, token);
export const apiResendVerification  = (token: string)                => post('/auth/resend-verification', {}, token);
