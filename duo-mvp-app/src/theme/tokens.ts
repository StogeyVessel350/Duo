export const TOKENS = {
  color: {
    bg: {
      base: '#000000',
      surface: '#0A0A0C',
      elevated: '#141418',
      overlay: 'rgba(0,0,0,0.72)',
    },
    fg: {
      primary: '#FAFAFA',
      secondary: '#A0A0A8',
      tertiary: '#55555C',
      disabled: '#2A2A30',
    },
    border: {
      subtle: 'rgba(255,255,255,0.06)',
      default: 'rgba(255,255,255,0.10)',
      strong: 'rgba(255,255,255,0.18)',
    },
    accent: {
      primary: '#E6FF3D',
      primaryPressed: '#C9E032',
      onPrimary: '#000000',
    },
    semantic: {
      success: '#4ADE80',
      warning: '#FBBF24',
      danger: '#F87171',
      info: '#60A5FA',
    },
    velocity: {
      strength: '#60A5FA',
      power: '#E6FF3D',
      speed: '#F87171',
    },
    bilateral: {
      left: '#60A5FA',
      right: '#E6FF3D',
    },
  },
  type: {
    displayXL: { size: 56, lh: 60, weight: '500' as const, tracking: -0.02 },
    displayLG: { size: 40, lh: 44, weight: '500' as const, tracking: -0.02 },
    displayMD: { size: 28, lh: 34, weight: '500' as const, tracking: -0.01 },
    titleLG:   { size: 20, lh: 26, weight: '600' as const, tracking: -0.005 },
    titleMD:   { size: 17, lh: 22, weight: '600' as const, tracking: 0 },
    bodyLG:    { size: 17, lh: 24, weight: '400' as const, tracking: 0 },
    bodyMD:    { size: 15, lh: 22, weight: '400' as const, tracking: 0 },
    bodySM:    { size: 13, lh: 18, weight: '400' as const, tracking: 0 },
    caption:   { size: 11, lh: 14, weight: '600' as const, tracking: 0.08, upper: true },
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, huge: 64 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 },
  motion: {
    duration: { instant: 120, fast: 200, medium: 320, slow: 520 },
  },
} as const;

export type Theme = typeof TOKENS;
