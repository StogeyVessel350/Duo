import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '@/theme';
import { api } from '@/api/client';

const CODE_LEN = 6;

export default function ResetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const T = TOKENS.color;

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(''));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const codeInputs = useRef<(TextInput | null)[]>([]);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  useEffect(() => {
    if (step === 'code') setTimeout(() => codeInputs.current[0]?.focus(), 200);
  }, [step]);

  async function handleRequestReset() {
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      await api.auth.requestReset(email.trim().toLowerCase());
    } catch {
      // Don't reveal whether the email exists
    } finally {
      setBusy(false);
    }
    setStep('code');
  }

  function handleDigit(text: string, index: number) {
    const char = text.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError('');
    if (char && index < CODE_LEN - 1) codeInputs.current[index + 1]?.focus();
    if (next.every(d => d !== '') && char) passwordRef.current?.focus();
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  }

  async function handleResetPassword() {
    setError('');
    const code = digits.join('');
    if (code.length < CODE_LEN) { setError('Enter the 6-digit code.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setBusy(true);
    try {
      await api.auth.confirmReset(email.trim().toLowerCase(), code, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.message || 'Reset failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={[s.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}>
        <View style={s.content}>
          <Text style={s.emoji}>✅</Text>
          <Text style={s.title}>Password updated.</Text>
          <Text style={s.subtitle}>You can now sign in with your new password.</Text>
          <Pressable style={s.primaryBtn} onPress={() => router.replace('/(auth)/login' as any)}>
            <Text style={s.primaryBtnText}>Back to sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.bg.base }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={s.backBtn} onPress={() => { Haptics.selectionAsync(); step === 'code' ? setStep('email') : router.back(); }}>
          <Text style={s.backText}>← Back</Text>
        </Pressable>

        {step === 'email' ? (
          <View style={s.content}>
            <Text style={s.emoji}>🔑</Text>
            <Text style={s.title}>Reset password.</Text>
            <Text style={s.subtitle}>Enter your email and we'll send you a reset code.</Text>
            <View style={s.form}>
              <View style={s.fieldGroup}>
                <Text style={s.label}>EMAIL</Text>
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={T.fg.tertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={handleRequestReset}
                  autoFocus
                />
              </View>
              {!!error && <Text style={s.errorText}>{error}</Text>}
              <Pressable style={[s.primaryBtn, busy && { opacity: 0.6 }]} onPress={handleRequestReset} disabled={busy}>
                {busy ? <ActivityIndicator color={T.accent.onPrimary} /> : <Text style={s.primaryBtnText}>Send reset code</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={s.content}>
            <Text style={s.emoji}>📬</Text>
            <Text style={s.title}>Check your inbox.</Text>
            <Text style={s.subtitle}>
              Enter the code sent to{'\n'}
              <Text style={[s.subtitle, { color: T.fg.primary, fontWeight: '600' }]}>{email}</Text>
            </Text>

            <View style={s.codeRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={r => { codeInputs.current[i] = r; }}
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

            <View style={[s.form, { marginTop: TOKENS.space.xl }]}>
              <View style={s.fieldGroup}>
                <Text style={s.label}>NEW PASSWORD</Text>
                <TextInput
                  ref={passwordRef}
                  style={s.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={T.fg.tertiary}
                  secureTextEntry
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
              <View style={s.fieldGroup}>
                <Text style={s.label}>CONFIRM PASSWORD</Text>
                <TextInput
                  ref={confirmRef}
                  style={s.input}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Repeat password"
                  placeholderTextColor={T.fg.tertiary}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                />
              </View>
              {!!error && <Text style={s.errorText}>{error}</Text>}
              <Pressable style={[s.primaryBtn, busy && { opacity: 0.6 }]} onPress={handleResetPassword} disabled={busy}>
                {busy ? <ActivityIndicator color={T.accent.onPrimary} /> : <Text style={s.primaryBtnText}>Reset password</Text>}
              </Pressable>
            </View>
            <Text style={s.hint}>For this MVP, any 6-digit number works.</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const T = TOKENS.color;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg.base, paddingHorizontal: TOKENS.space.xl },
  scrollContent: { flexGrow: 1, paddingHorizontal: TOKENS.space.xl },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: TOKENS.space.lg },
  backText: { fontSize: 14, color: T.fg.secondary },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  emoji: { fontSize: 48, marginBottom: TOKENS.space.lg },
  title: {
    fontSize: 28, fontWeight: '600', letterSpacing: -0.02 * 28,
    color: T.fg.primary, textAlign: 'center', marginBottom: TOKENS.space.sm,
  },
  subtitle: {
    fontSize: 15, color: T.fg.secondary, textAlign: 'center',
    lineHeight: 22, marginBottom: TOKENS.space.xxl,
  },
  form: { width: '100%', gap: TOKENS.space.lg },
  fieldGroup: { gap: 6 },
  label: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, letterSpacing: 1,
    color: T.fg.tertiary,
  },
  input: {
    backgroundColor: T.bg.elevated, borderWidth: 1, borderColor: T.border.subtle,
    borderRadius: TOKENS.radius.md, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 16, color: T.fg.primary,
  },
  codeRow: { flexDirection: 'row', gap: 10 },
  digitInput: {
    width: 44, height: 56, borderRadius: TOKENS.radius.md,
    backgroundColor: T.bg.elevated, borderWidth: 1.5, borderColor: T.border.subtle,
    textAlign: 'center', fontSize: 22, fontWeight: '600', color: T.fg.primary,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  digitFilled: { borderColor: T.accent.primary },
  errorText: { fontSize: 13, color: '#ff6b6b', textAlign: 'center' },
  primaryBtn: {
    backgroundColor: T.accent.primary, borderRadius: TOKENS.radius.md,
    paddingVertical: 16, alignItems: 'center', marginTop: TOKENS.space.sm,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: T.accent.onPrimary },
  hint: {
    fontSize: 11, color: T.fg.tertiary, marginTop: TOKENS.space.xl,
    fontFamily: 'JetBrainsMono_400Regular', textAlign: 'center',
  },
});
