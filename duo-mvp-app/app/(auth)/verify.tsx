import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/auth/store';

export default function VerifyScreen() {
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [sent, setSent]       = useState(false);

  const { verifyEmail, resendVerification } = useAuthStore();
  const router = useRouter();

  const handleVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      await verifyEmail(code.trim());
      router.replace('/(app)');
    } catch (e: any) {
      setError(e.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setSent(false);
    try {
      await resendVerification();
      setSent(true);
    } catch {
      setError('Could not resend — try again');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>check your email</Text>
          <Text style={styles.subtitle}>
            we sent a 6-digit code — enter it below to verify your account
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.codeInput}
            placeholder="000000"
            placeholderTextColor="#333"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {sent  && <Text style={styles.success}>new code sent</Text>}

          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={handleVerify}
            disabled={loading || code.length !== 6}
          >
            {loading
              ? <ActivityIndicator color="#000" />
              : <Text style={styles.btnText}>verify</Text>}
          </Pressable>
        </View>

        <Pressable onPress={handleResend} disabled={resending}>
          <Text style={styles.link}>
            {resending ? 'sending…' : 'resend code'}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0e' },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 32 },
  header: { gap: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#888', fontSize: 14, lineHeight: 20 },
  form: { gap: 12 },
  codeInput: {
    backgroundColor: '#141418',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2a2a2e',
    borderRadius: 12,
    paddingVertical: 18,
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 12,
  },
  error:   { color: '#fca5a5', fontSize: 13 },
  success: { color: '#4ade80', fontSize: 13 },
  btn: {
    backgroundColor: '#4ade80',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  btnPressed: { opacity: 0.85 },
  btnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  link: { color: '#4ade80', fontSize: 13, textAlign: 'center', fontWeight: '600' },
});
