import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/auth/store';

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Redirect href="/login" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0b0b0e' } }} />;
}
