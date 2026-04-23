import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '@/theme';

export interface TabItem {
  id: string;
  label: string;
  icon: string;
}

export const TABS: TabItem[] = [
  { id: 'workout', label: 'Workout', icon: 'dumbbell' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'library', label: 'Library', icon: 'library' },
  { id: 'coach',   label: 'Coach',   icon: 'coach'   },
  { id: 'profile', label: 'Profile', icon: 'profile' },
];

// Bottom clearance every screen should add so content isn't hidden behind the floating tab bar.
// tab pill (~48) + bottom offset (24) + breathing room = 100
export const TAB_BAR_CLEARANCE = 100;

interface TabBarProps {
  activeTab: string;
  onSelect: (id: string) => void;
}

// Floating dots pill — positioned absolute over all screens, centred horizontally, 24pt from bottom.
// Matches shell.jsx "dots" style exactly.
export function TabBar({ activeTab, onSelect }: TabBarProps) {
  const insets = useSafeAreaInsets();

  function handlePress(id: string) {
    Haptics.selectionAsync();
    onSelect(id);
  }

  return (
    <View
      style={[styles.wrapper, { bottom: 24 + insets.bottom }]}
      pointerEvents="box-none"
    >
      <View style={styles.pill}>
        {TABS.map(tab => {
          const active = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              onPress={() => handlePress(tab.id)}
              accessibilityLabel={tab.label}
              style={styles.dotBtn}
            >
              <View
                style={[
                  styles.dot,
                  {
                    width: active ? 10 : 6,
                    height: active ? 10 : 6,
                    backgroundColor: active
                      ? TOKENS.color.accent.primary
                      : TOKENS.color.fg.tertiary,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
    pointerEvents: 'box-none',
  } as any,
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.space.md,
    paddingHorizontal: TOKENS.space.lg,
    paddingVertical: 10,
    backgroundColor: TOKENS.color.bg.elevated,
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: TOKENS.color.border.subtle,
  },
  dotBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 99,
  },
});
