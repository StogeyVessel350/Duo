import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '@/theme';
import { Text, Button } from '@/components/primitives';
import { useVelocityStream, zoneFor } from '@/features/velocity';
import { getVeloBar } from '@/services/ble';

interface Props {
  prescription: { exercise: { name: string }; reps: number; sets: number };
  setNumber: number;
  onDone: (reps: number[]) => void;
}

const RING_R = 56;
const RING_CIRC = 2 * Math.PI * RING_R;

export function LiveSetScreen({ prescription, setNumber, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { reps, latest, reset } = useVelocityStream();
  const bar = useRef(getVeloBar());
  const targetReps = prescription.reps;
  const pct = Math.min(reps.length / targetReps, 1);
  const zone = latest ? zoneFor(latest.peakV) : null;

  useEffect(() => {
    reset();
    bar.current.start();
    return () => bar.current.stop();
  }, []);

  useEffect(() => {
    if (reps.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [reps.length]);

  function handleDone() {
    bar.current.stop();
    onDone(reps.map(r => r.rep));
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + TOKENS.space.xl }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="titleMD" color={TOKENS.color.fg.secondary}>
          Set {setNumber} · {prescription.exercise.name}
        </Text>
      </View>

      {/* Rep counter ring */}
      <View style={styles.counterArea}>
        <View style={styles.ringWrap}>
          <Svg width={144} height={144} viewBox="0 0 144 144">
            {/* Tick marks */}
            {Array.from({ length: targetReps }).map((_, i) => {
              const angle = (i / targetReps) * Math.PI * 2 - Math.PI / 2;
              const ox = 72 + Math.cos(angle) * RING_R;
              const oy = 72 + Math.sin(angle) * RING_R;
              const ix = 72 + Math.cos(angle) * (RING_R - 8);
              const iy = 72 + Math.sin(angle) * (RING_R - 8);
              return (
                <Path
                  key={i}
                  d={`M${ox},${oy} L${ix},${iy}`}
                  stroke={i < reps.length ? TOKENS.color.accent.primary : TOKENS.color.border.subtle}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              );
            })}
            {/* Progress arc */}
            <Circle
              cx={72} cy={72} r={RING_R}
              fill="none"
              stroke={TOKENS.color.accent.primary}
              strokeWidth={4}
              strokeDasharray={`${RING_CIRC * pct} ${RING_CIRC * (1 - pct)}`}
              strokeDashoffset={RING_CIRC * 0.25}
              strokeLinecap="round"
              opacity={0.3}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text variant="displayXL" color={TOKENS.color.fg.primary} style={styles.repCount}>
              {reps.length}
            </Text>
            <Text variant="caption" color={TOKENS.color.fg.tertiary}>of {targetReps}</Text>
          </View>
        </View>

        {/* Velocity readout */}
        <View style={styles.velocityBlock}>
          <Text
            variant="displayLG"
            color={zone?.color ?? TOKENS.color.fg.tertiary}
          >
            {latest ? latest.peakV.toFixed(2) : '—'}
          </Text>
          <Text variant="bodyMD" color={TOKENS.color.fg.secondary}>m/s peak</Text>
          {zone && (
            <View style={[styles.zonePill, { borderColor: zone.color + '40', backgroundColor: zone.color + '15' }]}>
              <Text variant="caption" color={zone.color}>{zone.label.toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Target */}
      <View style={styles.targetRow}>
        <Text variant="bodySM" color={TOKENS.color.fg.tertiary}>Target: 0.70–0.85 m/s</Text>
        {latest && (
          <Text variant="bodySM" color={TOKENS.color.fg.secondary}>
            Avg: {(reps.reduce((s, r) => s + r.avgV, 0) / reps.length).toFixed(2)} m/s
          </Text>
        )}
      </View>

      {/* Bilateral */}
      {latest && (
        <View style={styles.bilateral}>
          <BilBar side="L" pct={Math.max(0, 50 + latest.tilt / 2)} />
          <BilBar side="R" pct={Math.max(0, 50 - latest.tilt / 2)} />
        </View>
      )}

      {/* CTA */}
      <View style={styles.cta}>
        <Button
          label={reps.length >= targetReps ? 'Complete Set' : 'Done Early'}
          size="lg"
          fullWidth
          onPress={handleDone}
        />
      </View>
    </View>
  );
}

function BilBar({ side, pct }: { side: 'L' | 'R'; pct: number }) {
  const color = side === 'L' ? TOKENS.color.bilateral.left : TOKENS.color.bilateral.right;
  return (
    <View style={styles.bilItem}>
      <Text variant="caption" color={color}>{side}</Text>
      <View style={styles.bilTrack}>
        <View style={[styles.bilFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text variant="caption" color={TOKENS.color.fg.tertiary}>{pct.toFixed(0)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.color.bg.base, paddingHorizontal: TOKENS.space.lg },
  header: { paddingVertical: TOKENS.space.xl, alignItems: 'center' },
  counterArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: TOKENS.space.xxl },
  ringWrap: { position: 'relative', width: 144, height: 144, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  repCount: { lineHeight: 64 },
  velocityBlock: { alignItems: 'center', gap: TOKENS.space.xs },
  zonePill: {
    paddingHorizontal: TOKENS.space.md, paddingVertical: TOKENS.space.xs,
    borderRadius: TOKENS.radius.pill, borderWidth: 1,
  },
  targetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: TOKENS.space.lg },
  bilateral: { gap: TOKENS.space.sm, marginBottom: TOKENS.space.xl },
  bilItem: { flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.sm },
  bilTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: TOKENS.color.border.subtle, overflow: 'hidden' },
  bilFill: { height: '100%', borderRadius: 2 },
  cta: {},
});
