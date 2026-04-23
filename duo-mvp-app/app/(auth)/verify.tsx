import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '@/theme';
import { useAuth } from '@/context/AuthContext';

const CODE_LEN = 6;

export default function VerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { verifyEmail, pendingEmail } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const T = TOKENS.color;

  const code = digits.join('');

  useEffect(() => {
    setTimeout(() => inputs.current[0]?.focus(), 200);
  }, []);

  function handleDigit(text: string, index: number) {
    const char = text.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError('');
    if (char && index < CODE_LEN - 1) {
      inputs.current[index + 1]?.focus();
    }
    if (next.every(d => d !== '') && char) {
      submitCode(next.join(''));
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function submitCode(c: string) {
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = await verifyEmail(c);
    setBusy(false);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(auth)/setup' as any);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Invalid code. Enter any 6-digit number.');
      setDigits(Array(CODE_LEN).fill(''));
      inputs.current[0]?.focus();
    }
  }

  async function resend() {
    Haptics.selectionAsync();
    setResent(true);
    setDigits(Array(CODE_LEN).fill(''));
    setError('');
    inputs.current[0]?.focus();
    setTimeout(() => setResent(false), 3000);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}>
      <Pressable style={s.backBtn} onPress={() => { Haptics.selectionAsync(); router.back(); }}>
        <Text style={s.backText}>← Back</Text>
      </Pressable>

      <View style={s.content}>
        <Text style={s.emoji}>📬</Text>
        <Text style={s.title}>Check your inbox.</Text>
        <Text style={s.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={[s.subtitle, { color: T.fg.primary, fontWeight: '600' }]}>
            {pendingEmail || 'your email'}
          </Text>
        </Text>

        <View style={s.codeRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={r => { inputs.current[i] = r; }}
              style={[s.digitInput, d && s.digitFilled]}
              value={d}
              onChangeText={t => handleDigit(t, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              caretHidden
            />
          ))}
        </View>

        {!!error && <Text style={s.errorText}>{error}</Text>}

        {busy && (
          <View style={s.busyRow}>
            <ActivityIndicator color={T.accent.primary} />
            <Text style={s.busyText}>Verifying…</Text>
          </View>
        )}

        <Pressable onPress={resend} disabled={resent} style={{ marginTop: TOKENS.space.xl }}>
          <Text style={[s.resendText, resent && { opacity: 0.4 }]}>
            {resent ? 'Code resent ✓' : "Didn't receive it? Resend"}
          </Text>
        </Pressable>

        <Text style={s.hint}>For this MVP, any 6-digit number works.</Text>
      </View>
    </View>
  );
}

const T = TOKENS.color;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg.base, paddingHorizontal: TOKENS.space.xl },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { fontSize: 14, color: T.fg.secondary },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  emoji: { fontSize: 48, marginBottom: TOKENS.space.lg },
  title: {
    fontSize: 28, fontWeight: '600', letterSpacing: -0.02 * 28,
    color: T.fg.primary, textAlign: 'center', marginBottom: TOKENS.space.sm,
  },
  subtitle: {
    fontSize: 15, color: T.fg.secondary, textAlign: 'center',
    lineHeight: 22, marginBottom: TOKENS.space.xxl,
  },
  codeRow: { flexDirection: 'row', gap: 10 },
  digitInput: {
    width: 44, height: 56, borderRadius: TOKENS.radius.md,
    backgroundColor: T.bg.elevated, borderWidth: 1.5, borderColor: T.border.subtle,
    textAlign: 'center', fontSize: 22, fontWeight: '600', color: T.fg.primary,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  digitFilled: { borderColor: T.accent.primary },
  errorText: { fontSize: 13, color: '#ff6b6b', marginTop: TOKENS.space.md, textAlign: 'center' },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: TOKENS.space.md },
  busyText: { fontSize: 14, color: T.fg.secondary },
  resendText: { fontSize: 14, color: T.accent.primary, fontWeight: '500' },
  hint: {
    fontSize: 11, color: T.fg.tertiary, marginTop: TOKENS.space.lg,
    fontFamily: 'JetBrainsMono_400Regular', textAlign: 'center',
  },
});
