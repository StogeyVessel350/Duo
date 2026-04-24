import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE = 'https://duo-api-production.up.railway.app';

const TOKEN_KEY = 'duo.auth.token';

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    signup: (email: string, password: string) =>
      request<{ token: string; setupComplete: boolean }>('POST', '/auth/signup', { email, password }, false),

    signin: (email: string, password: string) =>
      request<{ token: string; user: ApiUser }>('POST', '/auth/signin', { email, password }, false),

    me: () => request<ApiUser>('GET', '/auth/me'),

    updateProfile: (data: Partial<ApiUser>) =>
      request<ApiUser>('PUT', '/auth/profile', data),

    requestReset: (email: string) =>
      request<{ ok: boolean }>('POST', '/auth/reset-request', { email }, false),

    confirmReset: (email: string, code: string, password: string) =>
      request<{ ok: boolean }>('POST', '/auth/reset-confirm', { email, code, password }, false),
  },

  workouts: {
    list: () => request<ApiWorkout[]>('GET', '/workouts'),
    get: (id: string) => request<ApiWorkout>('GET', `/workouts/${id}`),
    create: (w: Omit<ApiWorkout, 'id'>) => request<{ id: string }>('POST', '/workouts', w),
    delete: (id: string) => request<void>('DELETE', `/workouts/${id}`),
  },
};

export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  experienceLevel: number;
  setupComplete: boolean;
}

export interface ApiWorkout {
  id: string;
  date: string;
  focus: string;
  durationMin: number;
  totalVolumeKg: number;
  hasPR: boolean;
  exercises: ApiExerciseLog[];
}

export interface ApiExerciseLog {
  exerciseId: string;
  sets: ApiSetData[];
}

export interface ApiSetData {
  reps: number;
  load: number;
  peakV: number;
  avgV: number;
  isPR: boolean;
}
