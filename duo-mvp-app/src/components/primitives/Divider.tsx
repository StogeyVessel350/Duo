import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { TOKENS } from '@/theme';

interface DividerProps {
  style?: StyleProp<ViewStyle>;
}

export function Divider({ style }: DividerProps) {
  return (
    <View
      style={[
        { height: 1, backgroundColor: TOKENS.color.border.subtle },
        style,
      ]}
    />
  );
}
