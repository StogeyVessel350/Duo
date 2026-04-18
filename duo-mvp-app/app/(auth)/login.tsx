import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/auth/store';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const { login } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(app)');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>DUO</Text>
          <Text style={styles.subtitle}>welcome back</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="email"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="password"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.btnText}>log in</Text>}
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/register')}>
          <Text style={styles.link}>
            don't have an account? <Text style={styles.linkBold}>create one</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0e' },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 32 },
  header: { gap: 4 },
  title: { color: '#fff', fontSize: 40, fontWeight: '700', letterSpacing: -1 },
  subtitle: { color: '#888', fontSize: 15 },
  form: { gap: 12 },
  input: {
    backgroundColor: '#141418',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2a2a2e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
  },
  error: { color: '#fca5a5', fontSize: 13 },
  btn: {
    backgroundColor: '#4ade80',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  btnPressed: { opacity: 0.85 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  link: { color: '#555', fontSize: 13, textAlign: 'center' },
  linkBold: { color: '#4ade80', fontWeight: '600' },
});
