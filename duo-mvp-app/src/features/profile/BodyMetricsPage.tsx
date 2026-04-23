import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Animated,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '@/theme';
import { Text, Button } from '@/components/primitives';
import { SubHeader } from '@/components/shell';
import { useUnits, fromKg, toKg, unitLabel } from '@/context/UnitsContext';
import { useProfile, mockProfile, expLevelLabel } from '@/context/ProfileContext';

// ─── SettingsGroup ───────────────────────────────────────────────
function SettingsGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  const kids = React.Children.toArray(children);
  return (
    <View style={{ marginBottom: TOKENS.space.lg }}>
      {title && (
        <View style={{ paddingHorizontal: TOKENS.space.md, marginBottom: TOKENS.space.sm }}>
          <Text
            style={{
              fontSize: 11, fontWeight: '600', letterSpacing: 0.08 * 11,
              textTransform: 'uppercase', color: TOKENS.color.fg.tertiary,
            }}
          >
            {title}
          </Text>
        </View>
      )}
      <View style={styles.group}>
        {kids.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <View style={{ height: 1, marginLeft: 52, backgroundColor: TOKENS.color.border.subtle }} />
            )}
            {child}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

// ─── Field ───────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChangeValue,
  unit,
  min,
  max,
}: {
  label: string;
  value: number;
  onChangeValue: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={{ flex: 1, fontSize: 15, color: TOKENS.color.fg.primary }}>{label}</Text>
      <TextInput
        style={styles.input}
        value={String(value || '')}
        keyboardType="numeric"
        onChangeText={t => {
          const n = parseFloat(t);
          if (!isNaN(n)) onChangeValue(n);
        }}
        returnKeyType="done"
      />
      {unit && (
        <Text
          style={{
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
            color: TOKENS.color.fg.tertiary,
            width: 24,
          }}
        >
          {unit}
        </Text>
      )}
    </View>
  );
}

// ─── HeightField ─────────────────────────────────────────────────
function HeightField({
  heightCm,
  units,
  onChange,
}: {
  heightCm: number;
  units: string;
  onChange: (cm: number) => void;
}) {
  if (units === 'lbs') {
    const totalIn = Math.round(heightCm / 2.54);
    const ft = Math.floor(totalIn / 12);
    const inch = totalIn - ft * 12;
    return (
      <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
        <Text style={{ flex: 1, fontSize: 15, color: TOKENS.color.fg.primary }}>Height</Text>
        <TextInput
          style={styles.input}
          value={String(ft)}
          keyboardType="numeric"
          onChangeText={t => {
            const v = parseInt(t);
            if (!isNaN(v)) onChange(((v || 0) * 12 + inch) * 2.54);
          }}
          returnKeyType="done"
        />
        <Text style={styles.unitLabel}>ft</Text>
        <TextInput
          style={styles.input}
          value={String(inch)}
          keyboardType="numeric"
          onChangeText={t => {
            const v = parseInt(t);
            if (!isNaN(v)) onChange((ft * 12 + (v || 0)) * 2.54);
          }}
          returnKeyType="done"
        />
        <Text style={styles.unitLabel}>in</Text>
      </View>
    );
  }

  const m = Math.floor(heightCm / 100);
  const cm = Math.round(heightCm - m * 100);
  return (
    <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
      <Text style={{ flex: 1, fontSize: 15, color: TOKENS.color.fg.primary }}>Height</Text>
      <TextInput
        style={styles.input}
        value={String(m)}
        keyboardType="numeric"
        onChangeText={t => {
          const v = parseInt(t);
          if (!isNaN(v)) onChange((v || 0) * 100 + cm);
        }}
        returnKeyType="done"
      />
      <Text style={styles.unitLabel}>m</Text>
      <TextInput
        style={styles.input}
        value={String(cm)}
        keyboardType="numeric"
        onChangeText={t => {
          const v = parseInt(t);
          if (!isNaN(v)) onChange(m * 100 + (v || 0));
        }}
        returnKeyType="done"
      />
      <Text style={styles.unitLabel}>cm</Text>
    </View>
  );
}

// ─── ExperiencePicker ─────────────────────────────────────────────
const EXP_LEVELS = ['Novice', 'Beginner', 'Intermediate', 'Advanced', 'Elite'];

function ExperiencePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ padding: TOKENS.space.md }}>
      <Text
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          textAlign: 'center',
          fontSize: 15,
          color: TOKENS.color.accent.primary,
          marginBottom: TOKENS.space.md,
        }}
      >
        {expLevelLabel(value)}
      </Text>
      <View style={{ flexDirection: 'row', gap: TOKENS.space.sm }}>
        {EXP_LEVELS.map((_, i) => (
          <Pressable
            key={i}
            onPress={() => { Haptics.selectionAsync(); onChange(i); }}
            style={{
              flex: 1, height: 36,
              borderRadius: TOKENS.radius.sm,
              backgroundColor: i === value ? TOKENS.color.accent.primary : TOKENS.color.bg.elevated,
              borderWidth: 1,
              borderColor: i === value ? TOKENS.color.accent.primary : TOKENS.color.border.subtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 9,
                fontWeight: '600',
                letterSpacing: 0.08 * 9,
                textTransform: 'uppercase',
                color: i === value ? TOKENS.color.accent.onPrimary : TOKENS.color.fg.tertiary,
              }}
            >
              {i + 1}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: TOKENS.color.fg.tertiary, letterSpacing: 0.08 * 9, textTransform: 'uppercase' }}>
          NOVICE
        </Text>
        <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: TOKENS.color.fg.tertiary, letterSpacing: 0.08 * 9, textTransform: 'uppercase' }}>
          ELITE
        </Text>
      </View>
    </View>
  );
}

// ─── BodyMetricsPage ─────────────────────────────────────────────
export function BodyMetricsPage({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { units } = useUnits();
  const { profile: savedOverrides, setProfile: saveOverrides } = useProfile();
  const saved = React.useMemo(() => mockProfile(savedOverrides), [savedOverrides]);

  const [draft, setDraft] = useState(saved);
  useEffect(() => { setDraft(saved); }, [savedOverrides]);

  const isDirty =
    draft.age !== saved.age ||
    Math.round(draft.heightCm) !== Math.round(saved.heightCm) ||
    Math.round(draft.weightKg * 10) !== Math.round(saved.weightKg * 10) ||
    draft.experienceLevel !== saved.experienceLevel;

  const saveBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(saveBarAnim, {
      toValue: isDirty ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [isDirty]);

  function handleSave() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    saveOverrides({
      age: draft.age,
      heightCm: draft.heightCm,
      weightKg: draft.weightKg,
      experienceLevel: draft.experienceLevel,
    });
  }

  function handleDiscard() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft(saved);
  }

  const saveBarTranslateY = saveBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [120, 0],
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SubHeader title="Body metrics" onBack={onBack} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: TOKENS.space.xl, paddingBottom: isDirty ? 200 : 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <SettingsGroup>
          <Field
            label="Age"
            value={draft.age}
            onChangeValue={v => setDraft({ ...draft, age: v })}
            unit="yr"
          />
          <HeightField
            heightCm={draft.heightCm}
            units={units}
            onChange={cm => setDraft({ ...draft, heightCm: cm })}
          />
          <Field
            label="Weight"
            value={Math.round(fromKg(draft.weightKg, units))}
            onChangeValue={v => setDraft({ ...draft, weightKg: toKg(v, units) })}
            unit={unitLabel(units)}
          />
        </SettingsGroup>

        <SettingsGroup title="Experience level">
          <ExperiencePicker
            value={draft.experienceLevel}
            onChange={v => setDraft({ ...draft, experienceLevel: v })}
          />
        </SettingsGroup>
      </ScrollView>

      {/* Save bar — slides up when isDirty */}
      <Animated.View
        style={[
          styles.saveBarWrapper,
          { transform: [{ translateY: saveBarTranslateY }], opacity: saveBarAnim },
        ]}
        pointerEvents={isDirty ? 'auto' : 'none'}
      >
        <View style={styles.saveBar}>
          <Button variant="ghost" size="md" full onPress={handleDiscard}>
            Discard
          </Button>
          <Button variant="primary" size="md" full onPress={handleSave}>
            Save changes
          </Button>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TOKENS.color.bg.base,
  },
  group: {
    backgroundColor: TOKENS.color.bg.surface,
    borderWidth: 1,
    borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.md,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.space.sm,
    padding: TOKENS.space.md,
  },
  input: {
    width: 64,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: TOKENS.color.bg.elevated,
    borderWidth: 1,
    borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.sm,
    color: TOKENS.color.fg.primary,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 14,
    textAlign: 'right',
  },
  unitLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: TOKENS.color.fg.tertiary,
  },
  saveBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: TOKENS.space.md,
    paddingBottom: TOKENS.space.xl,
    backgroundColor: 'transparent',
  },
  saveBar: {
    flexDirection: 'row',
    gap: TOKENS.space.sm,
    padding: TOKENS.space.sm,
    backgroundColor: TOKENS.color.bg.surface,
    borderWidth: 1,
    borderColor: TOKENS.color.accent.primary + '40',
    borderRadius: TOKENS.radius.pill,
  },
});
