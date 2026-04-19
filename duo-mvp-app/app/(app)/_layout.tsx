import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/auth/store';

export default function AppLayout() {
  const { isAuthenticated, emailVerified } = useAuthStore();
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (!emailVerified)   return <Redirect href="/verify" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0b0b0e' } }} />;
}
