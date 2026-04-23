import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setToken, clearToken, getToken, type ApiUser } from '@/api/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  age: number;
  heightCm: number;
  weightKg: number;
  experienceLevel: number;
  setupComplete: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  pendingEmail: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  verifyEmail: (code: string) => Promise<boolean>;
  completeSetup: (data: Omit<AuthUser, 'id' | 'email' | 'setupComplete'>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, loading: true, pendingEmail: null,
  signUp: async () => {}, verifyEmail: async () => false,
  completeSetup: async () => {}, signIn: async () => false, signOut: async () => {},
});

const USER_CACHE_KEY = 'duo.auth.user';

function toAuthUser(u: ApiUser): AuthUser {
  return {
    id: u.id, email: u.email,
    name: u.name ?? '', age: u.age ?? 0,
    heightCm: u.heightCm ?? 0, weightKg: u.weightKg ?? 0,
    experienceLevel: u.experienceLevel ?? 2,
    setupComplete: u.setupComplete ?? false,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // Restore session on launch
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          // Try cached user first for instant load, then refresh from API
          const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
          if (cached) setUser(JSON.parse(cached));
          const fresh = await api.auth.me();
          const u = toAuthUser(fresh);
          setUser(u);
          await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
        }
      } catch {
        // Token invalid or expired — clear it
        await clearToken();
        await AsyncStorage.removeItem(USER_CACHE_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function signUp(email: string, password: string) {
    const res = await api.auth.signup(email, password);
    await setToken(res.token);
    setPendingEmail(email);
    // User object will be incomplete until setup
    const partial: AuthUser = {
      id: '', email, name: '', age: 0, heightCm: 0,
      weightKg: 0, experienceLevel: 2, setupComplete: false,
    };
    setUser(partial);
  }

  async function verifyEmail(code: string): Promise<boolean> {
    // MVP: any 6-digit code accepted
    return /^\d{6}$/.test(code);
  }

  async function completeSetup(data: Omit<AuthUser, 'id' | 'email' | 'setupComplete'>) {
    const updated = await api.auth.updateProfile({
      name: data.name, age: data.age,
      heightCm: data.heightCm, weightKg: data.weightKg,
      experienceLevel: data.experienceLevel,
    });
    const u = toAuthUser(updated);
    setUser(u);
    setPendingEmail(null);
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
  }

  async function signIn(email: string, password: string): Promise<boolean> {
    try {
      const res = await api.auth.signin(email, password);
      await setToken(res.token);
      const u = toAuthUser(res.user);
      setUser(u);
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
      return true;
    } catch {
      return false;
    }
  }

  async function signOut() {
    await clearToken();
    await AsyncStorage.removeItem(USER_CACHE_KEY);
    setUser(null);
    setPendingEmail(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, pendingEmail, signUp, verifyEmail, completeSetup, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
