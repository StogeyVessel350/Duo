import React from 'react';
import { Pressable, View, ViewStyle, StyleProp } from 'react-native';
import { TOKENS } from '@/theme';

interface ChipProps {
  children?: React.ReactNode;
  dotColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Children are rendered directly in the flex row — callers own their own Text/Icon styling.
export function Chip({ children, dotColor, onPress, style }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: TOKENS.space.sm,
          height: 28,
          paddingHorizontal: TOKENS.space.md,
          borderRadius: TOKENS.radius.pill,
          backgroundColor: TOKENS.color.bg.elevated,
          borderWidth: 1,
          borderColor: TOKENS.color.border.subtle,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {dotColor && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: dotColor,
          }}
        />
      )}
      {children}
    </Pressable>
  );
}
