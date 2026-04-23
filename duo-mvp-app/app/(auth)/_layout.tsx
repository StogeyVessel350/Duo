import { Stack } from 'expo-router';
import { TOKENS } from '@/theme';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: TOKENS.color.bg.base }, animation: 'slide_from_right' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="setup" />
    </Stack>
  );
}
