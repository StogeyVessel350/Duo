import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/auth/store';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Redirect href="/(app)" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0b0b0e' } }} />;
}
