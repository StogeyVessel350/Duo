import React from 'react';
import { Text as RNText, TextStyle, StyleProp } from 'react-native';
import { TOKENS } from '@/theme';

type TypeVariant = keyof typeof TOKENS.type;

interface TextProps {
  variant?: TypeVariant;
  mono?: boolean;
  color?: string;
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  align?: TextStyle['textAlign'];
}

export function Text({ variant = 'bodyMD', mono = false, color, children, style, numberOfLines, align }: TextProps) {
  const t = TOKENS.type[variant] || TOKENS.type.bodyMD;

  let fontFamily: string | undefined;
  if (mono) {
    fontFamily = Number(t.weight) >= 600 ? 'JetBrainsMono_600SemiBold' : 'JetBrainsMono_400Regular';
  }

  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily,
          fontSize: t.size,
          lineHeight: t.lh,
          fontWeight: t.weight,
          letterSpacing: t.tracking ? t.tracking * t.size : 0,
          textTransform: (t as any).upper ? 'uppercase' : 'none',
          color: color || TOKENS.color.fg.primary,
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

export function Caption({ children, color, style }: { children?: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text variant="caption" color={color || TOKENS.color.fg.tertiary} style={style}>
      {children}
    </Text>
  );
}
