import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { DuoMark } from '@/components/shell';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const T = TOKENS.color;

  function validate(): string | null {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (mode === 'signup' && password !== confirm) return 'Passwords do not match.';
    return null;
  }

  async function handleSubmit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError('');
    const err = validate();
    if (err) { setError(err); return; }
    setBusy(true);
    try {
      if (mode === 'signup') {
        try {
          await signUp(email.trim().toLowerCase(), password);
        } catch (e: any) {
          setError(e?.message || 'Could not create account.');
          return;
        }
        router.push('/(auth)/verify' as any);
      } else {
        const ok = await signIn(email.trim().toLowerCase(), password);
        if (!ok) {
          setError('Incorrect email or password.');
        }
        // AuthContext change will trigger root index to redirect automatically
      }
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    Haptics.selectionAsync();
    setMode(m => m === 'signin' ? 'signup' : 'signin');
    setError('');
    setPassword('');
    setConfirm('');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.bg.base }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.logoRow}>
          <DuoMark size={16} />
        </View>

        <Text style={s.title}>{mode === 'signin' ? 'Welcome back.' : 'Create account.'}</Text>
        <Text style={s.subtitle}>
          {mode === 'signin' ? 'Sign in to your DUO account.' : 'Start training smarter.'}
        </Text>

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
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>PASSWORD</Text>
            <TextInput
              ref={passwordRef}
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 characters"
              placeholderTextColor={T.fg.tertiary}
              secureTextEntry
              returnKeyType={mode === 'signup' ? 'next' : 'done'}
              onSubmitEditing={() => mode === 'signup' ? confirmRef.current?.focus() : handleSubmit()}
              blurOnSubmit={mode !== 'signup'}
            />
          </View>

          {mode === 'signup' && (
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
                onSubmitEditing={handleSubmit}
              />
            </View>
          )}

          {!!error && <Text style={s.errorText}>{error}</Text>}

          <Pressable
            style={[s.primaryBtn, busy && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color={T.accent.onPrimary} />
              : <Text style={s.primaryBtnText}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
            }
          </Pressable>
        </View>

        {mode === 'signin' && (
          <Pressable style={s.forgotRow} onPress={() => { Haptics.selectionAsync(); router.push('/(auth)/reset' as any); }}>
            <Text style={s.forgotLink}>Forgot password?</Text>
          </Pressable>
        )}

        <View style={s.switchRow}>
          <Text style={s.switchLabel}>
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
          </Text>
          <Pressable onPress={switchMode}>
            <Text style={s.switchLink}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const T = TOKENS.color;
const s = StyleSheet.create({
  container: {
    flexGrow: 1, paddingHorizontal: TOKENS.space.xl,
  },
  logoRow: {
    alignItems: 'flex-start', marginBottom: TOKENS.space.xxl,
  },
  title: {
    fontSize: 34, fontWeight: '600', letterSpacing: -0.02 * 34,
    color: T.fg.primary, marginBottom: TOKENS.space.sm,
  },
  subtitle: {
    fontSize: 16, color: T.fg.secondary, marginBottom: TOKENS.space.xxl,
  },
  form: { gap: TOKENS.space.lg },
  fieldGroup: { gap: TOKENS.space.xs ?? 6 },
  label: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, letterSpacing: 0.1 * 10,
    color: T.fg.tertiary, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: T.bg.elevated, borderWidth: 1, borderColor: T.border.subtle,
    borderRadius: TOKENS.radius.md, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 16, color: T.fg.primary,
  },
  errorText: {
    fontSize: 13, color: '#ff6b6b', textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: T.accent.primary, borderRadius: TOKENS.radius.md,
    paddingVertical: 16, alignItems: 'center', marginTop: TOKENS.space.sm,
  },
  primaryBtnText: {
    fontSize: 16, fontWeight: '600', color: T.accent.onPrimary,
  },
  switchRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    marginTop: TOKENS.space.xxl, flexWrap: 'wrap',
  },
  switchLabel: { fontSize: 14, color: T.fg.secondary },
  switchLink: { fontSize: 14, fontWeight: '600', color: T.accent.primary },
  forgotRow: { alignItems: 'center', marginTop: TOKENS.space.lg },
  forgotLink: { fontSize: 14, color: T.fg.secondary },
});
