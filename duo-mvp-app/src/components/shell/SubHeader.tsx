import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '@/theme';
import { Text, Icon } from '@/components/primitives';

interface Props {
  title: string;
  onBack: () => void;
}

// Sub-page header — back chevron + "Profile" label, centered page title
// Mirrors SubHeader in features/profile/screens.jsx
export function SubHeader({ title, onBack }: Props) {
  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={handleBack} style={styles.back} hitSlop={12}>
        <Icon
          name="chevron"
          size={12}
          color={TOKENS.color.fg.secondary}
          style={{ transform: [{ rotate: '180deg' }] }}
        />
        <Text
          style={{
            color: TOKENS.color.fg.secondary,
            fontSize: 13,
            fontWeight: '400',
            marginLeft: 4,
          }}
        >
          Profile
        </Text>
      </Pressable>

      <View style={styles.centerTitle}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: TOKENS.color.fg.primary }}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TOKENS.space.xl,
    paddingTop: TOKENS.space.lg,
    paddingBottom: TOKENS.space.md,
    gap: TOKENS.space.sm,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 6,
  },
  centerTitle: {
    flex: 1,
    alignItems: 'center',
    paddingRight: 56, // offset for back button width so title is truly centered
  },
});
