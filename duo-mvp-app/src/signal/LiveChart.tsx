/**
 * Live chart of acceleration magnitude (|a| - 1g).
 *
 * Plain SVG polyline. For ~200 points updating at 30 Hz, this renders
 * smoothly without needing Skia or a WebGL canvas.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Rect } from 'react-native-svg';
import type { ImuSample } from '@/ble/parseFrame';

interface Props {
  samples: ImuSample[];
  width: number;
  height: number;
  yRange?: [number, number]; // g
}

export function LiveChart({ samples, width, height, yRange = [-2, 2] }: Props) {
  const [yMin, yMax] = yRange;
  const yRangeSize = yMax - yMin;

  if (samples.length < 2) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>waiting for data…</Text>
      </View>
    );
  }

  const n = samples.length;
  const xStep = width / (n - 1);

  const pts = samples
    .map((s, i) => {
      const x = i * xStep;
      const norm = (s.mag - yMin) / yRangeSize; // 0..1
      const y = height - norm * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Zero line
  const zeroY = height - ((0 - yMin) / yRangeSize) * height;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill="#0b0b0e" />
        <Line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke="#2a2a33" strokeWidth={1} />
        <Polyline
          points={pts}
          fill="none"
          stroke="#4ade80"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: '#0b0b0e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 13,
  },
});
