import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '@/theme';
import { Text, Card, Button } from '@/components/primitives';
import { ScreenHeader } from '@/components/shell';

interface Props {
  prescription: { exercise: { name: string }; reps: number };
  reps: number;
  onDone: (avgV: number) => void;
}

const AVG_V = 0.74;

function ScoreBadge({ score }: { score: 'A' | 'B' | 'C' | 'D' }) {
  const colors = { A: TOKENS.color.semantic.success, B: TOKENS.color.velocity.power, C: TOKENS.color.semantic.warning, D: TOKENS.color.semantic.danger };
  const color = colors[score];
  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color + '50' }]}>
      <Text variant="displayLG" color={color}>{score}</Text>
    </View>
  );
}

export function SetFeedbackScreen({ prescription, reps, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const score: 'A' | 'B' | 'C' | 'D' = AVG_V >= 0.80 ? 'A' : AVG_V >= 0.65 ? 'B' : AVG_V >= 0.50 ? 'C' : 'D';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Set Complete" />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Score */}
        <View style={styles.scoreRow}>
          <ScoreBadge score={score} />
          <View style={styles.scoreInfo}>
            <Text variant="titleLG">Set Score</Text>
            <Text variant="bodyMD" color={TOKENS.color.fg.secondary}>
              {reps} reps · avg {AVG_V.toFixed(2)} m/s
            </Text>
          </View>
        </View>

        {/* Velocity breakdown */}
        <Card>
          <Text variant="caption" color={TOKENS.color.fg.tertiary} style={styles.label}>VELOCITY</Text>
          <View style={styles.statsRow}>
            <StatItem label="Peak" value="0.81" unit="m/s" color={TOKENS.color.semantic.success} />
            <StatItem label="Avg" value="0.74" unit="m/s" color={TOKENS.color.accent.primary} />
            <StatItem label="Loss" value="8.2" unit="%" color={TOKENS.color.semantic.warning} />
          </View>
        </Card>

        {/* Bilateral */}
        <Card>
          <Text variant="caption" color={TOKENS.color.fg.tertiary} style={styles.label}>BILATERAL BALANCE</Text>
          <View style={styles.bilRow}>
            <View style={styles.bilSide}>
              <Text variant="titleLG" color={TOKENS.color.bilateral.left}>51%</Text>
              <Text variant="caption" color={TOKENS.color.fg.tertiary}>LEFT</Text>
            </View>
            <View style={styles.bilBar}>
              <View style={[styles.bilSegL, { flex: 51 }]} />
              <View style={[styles.bilSegR, { flex: 49 }]} />
            </View>
            <View style={styles.bilSide}>
              <Text variant="titleLG" color={TOKENS.color.bilateral.right}>49%</Text>
              <Text variant="caption" color={TOKENS.color.fg.tertiary}>RIGHT</Text>
            </View>
          </View>
        </Card>

        {/* Cue cards */}
        <Card style={styles.cueCard}>
          <Text variant="caption" color={TOKENS.color.fg.tertiary} style={styles.label}>COACH NOTES</Text>
          <Text variant="bodyMD" color={TOKENS.color.fg.primary}>
            Velocity maintained well. Drive through heels more aggressively on reps 3–4.
          </Text>
        </Card>

        <Button
          label="Next Set →"
          size="lg"
          fullWidth
          onPress={() => onDone(AVG_V)}
        />
      </ScrollView>
    </View>
  );
}

function StatItem({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.statItem}>
      <Text variant="caption" color={TOKENS.color.fg.tertiary}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        <Text variant="titleLG" color={color}>{value}</Text>
        <Text variant="bodySM" color={TOKENS.color.fg.tertiary}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.color.bg.base },
  content: { padding: TOKENS.space.lg, gap: TOKENS.space.md },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.lg, paddingVertical: TOKENS.space.sm },
  badge: {
    width: 72, height: 72, borderRadius: TOKENS.radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  scoreInfo: { gap: TOKENS.space.xs },
  label: { marginBottom: TOKENS.space.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: TOKENS.space.xs },
  bilRow: { flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.md },
  bilSide: { width: 48, alignItems: 'center' },
  bilBar: { flex: 1, height: 8, flexDirection: 'row', borderRadius: 4, overflow: 'hidden' },
  bilSegL: { backgroundColor: TOKENS.color.bilateral.left },
  bilSegR: { backgroundColor: TOKENS.color.bilateral.right },
  cueCard: {},
});
