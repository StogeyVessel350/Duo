import React from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '@/theme';
import { Text, Card, Button } from '@/components/primitives';
import { ScreenHeader } from '@/components/shell';
import { MUSCLE_GROUPS } from './catalog';

interface Props {
  onSelect: (muscleGroup: string) => void;
  onCancel: () => void;
}

export function MuscleGroupPicker({ onSelect, onCancel }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="What are you training?" onBack={onCancel} />
      <FlatList
        data={MUSCLE_GROUPS}
        keyExtractor={mg => mg.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <Pressable style={styles.cellWrap} onPress={() => onSelect(item.id)}>
            <Card style={styles.cell}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text variant="titleMD">{item.label}</Text>
              <Text variant="bodySM" color={TOKENS.color.fg.tertiary}>
                {item.regions.slice(0, 2).join(', ')}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.color.bg.base },
  grid: { padding: TOKENS.space.lg, gap: TOKENS.space.sm },
  row: { gap: TOKENS.space.sm },
  cellWrap: { flex: 1 },
  cell: { gap: TOKENS.space.xs },
  emoji: { fontSize: 28 },
});
