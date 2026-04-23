import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { TOKENS } from '@/theme';

interface Props {
  size?: number;
  color?: string;
}

export function DuoMark({ size = 13, color = TOKENS.color.fg.primary }: Props) {
  const svgW = size * 1.6;
  const svgH = size;
  const fontSize = size - 2;

  return (
    <View style={styles.row}>
      <Svg width={svgW} height={svgH} viewBox="0 0 22 14" fill="none">
        <Circle cx="4"  cy="7" r="3.5" stroke={color} strokeWidth="1.4" />
        <Circle cx="18" cy="7" r="3.5" stroke={color} strokeWidth="1.4" />
        <Path d="M7.5 7h7" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      </Svg>
      <Text style={{ fontSize, fontWeight: '600', letterSpacing: 0.14 * fontSize, color }}>
        DUO
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
