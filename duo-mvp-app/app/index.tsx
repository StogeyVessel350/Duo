import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { TOKENS } from '@/theme';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: TOKENS.color.bg.base }}>
        <ActivityIndicator color={TOKENS.color.accent.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href={"/(auth)/login" as any} />;
  if (!user.setupComplete) return <Redirect href={"/(auth)/setup" as any} />;
  return <Redirect href="/(app)" />;
}
