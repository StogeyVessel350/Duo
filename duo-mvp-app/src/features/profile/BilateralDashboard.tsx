import React, { useState, useMemo } from 'react';
import {
  View, ScrollView, Pressable, StyleSheet, Text as RNText,
} from 'react-native';
import Svg, { Path, Circle as SvgCircle, Line, G, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '@/theme';
import { Text, Button, Icon } from '@/components/primitives';
import { SubHeader } from '@/components/shell';
import { TAB_BAR_CLEARANCE } from '@/components/shell/TabBar';

// ── Helpers ───────────────────────────────────────────────────────

function mixHex(a: string, b: string, t: number) {
  const parseHex = (h: string) => {
    const m = h.match(/#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    if (!m) return { r: 100, g: 100, b: 100 };
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  };
  const pa = parseHex(a), pb = parseHex(b);
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bl = Math.round(pa.b + (pb.b - pa.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function imbalanceColor(signed: number) {
  const s = Math.max(-1, Math.min(1, signed * 3));
  if (Math.abs(s) < 0.05) return TOKENS.color.border.default;
  const L = TOKENS.color.bilateral.left;
  const R = TOKENS.color.bilateral.right;
  const N = TOKENS.color.fg.tertiary;
  if (s < 0) return mixHex(N, L, Math.min(1, -s));
  return mixHex(N, R, Math.min(1, s));
}

// ── Static data ───────────────────────────────────────────────────

const MUSCLE_IMBALANCE: Record<string, { signed: number; weaker: string | null }> = {
  chestL: { signed: -0.12, weaker: 'left' }, chestR: { signed: -0.12, weaker: 'left' },
  deltL: { signed: -0.14, weaker: 'left' }, deltR: { signed: -0.14, weaker: 'left' },
  bicepL: { signed: 0.02, weaker: null }, bicepR: { signed: 0.02, weaker: null },
  forearmL: { signed: 0.03, weaker: null }, forearmR: { signed: 0.03, weaker: null },
  absL: { signed: 0.00, weaker: null }, absR: { signed: 0.00, weaker: null },
  quadL: { signed: -0.04, weaker: 'left' }, quadR: { signed: -0.04, weaker: 'left' },
  calfL: { signed: 0.01, weaker: null }, calfR: { signed: 0.01, weaker: null },
  trapL: { signed: -0.08, weaker: 'left' }, trapR: { signed: -0.08, weaker: 'left' },
  latL: { signed: -0.09, weaker: 'left' }, latR: { signed: -0.09, weaker: 'left' },
  rearDeltL: { signed: -0.11, weaker: 'left' }, rearDeltR: { signed: -0.11, weaker: 'left' },
  tricepL: { signed: 0.05, weaker: null }, tricepR: { signed: 0.05, weaker: null },
  lowerBackL: { signed: -0.03, weaker: null }, lowerBackR: { signed: -0.03, weaker: null },
  gluteL: { signed: -0.06, weaker: 'left' }, gluteR: { signed: -0.06, weaker: 'left' },
  hamL: { signed: -0.07, weaker: 'left' }, hamR: { signed: -0.07, weaker: 'left' },
  calfBackL: { signed: 0.01, weaker: null }, calfBackR: { signed: 0.01, weaker: null },
};

interface MuscleRegion { id: string; label: string; d: string; }

const FRONT_REGIONS: MuscleRegion[] = [
  { id: 'chestL', label: 'Left chest', d: 'M100 98 Q80 96 72 118 L78 146 Q92 148 100 146 Z' },
  { id: 'chestR', label: 'Right chest', d: 'M100 98 Q120 96 128 118 L122 146 Q108 148 100 146 Z' },
  { id: 'deltL', label: 'Left delt', d: 'M72 96 Q56 98 54 122 Q60 130 72 118 Z' },
  { id: 'deltR', label: 'Right delt', d: 'M128 96 Q144 98 146 122 Q140 130 128 118 Z' },
  { id: 'bicepL', label: 'Left bicep', d: 'M54 122 L48 160 L60 164 L66 128 Z' },
  { id: 'bicepR', label: 'Right bicep', d: 'M146 122 L152 160 L140 164 L134 128 Z' },
  { id: 'forearmL', label: 'Left forearm', d: 'M48 162 L42 200 L54 202 L60 168 Z' },
  { id: 'forearmR', label: 'Right forearm', d: 'M152 162 L158 200 L146 202 L140 168 Z' },
  { id: 'absL', label: 'Left abs', d: 'M100 148 L82 150 L84 200 L100 204 Z' },
  { id: 'absR', label: 'Right abs', d: 'M100 148 L118 150 L116 200 L100 204 Z' },
  { id: 'quadL', label: 'Left quad', d: 'M98 212 L82 214 L80 308 L96 310 Z' },
  { id: 'quadR', label: 'Right quad', d: 'M102 212 L118 214 L120 308 L104 310 Z' },
  { id: 'calfL', label: 'Left calf', d: 'M96 318 L84 320 L84 370 L90 384 L96 384 Z' },
  { id: 'calfR', label: 'Right calf', d: 'M104 318 L116 320 L116 370 L110 384 L104 384 Z' },
];

const BACK_REGIONS: MuscleRegion[] = [
  { id: 'trapR', label: 'Right trap', d: 'M100 82 L80 90 L76 114 L100 118 Z' },
  { id: 'trapL', label: 'Left trap', d: 'M100 82 L120 90 L124 114 L100 118 Z' },
  { id: 'rearDeltR', label: 'Right rear delt', d: 'M80 90 Q58 96 54 122 Q62 130 78 120 Z' },
  { id: 'rearDeltL', label: 'Left rear delt', d: 'M120 90 Q142 96 146 122 Q138 130 122 120 Z' },
  { id: 'latR', label: 'Right lat', d: 'M76 114 Q74 140 86 172 L100 172 L100 120 Z' },
  { id: 'latL', label: 'Left lat', d: 'M124 114 Q126 140 114 172 L100 172 L100 120 Z' },
  { id: 'tricepR', label: 'Right tricep', d: 'M54 124 L48 164 L60 166 L66 132 Z' },
  { id: 'tricepL', label: 'Left tricep', d: 'M146 124 L152 164 L140 166 L134 132 Z' },
  { id: 'lowerBackR', label: 'Right low back', d: 'M86 172 L88 196 L100 196 L100 172 Z' },
  { id: 'lowerBackL', label: 'Left low back', d: 'M114 172 L112 196 L100 196 L100 172 Z' },
  { id: 'gluteR', label: 'Right glute', d: 'M75 216 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0 Z' },
  { id: 'gluteL', label: 'Left glute', d: 'M99 216 a13 13 0 1 0 26 0 a13 13 0 1 0 -26 0 Z' },
  { id: 'hamR', label: 'Right hamstring', d: 'M96 244 L82 248 L80 314 L96 316 Z' },
  { id: 'hamL', label: 'Left hamstring', d: 'M104 244 L118 248 L120 314 L104 316 Z' },
  { id: 'calfBackR', label: 'Right calf', d: 'M96 320 L82 322 L82 370 L88 384 L96 384 Z' },
  { id: 'calfBackL', label: 'Left calf', d: 'M104 320 L118 322 L118 370 L112 384 L104 384 Z' },
];

function generateMockBilateralHistory() {
  const exercises = [
    { id: 'back-squat', name: 'Back squat', base: 0.04, trend: -0.002 },
    { id: 'bench-press', name: 'Bench press', base: 0.12, trend: 0.001 },
    { id: 'deadlift', name: 'Deadlift', base: 0.06, trend: -0.001 },
    { id: 'overhead-press', name: 'Overhead press', base: 0.14, trend: 0.002 },
    { id: 'leg-press', name: 'Leg press', base: 0.09, trend: 0.000 },
    { id: 'goblet-squat', name: 'Goblet squat', base: 0.03, trend: 0.000 },
    { id: 'cable-row', name: 'Seated row', base: 0.07, trend: -0.001 },
    { id: 'pushup', name: 'Push-up', base: 0.05, trend: -0.002 },
  ];
  const series: Record<string, any> = {};
  exercises.forEach(ex => {
    const arr: number[] = [];
    for (let d = 0; d < 30; d++) {
      const noise = (Math.sin(d * 7.3 + ex.base * 100) * 0.5 + 0.5 - 0.5) * 0.03;
      arr.push(Math.max(0, ex.base + ex.trend * d + noise));
    }
    series[ex.id] = { ...ex, data: arr, current: arr[arr.length - 1], flagged: arr[arr.length - 1] > 0.10 };
  });
  return series;
}

// ── Sparkline ─────────────────────────────────────────────────────

function Sparkline({ data, w = 80, h = 22, flagged = false }: { data: number[]; w?: number; h?: number; flagged?: boolean }) {
  if (!data || data.length < 2) return <View style={{ width: w, height: h }} />;
  const max = Math.max(...data, 0.15);
  const min = 0;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = flagged ? TOKENS.color.semantic.warning : TOKENS.color.accent.primary;
  const lastY = h - ((data[data.length - 1] - min) / (max - min || 1)) * h;
  return (
    <Svg width={w} height={h}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <SvgCircle cx={(data.length - 1) * step} cy={lastY} r={2} fill={color} />
    </Svg>
  );
}

// ── Body heatmap ──────────────────────────────────────────────────

function BodyHeatmap() {
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState<'front' | 'back'>('front');
  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS;

  const FRONT_OUTLINE = `M80 78 L80 96 Q56 98 52 124 L42 206 L56 208 L66 148 L82 150 L84 270 L80 348 L82 388 L96 388 L100 252 L104 388 L118 388 L120 348 L116 270 L118 150 L134 148 L144 208 L158 206 L148 124 Q144 98 120 96 L120 78 Z`;
  const BACK_OUTLINE = `M80 78 L80 96 Q56 98 52 124 L42 200 L56 204 L66 150 L76 114 Q74 140 86 172 L88 196 M114 196 L114 172 Q126 140 124 114 L134 150 L144 204 L158 200 L148 124 Q144 98 120 96 L120 78 Z`;

  const activeRegion = active ? regions.find(r => r.id === active) : null;
  const activeImb = active ? (MUSCLE_IMBALANCE[active] || { signed: 0, weaker: null }) : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>Imbalance Heatmap</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendSwatch, { backgroundColor: TOKENS.color.bilateral.left }]} />
          <View style={styles.legendGradient} />
          <View style={[styles.legendSwatch, { backgroundColor: TOKENS.color.bilateral.right }]} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: TOKENS.space.md }}>
        <View style={{ alignItems: 'center' }}>
          <Svg width={120} height={232} viewBox="0 0 200 400">
            <SvgCircle cx={100} cy={52} r={28} fill="none" stroke={TOKENS.color.border.default} strokeWidth={1} />
            <Path d={view === 'front' ? FRONT_OUTLINE : BACK_OUTLINE} fill="none" stroke={TOKENS.color.border.default} strokeWidth={1} />
            {view === 'back' && (
              <>
                <SvgCircle cx={88} cy={216} r={13} fill="none" stroke={TOKENS.color.border.default} strokeWidth={1} />
                <SvgCircle cx={112} cy={216} r={13} fill="none" stroke={TOKENS.color.border.default} strokeWidth={1} />
                <Line x1={100} y1={88} x2={100} y2={196} stroke={TOKENS.color.border.default} strokeWidth={1} strokeDasharray="2,3" opacity={0.5} />
              </>
            )}
            {regions.map(r => {
              const imb = MUSCLE_IMBALANCE[r.id] || { signed: 0 };
              const color = imbalanceColor(imb.signed);
              const isActive = active === r.id;
              return (
                <Path
                  key={r.id}
                  d={r.d}
                  fill={color}
                  opacity={isActive ? 1 : 0.82}
                  stroke={isActive ? TOKENS.color.fg.primary : 'none'}
                  strokeWidth={isActive ? 1 : 0}
                  onPress={() => { Haptics.selectionAsync(); setActive(active === r.id ? null : r.id); }}
                />
              );
            })}
          </Svg>

          <View style={styles.viewToggle}>
            {(['front', 'back'] as const).map(v => (
              <Pressable
                key={v}
                onPress={() => { Haptics.selectionAsync(); setView(v); setActive(null); }}
                style={[styles.viewToggleBtn, view === v && styles.viewToggleBtnActive]}
              >
                <RNText style={[styles.viewToggleText, view === v && styles.viewToggleTextActive]}>
                  {v.toUpperCase()}
                </RNText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          {activeRegion && activeImb ? (
            <View>
              <Text style={styles.capLabel}>{activeRegion.label}</Text>
              <RNText style={styles.imbPct}>{Math.round(Math.abs(activeImb.signed) * 100)}%</RNText>
              <Text style={{ fontSize: 13, color: TOKENS.color.fg.secondary, marginTop: 4 }}>
                {activeImb.weaker ? `${activeImb.weaker === 'left' ? 'Left' : 'Right'} ${Math.round(Math.abs(activeImb.signed) * 100)}% weaker` : 'Balanced'}
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: TOKENS.color.fg.secondary, lineHeight: 20 }}>
              Tap a muscle to drill down. Shaded regions are the 14-day rolling average from your DUO sessions.
            </Text>
          )}
          <View style={styles.lrLabelRow}>
            <Text style={styles.capLabel}>LEFT</Text>
            <Text style={styles.capLabel}>NEUTRAL</Text>
            <Text style={styles.capLabel}>RIGHT</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Exercise trend grid ───────────────────────────────────────────

function ExerciseTrendGrid({ history }: { history: Record<string, any> }) {
  const items = Object.values(history);
  return (
    <View style={styles.card}>
      <Text style={[styles.cardTitle, { marginBottom: TOKENS.space.md }]}>By Exercise · 30d</Text>
      <View style={styles.trendGrid}>
        {items.map(ex => {
          const slope = ex.data[ex.data.length - 1] - ex.data[0];
          const arrow = slope > 0.01 ? '↑' : slope < -0.01 ? '↓' : '→';
          const arrowColor = slope > 0.01 ? TOKENS.color.semantic.warning
            : slope < -0.01 ? TOKENS.color.semantic.success
            : TOKENS.color.fg.tertiary;
          return (
            <View key={ex.id} style={[styles.trendCell, ex.flagged && styles.trendCellFlagged]}>
              <Text style={{ fontSize: 10, color: TOKENS.color.fg.secondary }} numberOfLines={1}>{ex.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 2 }}>
                <RNText style={[styles.trendPct, ex.flagged && { color: TOKENS.color.semantic.warning }]}>
                  {Math.round(ex.current * 100)}%
                </RNText>
                <RNText style={{ fontSize: 11, color: arrowColor }}>{arrow}</RNText>
              </View>
              <Sparkline data={ex.data} w={80} h={22} flagged={ex.flagged} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Corrective protocol ───────────────────────────────────────────

const SUGGEST: Record<string, { name: string; sets: string; side: string }[]> = {
  'bench-press': [
    { name: 'Single-arm DB press', sets: '3×8', side: 'weaker only' },
    { name: 'Landmine press', sets: '3×10', side: 'both, weaker first' },
  ],
  'overhead-press': [
    { name: 'Single-arm DB OHP', sets: '3×8', side: 'weaker only' },
    { name: 'Z-press', sets: '3×8', side: 'both' },
  ],
  'back-squat': [
    { name: 'Bulgarian split squat', sets: '3×10', side: 'weaker only' },
    { name: 'Single-leg press', sets: '3×12', side: 'both' },
  ],
};

function CorrectiveProtocol({ history, onAdd }: { history: Record<string, any>; onAdd: () => void }) {
  const flagged = Object.values(history).filter((h: any) => h.flagged);

  if (!flagged.length) {
    return (
      <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.md }]}>
        <View style={styles.successDot} />
        <Text style={{ fontSize: 15, color: TOKENS.color.fg.primary }}>Balance within range — no corrective work needed.</Text>
      </View>
    );
  }

  const worst = [...flagged].sort((a: any, b: any) => b.current - a.current)[0] as any;
  const plan = SUGGEST[worst.id] || [{ name: 'Unilateral variant', sets: '3×8', side: 'weaker only' }];

  return (
    <View style={[styles.card, styles.correctiveCard]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.sm, marginBottom: TOKENS.space.sm }}>
        <Icon name="bolt" size={14} color={TOKENS.color.accent.primary} />
        <Text style={styles.capLabel}>Corrective protocol</Text>
      </View>
      <Text style={{ fontSize: 20, fontWeight: '600', color: TOKENS.color.fg.primary, marginBottom: 4 }}>
        Address {worst.name.toLowerCase()} asymmetry
      </Text>
      <Text style={{ fontSize: 13, color: TOKENS.color.fg.secondary, lineHeight: 20, marginBottom: TOKENS.space.lg }}>
        Current imbalance{' '}
        <RNText style={{ fontFamily: 'JetBrainsMono_400Regular', color: TOKENS.color.semantic.warning }}>
          {Math.round(worst.current * 100)}%
        </RNText>
        . Add unilateral accessories 2× per week for 4 weeks.
      </Text>

      <View style={{ gap: TOKENS.space.sm, marginBottom: TOKENS.space.lg }}>
        {plan.map((item, i) => (
          <View key={i} style={styles.correctiveRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: TOKENS.color.fg.primary }}>{item.name}</Text>
              <Text style={{ fontSize: 12, color: TOKENS.color.fg.tertiary, marginTop: 1 }}>{item.side}</Text>
            </View>
            <RNText style={styles.correctiveSets}>{item.sets}</RNText>
          </View>
        ))}
      </View>

      <Button variant="primary" size="md" full onPress={onAdd}>Add to next workout</Button>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────

export function BilateralDashboard({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const history = useMemo(() => generateMockBilateralHistory(), []);
  const [toast, setToast] = useState<string | null>(null);

  const handleAdd = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setToast('Added to next workout');
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <SubHeader title="Bilateral" onBack={onBack} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: TOKENS.space.xl, paddingBottom: TAB_BAR_CLEARANCE + 20, gap: TOKENS.space.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={{ fontSize: 13, color: TOKENS.color.fg.secondary, lineHeight: 20 }}>
            Left vs right across all DUO-tracked lifts.
          </Text>
        </View>
        <BodyHeatmap />
        <ExerciseTrendGrid history={history} />
        <CorrectiveProtocol history={history} onAdd={handleAdd} />
      </ScrollView>

      {toast && (
        <View style={[styles.toast, { bottom: TAB_BAR_CLEARANCE + 20 }]}>
          <RNText style={styles.toastText}>{toast}</RNText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.color.bg.base },

  card: {
    backgroundColor: TOKENS.color.bg.surface,
    borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.lg, padding: TOKENS.space.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: TOKENS.space.md,
  },
  cardTitle: { fontSize: 17, fontWeight: '600', color: TOKENS.color.fg.primary },

  capLabel: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, fontWeight: '600',
    letterSpacing: 0.08 * 11, textTransform: 'uppercase', color: TOKENS.color.fg.tertiary,
  },

  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  legendGradient: {
    width: 28, height: 6, borderRadius: 3,
    backgroundColor: TOKENS.color.fg.tertiary,
  },

  viewToggle: {
    marginTop: TOKENS.space.sm, flexDirection: 'row',
    backgroundColor: TOKENS.color.bg.elevated, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.pill, padding: 2,
  },
  viewToggleBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: TOKENS.radius.pill },
  viewToggleBtnActive: { backgroundColor: TOKENS.color.fg.primary },
  viewToggleText: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, fontWeight: '700',
    letterSpacing: 0.08 * 10, textTransform: 'uppercase', color: TOKENS.color.fg.secondary,
  },
  viewToggleTextActive: { color: TOKENS.color.bg.base },

  imbPct: {
    fontSize: 24, fontWeight: '500', letterSpacing: -0.02 * 24, color: TOKENS.color.fg.primary, marginTop: 2,
  },
  lrLabelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: TOKENS.space.sm, borderTopWidth: 1, borderTopColor: TOKENS.color.border.subtle },

  trendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: TOKENS.space.sm },
  trendCell: {
    width: '47%', padding: TOKENS.space.sm,
    backgroundColor: TOKENS.color.bg.elevated, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.md,
  },
  trendCellFlagged: { borderColor: TOKENS.color.semantic.warning + '60' },
  trendPct: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 15, fontWeight: '500',
    color: TOKENS.color.fg.primary, letterSpacing: -0.02 * 15,
  },

  correctiveCard: {
    borderColor: TOKENS.color.accent.primary + '30',
  },
  correctiveRow: {
    flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.md,
    padding: TOKENS.space.md,
    backgroundColor: TOKENS.color.bg.base, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.md,
  },
  correctiveSets: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, color: TOKENS.color.fg.secondary,
  },
  successDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: TOKENS.color.semantic.success,
  },

  toast: {
    position: 'absolute', alignSelf: 'center',
    backgroundColor: TOKENS.color.fg.primary,
    paddingHorizontal: TOKENS.space.lg, paddingVertical: TOKENS.space.sm,
    borderRadius: TOKENS.radius.pill,
  },
  toastText: { fontSize: 13, fontWeight: '500', color: TOKENS.color.bg.base },
});
