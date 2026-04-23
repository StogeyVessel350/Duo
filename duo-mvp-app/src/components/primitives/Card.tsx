import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { TOKENS } from '@/theme';

interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padding?: number;
}

export function Card({ children, style, elevated, padding }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: elevated ? TOKENS.color.bg.elevated : TOKENS.color.bg.surface,
          borderRadius: TOKENS.radius.lg,
          borderWidth: 1,
          borderColor: TOKENS.color.border.subtle,
          padding: padding ?? TOKENS.space.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
