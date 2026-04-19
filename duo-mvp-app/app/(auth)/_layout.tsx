import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/auth/store';

export default function AuthLayout() {
  const { isAuthenticated, emailVerified } = useAuthStore();
  // Only redirect away if fully authenticated and verified
  if (isAuthenticated && emailVerified) return <Redirect href="/(app)" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0b0b0e' } }} />;
}
