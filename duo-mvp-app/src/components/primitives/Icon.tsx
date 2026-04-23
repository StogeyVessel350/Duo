import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { TOKENS } from '@/theme';

// Exact mirror of primitives.jsx ICONS — stroked, 1.75 stroke, 24px grid
export type IconName =
  | 'dumbbell' | 'history' | 'library' | 'coach' | 'profile'
  | 'bolt' | 'plus' | 'arrowRight' | 'chevron' | 'search'
  | 'bluetooth' | 'settings' | 'battery' | 'check' | 'close' | 'pause';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: object;
}

export function Icon({ name, size = 24, color, style }: IconProps) {
  const c = color || TOKENS.color.fg.primary;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {renderIcon(name, size, c)}
    </View>
  );
}

function renderIcon(name: IconName, size: number, c: string) {
  const s = { stroke: c, strokeWidth: 1.75, strokeLinecap: 'round' as const };
  const sj = { ...s, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'dumbbell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12" {...s} />
        </Svg>
      );
    case 'history':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.7L3 8" {...sj} />
          <Path d="M3 3v5h5M12 7v5l3 2" {...sj} />
        </Svg>
      );
    case 'library':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4 4h4v16H4zM10 4h4v16h-4zM16.5 5l3.8 1-3 15-3.8-1z" stroke={c} strokeWidth={1.75} strokeLinejoin="round" />
        </Svg>
      );
    case 'coach':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 3l2.5 5.5L20 10l-4.5 4 1.2 6L12 17l-4.7 3 1.2-6L4 10l5.5-1.5z" stroke={c} strokeWidth={1.75} strokeLinejoin="round" />
        </Svg>
      );
    case 'profile':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="8" r="4" stroke={c} strokeWidth={1.75} />
          <Path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" {...s} />
        </Svg>
      );
    case 'bolt':
      return (
        <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
          <Path d="M8 1L2 8h4l-1 5 6-7H7l1-5z" fill={c} />
        </Svg>
      );
    case 'plus':
      return (
        <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
          <Path d="M9 3v12M3 9h12" stroke={c} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case 'arrowRight':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <Path d="M3 8h10M9 4l4 4-4 4" {...sj} />
        </Svg>
      );
    case 'chevron':
      return (
        <Svg width={size} height={size} viewBox="0 0 8 14" fill="none">
          <Path d="M1 1l6 6-6 6" {...sj} />
        </Svg>
      );
    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <Circle cx="9" cy="9" r="6" stroke={c} strokeWidth={1.75} />
          <Path d="M14 14l4 4" {...s} />
        </Svg>
      );
    case 'bluetooth':
      return (
        <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
          <Path d="M4 4l6 6-3 3V1l3 3-6 6" stroke={c} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
          <Circle cx="11" cy="11" r="3" stroke={c} strokeWidth={1.75} />
          <Path d="M11 1v3M11 18v3M21 11h-3M4 11H1M18.1 3.9l-2.1 2.1M6 16l-2.1 2.1M18.1 18.1L16 16M6 6L3.9 3.9" {...s} />
        </Svg>
      );
    case 'battery':
      return (
        <Svg width={size} height={size} viewBox="0 0 18 10" fill="none">
          <Rect x="0.5" y="0.5" width="14" height="9" rx="2" stroke={c} strokeOpacity={0.5} />
          <Rect x="2" y="2" width="9" height="6" rx="1" fill={c} />
          <Path d="M16 3v4" stroke={c} strokeOpacity={0.5} strokeLinecap="round" />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
          <Path d="M3 8l3 3 7-7" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
          <Path d="M3 3l8 8M11 3l-8 8" {...s} />
        </Svg>
      );
    case 'pause':
      return (
        <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
          <Rect x="3" y="2" width="2.5" height="10" rx="0.6" fill={c} />
          <Rect x="8.5" y="2" width="2.5" height="10" rx="0.6" fill={c} />
        </Svg>
      );
    default:
      return null;
  }
}
