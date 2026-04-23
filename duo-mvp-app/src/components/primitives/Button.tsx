import React from 'react';
import { Pressable, View, ViewStyle, StyleProp } from 'react-native';
import { TOKENS } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'ghost' | 'bare';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  children?: React.ReactNode;
  // backward-compat: if children not supplied, label is used
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  full?: boolean;
  fullWidth?: boolean; // backward compat alias for full
}

const HEIGHT: Record<Size, number> = { sm: 36, md: 48, lg: 56 };
const H_PAD: Record<Size, number> = { sm: TOKENS.space.lg, md: TOKENS.space.xl, lg: TOKENS.space.xl };
const FONT_SIZE: Record<Size, number> = { sm: 13, md: 15, lg: 17 };

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  label,
  onPress,
  disabled = false,
  leading,
  trailing,
  style,
  full = false,
  fullWidth,
}: ButtonProps) {
  const isFullWidth = full || fullWidth;
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  const fgColor = isPrimary
    ? TOKENS.color.accent.onPrimary
    : variant === 'bare'
    ? TOKENS.color.fg.secondary
    : TOKENS.color.fg.primary;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        {
          height: HEIGHT[size],
          paddingHorizontal: H_PAD[size],
          borderRadius: TOKENS.radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: TOKENS.space.sm,
          alignSelf: isFullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.4 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
          backgroundColor: isPrimary
            ? pressed ? TOKENS.color.accent.primaryPressed : TOKENS.color.accent.primary
            : 'transparent',
          borderWidth: isGhost ? 1 : 0,
          borderColor: isGhost ? TOKENS.color.border.default : 'transparent',
        },
        style,
      ]}
    >
      {leading}
      <Text
        style={{
          fontSize: FONT_SIZE[size],
          fontWeight: isPrimary ? '600' : '500',
          color: fgColor,
          letterSpacing: 0,
        }}
      >
        {children ?? label}
      </Text>
      {trailing}
    </Pressable>
  );
}
