import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiLogin, apiRegister, apiRefresh } from './api';

const REFRESH_KEY = 'duo_refresh_token';
const ACCESS_KEY  = 'duo_access_token';

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  checkAuth: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
      if (!refreshToken) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }
      const { access_token, refresh_token } = await apiRefresh(refreshToken);
      await SecureStore.setItemAsync(REFRESH_KEY, refresh_token);
      await SecureStore.setItemAsync(ACCESS_KEY, access_token);
      set({ accessToken: access_token, isAuthenticated: true, isLoading: false });
    } catch {
      await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => {});
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    const { access_token, refresh_token } = await apiLogin(email, password);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh_token);
    await SecureStore.setItemAsync(ACCESS_KEY, access_token);
    set({ accessToken: access_token, isAuthenticated: true });
  },

  register: async (email, password) => {
    set({ error: null });
    const { access_token, refresh_token } = await apiRegister(email, password);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh_token);
    await SecureStore.setItemAsync(ACCESS_KEY, access_token);
    set({ accessToken: access_token, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => {});
    set({ accessToken: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));
