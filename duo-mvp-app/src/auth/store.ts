import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiLogin, apiRegister, apiRefresh, apiVerifyEmail, apiResendVerification } from './api';

const REFRESH_KEY = 'duo_refresh_token';
const ACCESS_KEY  = 'duo_access_token';

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  emailVerified: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  isAuthenticated: false,
  emailVerified: false,
  isLoading: true,

  checkAuth: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
      if (!refreshToken) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }
      const { access_token, refresh_token, email_verified } = await apiRefresh(refreshToken);
      await SecureStore.setItemAsync(REFRESH_KEY, refresh_token);
      await SecureStore.setItemAsync(ACCESS_KEY, access_token);
      set({ accessToken: access_token, isAuthenticated: true, emailVerified: email_verified, isLoading: false });
    } catch {
      await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => {});
      set({ isAuthenticated: false, emailVerified: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const { access_token, refresh_token, email_verified } = await apiLogin(email, password);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh_token);
    await SecureStore.setItemAsync(ACCESS_KEY, access_token);
    set({ accessToken: access_token, isAuthenticated: true, emailVerified: email_verified });
  },

  register: async (email, password) => {
    const { access_token, refresh_token, email_verified } = await apiRegister(email, password);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh_token);
    await SecureStore.setItemAsync(ACCESS_KEY, access_token);
    set({ accessToken: access_token, isAuthenticated: true, emailVerified: email_verified });
  },

  verifyEmail: async (code) => {
    const token = get().accessToken ?? await SecureStore.getItemAsync(ACCESS_KEY) ?? '';
    await apiVerifyEmail(code, token);
    set({ emailVerified: true });
  },

  resendVerification: async () => {
    const token = get().accessToken ?? await SecureStore.getItemAsync(ACCESS_KEY) ?? '';
    await apiResendVerification(token);
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => {});
    set({ accessToken: null, isAuthenticated: false, emailVerified: false });
  },
}));
