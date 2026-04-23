import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '@/theme';
import { Text, Card, Button } from '@/components/primitives';
import { ScreenHeader } from '@/components/shell';
import { AnimatedFigure } from '@/features/animation/AnimatedFigure';

interface Prescription {
  exercise: { name: string; clip: string; cues: string[] };
  workoutType: { label: string; description: string };
  sets: number;
  reps: number;
  weightKg: number;
  intensityPct: number;
}

interface Props {
  prescription: Prescription;
  currentSet: number;
  onStart: () => void;
  onBack: () => void;
}

export function ExercisePreview({ prescription, currentSet, onStart, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { exercise, workoutType, sets, reps, weightKg } = prescription;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title={`Set ${currentSet} of ${sets}`} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Exercise hero */}
        <View style={styles.hero}>
          <AnimatedFigure
            clipId={exercise.clip}
            width={160}
            height={220}
            tint={TOKENS.color.accent.primary}
          />
          <Text variant="displayMD" style={styles.exerciseName}>{exercise.name}</Text>
          <Text variant="bodyMD" color={TOKENS.color.fg.secondary}>{workoutType.description}</Text>
        </View>

        {/* Prescription */}
        <Card style={styles.prescriptionCard}>
          <View style={styles.statRow}>
            <PrescStat label="SETS" value={`${currentSet}/${sets}`} />
            <PrescStat label="REPS" value={`${reps}`} />
            <PrescStat label="WEIGHT" value={`${Math.round(weightKg * 2.205)}`} unit="lbs" />
            <PrescStat label="INTENSITY" value={`${Math.round(prescription.intensityPct * 100)}`} unit="%" />
          </View>
        </Card>

        {/* Why this exercise */}
        <Card>
          <Text variant="caption" color={TOKENS.color.fg.tertiary} style={styles.sectionLabel}>WHY THIS?</Text>
          <Text variant="bodyMD" color={TOKENS.color.fg.secondary}>
            Based on your velocity profile and {workoutType.label.toLowerCase()} training goal.
            Target velocity: 0.70–0.85 m/s.
          </Text>
        </Card>

        {/* Cues */}
        <Card>
          <Text variant="caption" color={TOKENS.color.fg.tertiary} style={styles.sectionLabel}>COACHING CUES</Text>
          {exercise.cues.map((cue, i) => (
            <View key={i} style={styles.cueRow}>
              <Text variant="bodyMD" color={TOKENS.color.accent.primary}>{i + 1}.</Text>
              <Text variant="bodyMD">{cue}</Text>
            </View>
          ))}
        </Card>

        <Button label="Start Set" size="lg" fullWidth onPress={onStart} />
      </ScrollView>
    </View>
  );
}

function PrescStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.prescStat}>
      <Text variant="caption" color={TOKENS.color.fg.tertiary}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        <Text variant="titleLG" color={TOKENS.color.fg.primary}>{value}</Text>
        {unit && <Text variant="bodySM" color={TOKENS.color.fg.tertiary}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.color.bg.base },
  content: { padding: TOKENS.space.lg, gap: TOKENS.space.md, alignItems: 'stretch' },
  hero: { alignItems: 'center', gap: TOKENS.space.sm, paddingVertical: TOKENS.space.lg, backgroundColor: TOKENS.color.bg.surface, borderRadius: TOKENS.radius.xl },
  exerciseName: { marginTop: TOKENS.space.sm },
  prescriptionCard: {},
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  prescStat: { alignItems: 'center', gap: TOKENS.space.xs },
  sectionLabel: { marginBottom: TOKENS.space.sm },
  cueRow: { flexDirection: 'row', gap: TOKENS.space.sm, marginBottom: TOKENS.space.xs },
});
