import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '@/theme';
import { useAuth } from '@/context/AuthContext';

const LEVELS = ['Novice', 'Beginner', 'Intermediate', 'Advanced', 'Elite'];

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { completeSetup } = useAuth();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weight, setWeight] = useState('');
  const [expLevel, setExpLevel] = useState(2);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const T = TOKENS.color;

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Required';
    const ageN = parseInt(age);
    if (!age || isNaN(ageN) || ageN < 13 || ageN > 100) e.age = '13–100';
    const ft = parseInt(heightFt);
    const inches = parseInt(heightIn || '0');
    if (!heightFt || isNaN(ft) || ft < 3 || ft > 8) e.height = 'Enter feet (3–8)';
    else if (isNaN(inches) || inches < 0 || inches > 11) e.height = 'Inches must be 0–11';
    const wN = parseFloat(weight);
    if (!weight || isNaN(wN) || wN < 40 || wN > 500) e.weight = '40–500 lbs';
    return e;
  }

  async function handleContinue() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setBusy(true);
    const totalInches = parseInt(heightFt) * 12 + parseInt(heightIn || '0');
    const heightCm = Math.round(totalInches * 2.54);
    const weightKg = Math.round(parseFloat(weight) * 0.453592);
    await completeSetup({
      name: name.trim(),
      age: parseInt(age),
      heightCm,
      weightKg,
      experienceLevel: expLevel,
    });
    // AuthContext state change triggers root redirect to (app)
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.bg.base }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.stepLabel}>ALMOST THERE</Text>
        <Text style={s.title}>Set up your profile.</Text>
        <Text style={s.subtitle}>We use this to personalise your coaching.</Text>

        <View style={s.form}>
          {/* Name */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>NAME</Text>
            <TextInput
              style={[s.input, errors.name && s.inputError]}
              value={name}
              onChangeText={v => { setName(v); setErrors(e => ({ ...e, name: '' })); }}
              placeholder="Your first name"
              placeholderTextColor={T.fg.tertiary}
              autoCapitalize="words"
              returnKeyType="next"
            />
            {!!errors.name && <Text style={s.fieldError}>{errors.name}</Text>}
          </View>

          {/* Age */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>AGE</Text>
            <TextInput
              style={[s.input, errors.age && s.inputError]}
              value={age}
              onChangeText={v => { setAge(v.replace(/\D/g, '')); setErrors(e => ({ ...e, age: '' })); }}
              placeholder="e.g. 24"
              placeholderTextColor={T.fg.tertiary}
              keyboardType="number-pad"
            />
            {!!errors.age && <Text style={s.fieldError}>{errors.age}</Text>}
          </View>

          {/* Height */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>HEIGHT</Text>
            <View style={s.splitRow}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[s.input, errors.height && s.inputError]}
                  value={heightFt}
                  onChangeText={v => { setHeightFt(v.replace(/\D/g, '')); setErrors(e => ({ ...e, height: '' })); }}
                  placeholder="ft"
                  placeholderTextColor={T.fg.tertiary}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[s.input, errors.height && s.inputError]}
                  value={heightIn}
                  onChangeText={v => { setHeightIn(v.replace(/\D/g, '')); setErrors(e => ({ ...e, height: '' })); }}
                  placeholder="in"
                  placeholderTextColor={T.fg.tertiary}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            {!!errors.height && <Text style={s.fieldError}>{errors.height}</Text>}
          </View>

          {/* Weight */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>WEIGHT (LBS)</Text>
            <TextInput
              style={[s.input, errors.weight && s.inputError]}
              value={weight}
              onChangeText={v => { setWeight(v.replace(/[^\d.]/g, '')); setErrors(e => ({ ...e, weight: '' })); }}
              placeholder="e.g. 175"
              placeholderTextColor={T.fg.tertiary}
              keyboardType="decimal-pad"
            />
            {!!errors.weight && <Text style={s.fieldError}>{errors.weight}</Text>}
          </View>

          {/* Experience level */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>EXPERIENCE LEVEL</Text>
            <View style={s.levelRow}>
              {LEVELS.map((lbl, i) => (
                <Pressable
                  key={i}
                  style={[s.levelChip, expLevel === i && s.levelChipActive]}
                  onPress={() => { Haptics.selectionAsync(); setExpLevel(i); }}
                >
                  <Text style={[s.levelChipText, expLevel === i && s.levelChipTextActive]}>{lbl}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Pressable
          style={[s.primaryBtn, busy && { opacity: 0.6 }]}
          onPress={handleContinue}
          disabled={busy}
        >
          {busy
            ? <ActivityIndicator color={T.accent.onPrimary} />
            : <Text style={s.primaryBtnText}>Let's go →</Text>
          }
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const T = TOKENS.color;
const s = StyleSheet.create({
  container: { paddingHorizontal: TOKENS.space.xl },
  stepLabel: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 10,
    letterSpacing: 0.1 * 10, color: T.accent.primary, marginBottom: 8,
  },
  title: {
    fontSize: 32, fontWeight: '600', letterSpacing: -0.02 * 32,
    color: T.fg.primary, marginBottom: TOKENS.space.sm,
  },
  subtitle: {
    fontSize: 15, color: T.fg.secondary, marginBottom: TOKENS.space.xxl,
  },
  form: { gap: TOKENS.space.lg },
  fieldGroup: { gap: 6 },
  label: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 10,
    letterSpacing: 0.1 * 10, color: T.fg.tertiary, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: T.bg.elevated, borderWidth: 1, borderColor: T.border.subtle,
    borderRadius: TOKENS.radius.md, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 16, color: T.fg.primary,
  },
  inputError: { borderColor: '#ff6b6b' },
  fieldError: { fontSize: 12, color: '#ff6b6b' },
  splitRow: { flexDirection: 'row', gap: TOKENS.space.sm },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levelChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: T.bg.elevated, borderWidth: 1, borderColor: T.border.subtle,
    borderRadius: TOKENS.radius.pill,
  },
  levelChipActive: { backgroundColor: T.accent.primary, borderColor: T.accent.primary },
  levelChipText: { fontSize: 13, color: T.fg.primary },
  levelChipTextActive: { color: T.accent.onPrimary, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: T.accent.primary, borderRadius: TOKENS.radius.md,
    paddingVertical: 16, alignItems: 'center', marginTop: TOKENS.space.xxl,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600', color: T.accent.onPrimary },
});
