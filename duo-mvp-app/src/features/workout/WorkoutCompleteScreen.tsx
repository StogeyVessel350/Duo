import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '@/theme';
import { Text, Card, Button } from '@/components/primitives';

interface Props {
  prescription: {
    exercise: { name: string };
    sets: number;
    reps: number;
    weightKg: number;
  };
  sets: Array<{ reps: number; avgV: number }>;
  onDone: () => void;
}

export function WorkoutCompleteScreen({ prescription, sets, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const avgV = sets.length > 0 ? sets.reduce((s, set) => s + set.avgV, 0) / sets.length : 0;
  const totalReps = sets.reduce((s, set) => s + set.reps, 0);
  const volume = Math.round(prescription.weightKg * totalReps);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + TOKENS.space.xl }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Celebration */}
        <View style={styles.celebrationArea}>
          <Text style={styles.trophy}>🏆</Text>
          <Text variant="displayMD" align="center">Workout Complete</Text>
          <Text variant="bodyMD" color={TOKENS.color.fg.secondary} align="center">
            {prescription.exercise.name} · {prescription.sets} sets
          </Text>
        </View>

        {/* Summary stats */}
        <Card style={styles.summaryCard}>
          <View style={styles.statsGrid}>
            <SumStat label="AVG VELOCITY" value={avgV.toFixed(2)} unit="m/s" color={TOKENS.color.accent.primary} />
            <SumStat label="TOTAL REPS" value={`${totalReps}`} unit="" color={TOKENS.color.fg.primary} />
            <SumStat label="VOLUME" value={`${volume}`} unit="kg" color={TOKENS.color.fg.primary} />
          </View>
        </Card>

        {/* Per-set breakdown */}
        <Card>
          <Text variant="caption" color={TOKENS.color.fg.tertiary} style={styles.label}>SET BREAKDOWN</Text>
          {sets.map((set, i) => {
            const grade = set.avgV >= 0.80 ? 'A' : set.avgV >= 0.65 ? 'B' : 'C';
            const gradeColor = { A: TOKENS.color.semantic.success, B: TOKENS.color.velocity.power, C: TOKENS.color.semantic.warning }[grade];
            return (
              <View key={i} style={styles.setRow}>
                <Text variant="bodyMD" color={TOKENS.color.fg.secondary}>Set {i + 1}</Text>
                <View style={styles.setRight}>
                  <Text variant="bodyMD">{set.reps} reps</Text>
                  <Text variant="bodyMD" color={TOKENS.color.fg.secondary}>{set.avgV.toFixed(2)} m/s</Text>
                  <Text variant="caption" color={gradeColor}>{grade}</Text>
                </View>
              </View>
            );
          })}
        </Card>

        {/* Next steps */}
        <Card>
          <Text variant="caption" color={TOKENS.color.fg.tertiary} style={styles.label}>COACH ANALYSIS</Text>
          <Text variant="bodyMD" color={TOKENS.color.fg.secondary}>
            Velocity well maintained across all sets. Recovery is on track.
            Next session: aim for 0.75+ m/s average.
          </Text>
        </Card>

        <Button label="Finish" size="lg" fullWidth onPress={onDone} />
      </ScrollView>
    </View>
  );
}

function SumStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.sumStat}>
      <Text variant="caption" color={TOKENS.color.fg.tertiary}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        <Text variant="displayMD" color={color}>{value}</Text>
        {unit ? <Text variant="bodySM" color={TOKENS.color.fg.tertiary}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.color.bg.base },
  content: { padding: TOKENS.space.lg, gap: TOKENS.space.md },
  celebrationArea: { alignItems: 'center', paddingVertical: TOKENS.space.xxl, gap: TOKENS.space.sm },
  trophy: { fontSize: 56 },
  summaryCard: {},
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  sumStat: { alignItems: 'center', gap: TOKENS.space.xs },
  label: { marginBottom: TOKENS.space.md },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: TOKENS.space.sm },
  setRight: { flexDirection: 'row', gap: TOKENS.space.lg, alignItems: 'center' },
});
