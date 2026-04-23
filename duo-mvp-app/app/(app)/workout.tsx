import React, { useState } from 'react';
import { View, ScrollView, Text as RNText, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '@/theme';
import { Text, Button, Chip, Card, Icon, Caption } from '@/components/primitives';
import { ScreenHeader, DuoMark } from '@/components/shell';
import { TAB_BAR_CLEARANCE } from '@/components/shell/TabBar';
import { useUnits, unitLabel } from '@/context/UnitsContext';
import { WorkoutFlow } from '@/features/workout/WorkoutFlow';

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const { units } = useUnits();
  const [workoutActive, setWorkoutActive] = useState(false);

  if (workoutActive) {
    return <WorkoutFlow onComplete={() => setWorkoutActive(false)} />;
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        right={
          <Chip dotColor={TOKENS.color.semantic.success}>
            <Icon name="bluetooth" size={12} color={TOKENS.color.fg.secondary} />
            <Text style={{ fontSize: 12, fontWeight: '500', color: TOKENS.color.fg.secondary }}>DUO · 92%</Text>
          </Chip>
        }
      >
        <DuoMark size={13} />
      </ScreenHeader>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_CLEARANCE }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Caption */}
        <Text variant="caption" color={TOKENS.color.fg.tertiary} style={{ marginTop: TOKENS.space.lg }}>
          Peak velocity · last set
        </Text>

        {/* Giant chartreuse readout */}
        <View style={styles.velocityRow}>
          <RNText style={styles.velocityNum}>0.82</RNText>
          <RNText style={styles.velocityUnit}>m/s</RNText>
        </View>

        {/* Zone sub-line */}
        <View style={styles.zoneRow}>
          <View style={styles.zoneDot} />
          <Text variant="bodyMD" color={TOKENS.color.fg.secondary}>
            Power zone · strength-speed
          </Text>
        </View>

        {/* Three-stat row */}
        <View style={styles.statsGrid}>
          <StatBlock label="Session" value="52" unit="min" />
          <StatBlock label="Volume" value={units === 'lbs' ? '9,432' : '4,280'} unit={unitLabel(units)} />
          <StatBlock label="Reps" value="98" />
        </View>

        {/* Today card */}
        <View style={styles.todaySection}>
          <Text variant="caption" color={TOKENS.color.fg.tertiary}>Today</Text>
          <View style={{ marginTop: TOKENS.space.md }}>
            <Card padding={TOKENS.space.lg}>
              <View style={styles.cardHeader}>
                <View>
                  <Text variant="titleLG">Lower · Power</Text>
                  <Text variant="bodySM" color={TOKENS.color.fg.secondary} style={{ marginTop: 2 }}>
                    5 exercises · ~48 min
                  </Text>
                </View>
                <Icon name="chevron" size={12} color={TOKENS.color.fg.tertiary} />
              </View>
              <View style={styles.exerciseChips}>
                {['Back squat', 'Trap-bar DL', 'Split squat', 'Nordic', 'Calf raise'].map(n => (
                  <View key={n} style={styles.exerciseChip}>
                    <RNText style={styles.exerciseChipText}>{n}</RNText>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        </View>
      </ScrollView>

      {/* Start CTA — sticks above tab bar */}
      <View style={[styles.cta, { paddingBottom: 112 + insets.bottom }]}>
        <Button
          variant="primary"
          size="lg"
          full
          onPress={() => setWorkoutActive(true)}
          trailing={<Icon name="arrowRight" size={16} color={TOKENS.color.accent.onPrimary} />}
        >
          Start workout
        </Button>
      </View>
    </View>
  );
}

function StatBlock({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.statBlock}>
      <Text variant="caption" color={TOKENS.color.fg.tertiary}>{label}</Text>
      <View style={styles.statValueRow}>
        <RNText style={styles.statValue}>{value}</RNText>
        {unit ? (
          <RNText style={styles.statUnit}>{unit}</RNText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.color.bg.base },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: TOKENS.space.xl,
  },

  velocityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: TOKENS.space.sm,
    marginTop: TOKENS.space.md,
  },
  velocityNum: {
    fontSize: 96,
    lineHeight: 96,
    fontWeight: '500',
    letterSpacing: -0.04 * 96,
    color: TOKENS.color.accent.primary,
  },
  velocityUnit: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 20,
    fontWeight: '400',
    color: TOKENS.color.fg.secondary,
    paddingBottom: TOKENS.space.md,
  },

  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.space.sm,
    marginTop: TOKENS.space.xs,
  },
  zoneDot: {
    width: 6,
    height: 6,
    borderRadius: 1,
    backgroundColor: TOKENS.color.velocity.power,
  },

  statsGrid: {
    flexDirection: 'row',
    marginTop: TOKENS.space.xxl,
    gap: TOKENS.space.lg,
  },
  statBlock: {
    flex: 1,
    paddingTop: TOKENS.space.md,
    borderTopWidth: 1,
    borderTopColor: TOKENS.color.border.subtle,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: -0.02 * 24,
    color: TOKENS.color.fg.primary,
  },
  statUnit: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: TOKENS.color.fg.tertiary,
    paddingBottom: 3,
  },

  todaySection: {
    marginTop: TOKENS.space.xxl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  exerciseChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TOKENS.space.sm,
    marginTop: TOKENS.space.lg,
  },
  exerciseChip: {
    paddingHorizontal: TOKENS.space.sm,
    paddingVertical: 4,
    borderRadius: TOKENS.radius.sm,
    backgroundColor: TOKENS.color.bg.elevated,
    borderWidth: 1,
    borderColor: TOKENS.color.border.subtle,
  },
  exerciseChipText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: TOKENS.color.fg.secondary,
    letterSpacing: 0.02 * 11,
  },

  cta: {
    paddingHorizontal: TOKENS.space.xl,
    paddingTop: TOKENS.space.lg,
  },
});
