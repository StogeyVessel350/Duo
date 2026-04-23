import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '@/theme';
import { Text, Button } from '@/components/primitives';

interface Props {
  seconds: number;
  onDone: () => void;
  onSkip: () => void;
}

const R = 72;
const CIRC = 2 * Math.PI * R;

export function RestTimerScreen({ seconds, onDone, onSkip }: Props) {
  const insets = useSafeAreaInsets();
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const total = seconds;

  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDone();
      return;
    }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, paused]);

  const pct = remaining / total;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + TOKENS.space.xl }]}>
      <View style={styles.header}>
        <Text variant="titleMD" color={TOKENS.color.fg.secondary}>Rest</Text>
      </View>

      <View style={styles.center}>
        <View style={styles.ringWrap}>
          <Svg width={180} height={180} viewBox="0 0 180 180">
            <Circle cx={90} cy={90} r={R} fill="none" stroke={TOKENS.color.border.subtle} strokeWidth={6} />
            <Circle
              cx={90} cy={90} r={R}
              fill="none"
              stroke={TOKENS.color.accent.primary}
              strokeWidth={6}
              strokeDasharray={`${CIRC * pct} ${CIRC * (1 - pct)}`}
              strokeDashoffset={CIRC * 0.25}
              strokeLinecap="round"
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text variant="displayXL" color={TOKENS.color.fg.primary}>
              {mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}`}
            </Text>
            <Text variant="caption" color={TOKENS.color.fg.tertiary}>REMAINING</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable onPress={() => setRemaining(r => Math.max(0, r - 15))} style={styles.controlBtn}>
            <Text variant="titleMD" color={TOKENS.color.fg.secondary}>−15s</Text>
          </Pressable>
          <Pressable onPress={() => setPaused(p => !p)} style={styles.playBtn}>
            <Text variant="titleLG">{paused ? '▶' : '⏸'}</Text>
          </Pressable>
          <Pressable onPress={() => setRemaining(r => r + 15)} style={styles.controlBtn}>
            <Text variant="titleMD" color={TOKENS.color.fg.secondary}>+15s</Text>
          </Pressable>
        </View>
      </View>

      <Button label="Skip Rest →" variant="ghost" size="md" fullWidth onPress={onSkip} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.color.bg.base, paddingHorizontal: TOKENS.space.lg },
  header: { paddingVertical: TOKENS.space.xl, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: TOKENS.space.xxl },
  ringWrap: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.xl },
  controlBtn: { padding: TOKENS.space.md },
  playBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: TOKENS.color.bg.elevated,
    borderWidth: 1, borderColor: TOKENS.color.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
});
