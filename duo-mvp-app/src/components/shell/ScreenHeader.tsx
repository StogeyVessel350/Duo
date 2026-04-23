import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOKENS } from '@/theme';
import { Text } from '@/components/primitives';
import { Icon } from '@/components/primitives';

interface Props {
  // Prototype API: children = left content (e.g. DuoMark), right = right slot
  children?: React.ReactNode;
  right?: React.ReactNode;
  // Legacy API: title + onBack for sub-screens (use SubHeader instead for new code)
  title?: string;
  onBack?: () => void;
}

export function ScreenHeader({ children, right, title, onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + TOKENS.space.sm }]}>
      <View style={styles.row}>
        {/* Left slot */}
        <View style={styles.left}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12}>
              <Icon name="chevron" size={12} color={TOKENS.color.fg.secondary} style={{ transform: [{ rotate: '180deg' }] }} />
            </Pressable>
          ) : children}
        </View>

        {/* Center title (legacy) */}
        {title && (
          <Text variant="titleMD" style={styles.title}>{title}</Text>
        )}

        {/* Right slot */}
        <View style={styles.right}>
          {right}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: TOKENS.color.bg.base,
    paddingBottom: TOKENS.space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TOKENS.space.xl,
    minHeight: 44,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.space.sm,
  },
});
