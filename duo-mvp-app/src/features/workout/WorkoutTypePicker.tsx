import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '@/theme';
import { Text, Card } from '@/components/primitives';
import { ScreenHeader } from '@/components/shell';
import { WorkoutType } from './catalog';

interface Props {
  workoutTypes: WorkoutType[];
  onSelect: (wt: WorkoutType) => void;
  onBack: () => void;
}

const TYPE_COLOR: Record<string, string> = {
  heavy: TOKENS.color.velocity.strength,
  hypertrophy: TOKENS.color.velocity.power,
  hiit: TOKENS.color.velocity.speed,
};

export function WorkoutTypePicker({ workoutTypes, onSelect, onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Training Style" onBack={onBack} />
      <View style={styles.content}>
        <Text variant="bodyMD" color={TOKENS.color.fg.secondary} style={styles.subtitle}>
          Choose based on today's goal
        </Text>
        {workoutTypes.map(wt => {
          const color = TYPE_COLOR[wt.id] ?? TOKENS.color.fg.secondary;
          return (
            <Pressable key={wt.id} onPress={() => onSelect(wt)}>
              <Card style={[styles.card, { borderColor: color + '30' }]}>
                <View style={styles.cardRow}>
                  <View style={styles.cardInfo}>
                    <Text variant="titleLG" color={color}>{wt.label}</Text>
                    <Text variant="bodyMD" color={TOKENS.color.fg.secondary}>{wt.description}</Text>
                    <Text variant="bodySM" color={TOKENS.color.fg.tertiary}>
                      {wt.sets} sets × {wt.reps} reps @ {Math.round(wt.intensityPct * 100)}%
                    </Text>
                  </View>
                  <View style={[styles.intensity, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                    <Text variant="displayMD" color={color}>{Math.round(wt.intensityPct * 100)}</Text>
                    <Text variant="caption" color={color}>% 1RM</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.color.bg.base },
  content: { flex: 1, padding: TOKENS.space.lg, gap: TOKENS.space.md },
  subtitle: { marginBottom: TOKENS.space.sm },
  card: {},
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.lg },
  cardInfo: { flex: 1, gap: TOKENS.space.xs },
  intensity: {
    width: 72, height: 72, borderRadius: TOKENS.radius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2,
  },
});
