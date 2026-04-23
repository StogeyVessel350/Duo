import React, { useState, useMemo } from 'react';
import {
  View, ScrollView, Pressable, Modal, StyleSheet,
  Text as RNText,
} from 'react-native';
import Svg, { Circle as SvgCircle, Path, Line, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '@/theme';
import { Text, Button, Icon } from '@/components/primitives';
import { ScreenHeader, DuoMark } from '@/components/shell';
import { TAB_BAR_CLEARANCE } from '@/components/shell/TabBar';
import { useUnits, fromKg, unitLabel, type UnitSystem } from '@/context/UnitsContext';

// ─── Coaching logic (ported from coaching.jsx) ───────────────

function clampNorm(x: number) { return Math.max(0, Math.min(1, x)); }

interface AutoRegInputs {
  lastSessionAvgV: number; baselineAvgV: number; lastSessionVLoss: number;
  imbalanceDelta: number; sleepHours: number; soreness: number; soreMuscleGroups: string[];
}

function readinessScore(inputs: AutoRegInputs) {
  const sleepC     = clampNorm(inputs.sleepHours / 8);
  const sorenessC  = clampNorm(1 - inputs.soreness / 5);
  const velTrendC  = clampNorm(0.5 + ((inputs.lastSessionAvgV - inputs.baselineAvgV) / Math.max(0.01, inputs.baselineAvgV)) * 2);
  const stabilityC = clampNorm(1 - Math.max(0, inputs.imbalanceDelta * 10));
  const score = Math.round(sleepC * 30 + sorenessC * 25 + velTrendC * 25 + stabilityC * 20);
  return {
    score: Math.max(0, Math.min(100, score)),
    contributingFactors: [
      { key: 'sleep',     delta: Math.round(sleepC * 30),     label: 'Sleep' },
      { key: 'soreness',  delta: Math.round(sorenessC * 25),  label: 'Soreness' },
      { key: 'velocity',  delta: Math.round(velTrendC * 25),  label: 'Velocity trend' },
      { key: 'stability', delta: Math.round(stabilityC * 20), label: 'Balance' },
    ],
  };
}

function readinessColor(score: number) {
  if (score >= 75) return TOKENS.color.accent.primary;
  if (score >= 55) return TOKENS.color.semantic.warning;
  return TOKENS.color.semantic.danger;
}

function readinessLabel(score: number) {
  if (score >= 80) return 'Primed';
  if (score >= 65) return 'Ready';
  if (score >= 50) return 'Manage load';
  if (score >= 35) return 'Back off';
  return 'Recover';
}

interface AutoRegReason { rule: string; applied: boolean; delta: number; detail: string; }

function autoRegulate(inputs: AutoRegInputs) {
  const reasons: AutoRegReason[] = [];
  let delta = 0;
  const velDelta = inputs.baselineAvgV > 0 ? (inputs.lastSessionAvgV - inputs.baselineAvgV) / inputs.baselineAvgV : 0;

  const push = (rule: string, test: boolean, dIfApplied: number, detail: string, detailIfNot: string) => {
    reasons.push({ rule, applied: test, delta: test ? dIfApplied : 0, detail: test ? detail : detailIfNot });
    if (test) delta += dIfApplied;
  };

  push('velocity-positive', velDelta > 0.05, +0.03, `Last session +${Math.round(velDelta * 100)}% vs baseline — bars moving faster.`, 'No above-baseline velocity gain');
  push('velocity-loss-high', (inputs.lastSessionVLoss ?? 0) > 0.35, -0.05, `Velocity dropped ${Math.round((inputs.lastSessionVLoss || 0) * 100)}% on main lift last session.`, 'Velocity loss within range');
  push('imbalance-growing', (inputs.imbalanceDelta ?? 0) > 0.01, -0.05, `Bilateral imbalance grew ${Math.round(inputs.imbalanceDelta * 100)}% this week.`, 'Bilateral imbalance stable');
  push('sleep-short', (inputs.sleepHours ?? 8) < 6, -0.05, `Only ${inputs.sleepHours}h of sleep reported.`, 'Sleep adequate');
  push('soreness-heavy', (inputs.soreness ?? 0) >= 4, -0.08, `Reported ${inputs.soreness}/5 soreness.`, 'Soreness not elevated');

  return { scaleFactor: Math.max(0.85, Math.min(1.05, 1 + delta)), reasons };
}

function weeksToGoal(current: number, target: number, trainingMonths: number) {
  if (target <= current) return 0;
  const rate = trainingMonths < 6 ? 0.015 : trainingMonths < 24 ? 0.007 : 0.003;
  return Math.ceil(Math.log(target / current) / Math.log(1 + rate));
}

function mockAthleteState() {
  return {
    oneRMs: { 'back-squat': 155, 'bench-press': 112, 'deadlift': 185, 'overhead-press': 68 },
    autoRegInputs: {
      lastSessionAvgV: 0.82, baselineAvgV: 0.80, lastSessionVLoss: 0.22,
      imbalanceDelta: 0.015, sleepHours: 6.5, soreness: 3, soreMuscleGroups: ['chest'],
    },
    trainingMonths: 18,
    daysPerWeek: 4,
    weeklyHistory: [true, true, false, true, true, false, false],
  };
}

const goal = { exerciseId: 'back-squat', currentKg: 130, targetKg: 180, targetDate: '2026-07-15' };
const DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const todaySession = {
  focus: 'Lower · Power',
  exercises: [
    { name: 'Back squat', sets: 4, reps: '3–5', load: 128, intensity: '82% 1RM', tag: 'MAIN' },
    { name: 'Deadlift', sets: 3, reps: '3–6', load: 130, intensity: '70% 1RM', tag: 'ACCESSORY' },
    { name: 'Leg press', sets: 3, reps: '8–12', load: 185, intensity: '60% 1RM', tag: 'ACCESSORY' },
    { name: 'Goblet squat', sets: 2, reps: '10–12', load: 44, intensity: '40% 1RM', tag: 'ACCESSORY' },
  ],
  estimatedMin: 52,
};

// ─── ReadinessRing ────────────────────────────────────────────
function ReadinessRing({ score }: { score: number }) {
  const r = 60, cx = 80, cy = 80;
  const circ = 2 * Math.PI * r;
  const color = readinessColor(score);
  const label = readinessLabel(score);
  const offset = circ - (score / 100) * circ;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={160} height={160} viewBox="0 0 160 160">
        <SvgCircle cx={cx} cy={cy} r={r} fill="none" stroke={TOKENS.color.bg.elevated} strokeWidth={10} />
        <SvgCircle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90} origin={`${cx},${cy}`}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <RNText style={{ fontSize: 40, fontWeight: '500', letterSpacing: -0.02 * 40, color }}>{score}</RNText>
        <RNText style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, letterSpacing: 0.08 * 10, textTransform: 'uppercase', color: TOKENS.color.fg.tertiary, marginTop: 2 }}>{label}</RNText>
      </View>
    </View>
  );
}

// ─── WeeklyStrip ─────────────────────────────────────────────
function WeeklyStrip({ history, todayIdx }: { history: boolean[]; todayIdx: number }) {
  return (
    <View style={styles.weekStrip}>
      {DAYS_SHORT.map((day, i) => {
        const isToday = i === todayIdx;
        const done = history[i];
        return (
          <View key={i} style={styles.weekDayCol}>
            <View style={[
              styles.weekDot,
              done && { backgroundColor: TOKENS.color.accent.primary, width: 10, height: 10 },
              isToday && !done && { borderWidth: 1.5, borderColor: TOKENS.color.accent.primary },
            ]} />
            <RNText style={[styles.weekDayLabel, isToday && { color: TOKENS.color.accent.primary }]}>{day}</RNText>
          </View>
        );
      })}
    </View>
  );
}

// ─── SessionCard ─────────────────────────────────────────────
function SessionCard({ session, oneRMs, scaleFactor, onStart, onShowReasons, units }: {
  session: typeof todaySession; oneRMs: Record<string, number>; scaleFactor: number;
  onStart: () => void; onShowReasons: () => void; units: UnitSystem;
}) {
  const adjusted = scaleFactor < 1 ? 'Reduced' : scaleFactor > 1 ? 'Increased' : 'On plan';
  const adjColor = scaleFactor < 1 ? TOKENS.color.semantic.warning : scaleFactor > 1 ? TOKENS.color.semantic.success : TOKENS.color.fg.tertiary;

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, lineHeight: 26, fontWeight: '600', color: TOKENS.color.fg.primary }}>{session.focus}</Text>
          <Text style={{ fontSize: 13, color: TOKENS.color.fg.secondary, marginTop: 2 }}>
            {session.exercises.length} exercises · ~{session.estimatedMin} min
          </Text>
        </View>
        <Pressable onPress={onShowReasons} style={styles.adjBadge}>
          <View style={[styles.adjDot, { backgroundColor: adjColor }]} />
          <RNText style={[styles.adjText, { color: adjColor }]}>{adjusted}</RNText>
        </Pressable>
      </View>

      <View style={styles.sessionExList}>
        {session.exercises.map((ex, i) => (
          <View key={i} style={styles.sessionExRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: TOKENS.color.fg.primary }}>{ex.name}</Text>
              <Text style={{ fontSize: 12, color: TOKENS.color.fg.tertiary, marginTop: 1 }}>
                {ex.sets}×{ex.reps} · {Math.round(fromKg(ex.load * scaleFactor, units))} {unitLabel(units)} · {ex.intensity}
              </Text>
            </View>
            <View style={[styles.tagPill, ex.tag === 'MAIN' && { backgroundColor: TOKENS.color.accent.primary + '22' }]}>
              <RNText style={[styles.tagText, ex.tag === 'MAIN' && { color: TOKENS.color.accent.primary }]}>{ex.tag}</RNText>
            </View>
          </View>
        ))}
      </View>

      <View style={{ marginTop: TOKENS.space.lg }}>
        <Button variant="primary" size="lg" full onPress={onStart}
          trailing={<Icon name="arrowRight" size={16} color={TOKENS.color.accent.onPrimary} />}>
          Start session
        </Button>
      </View>
    </View>
  );
}

// ─── GoalProgressCard ────────────────────────────────────────
function GoalProgressCard({ units }: { units: UnitSystem }) {
  const state = mockAthleteState();
  const pct = goal.currentKg / goal.targetKg;
  const daysToTarget = Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - new Date(2026, 3, 22).getTime()) / 86400000));
  const weeksNeeded = weeksToGoal(goal.currentKg, goal.targetKg, state.trainingMonths);

  return (
    <View style={styles.goalCard}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: TOKENS.space.sm }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: TOKENS.color.fg.primary }}>Back squat 1RM</Text>
        <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary }}>· 1RM goal</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 6 }}>
        <RNText style={styles.goalCurrent}>{Math.round(fromKg(goal.currentKg, units))}</RNText>
        <Text style={{ fontSize: 15, color: TOKENS.color.fg.tertiary, paddingBottom: 4 }}>
          / {Math.round(fromKg(goal.targetKg, units))} {unitLabel(units)}
        </Text>
      </View>

      <View style={styles.goalBar}>
        <View style={[styles.goalBarFill, { width: `${pct * 100}%` as any }]} />
      </View>

      <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary, marginTop: 10 }}>
        Target in {daysToTarget} days · {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {weeksNeeded}w projected
      </Text>
    </View>
  );
}

// ─── AdjustmentSheet ─────────────────────────────────────────
function AdjustmentSheet({ open, onClose, reasons }: {
  open: boolean; onClose: () => void; reasons: AutoRegReason[];
}) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={{ fontSize: 20, lineHeight: 26, fontWeight: '600', color: TOKENS.color.fg.primary, marginBottom: TOKENS.space.lg }}>Load adjustments</Text>
          <View style={{ gap: TOKENS.space.sm }}>
            {reasons.map((r, i) => (
              <View key={i} style={styles.reasonRow}>
                <View style={[styles.reasonDot, { backgroundColor: r.applied ? (r.delta < 0 ? TOKENS.color.semantic.warning : TOKENS.color.semantic.success) : TOKENS.color.fg.tertiary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: TOKENS.color.fg.primary }}>{r.detail}</Text>
                  {r.applied && (
                    <Text style={{ fontSize: 12, fontFamily: 'JetBrainsMono_400Regular', color: r.delta < 0 ? TOKENS.color.semantic.warning : TOKENS.color.semantic.success, marginTop: 2 }}>
                      {r.delta > 0 ? '+' : ''}{Math.round(r.delta * 100)}%
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
          <View style={{ marginTop: TOKENS.space.xl }}>
            <Button variant="primary" size="md" full onPress={onClose}>Got it</Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── CoachScreen ─────────────────────────────────────────────
export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const { units } = useUnits();
  const [sheetOpen, setSheetOpen] = useState(false);

  const state = useMemo(() => mockAthleteState(), []);
  const readiness = useMemo(() => readinessScore(state.autoRegInputs), []);
  const { scaleFactor, reasons } = useMemo(() => autoRegulate(state.autoRegInputs), []);

  const trainedDays = state.weeklyHistory.filter(Boolean).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader><DuoMark size={13} /></ScreenHeader>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: TOKENS.space.xl }}>
          <Text style={{ fontSize: 28, lineHeight: 34, fontWeight: '500', letterSpacing: -0.01 * 28, color: TOKENS.color.fg.primary }}>Coach</Text>
        </View>

        {/* Readiness ring */}
        <View style={{ paddingHorizontal: TOKENS.space.xl, paddingTop: TOKENS.space.lg, alignItems: 'center', gap: TOKENS.space.md }}>
          <ReadinessRing score={readiness.score} />
          <View style={styles.factorsRow}>
            {readiness.contributingFactors.map(f => (
              <View key={f.key} style={styles.factorCol}>
                <RNText style={styles.factorValue}>{f.delta}</RNText>
                <RNText style={styles.factorLabel}>{f.label}</RNText>
              </View>
            ))}
          </View>
        </View>

        {/* Weekly strip */}
        <View style={{ paddingHorizontal: TOKENS.space.xl, paddingTop: TOKENS.space.lg, paddingBottom: TOKENS.space.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: TOKENS.space.sm }}>
            <Text style={styles.capLabel}>This week</Text>
            <Text style={styles.capLabel}>{trainedDays}/{state.weeklyHistory.length}</Text>
          </View>
          <WeeklyStrip history={state.weeklyHistory} todayIdx={4} />
        </View>

        {/* Session card */}
        <View style={{ paddingHorizontal: TOKENS.space.xl }}>
          <SessionCard
            session={todaySession}
            oneRMs={state.oneRMs}
            scaleFactor={scaleFactor}
            onStart={() => {}}
            onShowReasons={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSheetOpen(true); }}
            units={units}
          />
        </View>

        {/* Goal progress */}
        <View style={{ paddingHorizontal: TOKENS.space.xl, paddingTop: TOKENS.space.xl }}>
          <GoalProgressCard units={units} />
        </View>
      </ScrollView>

      <AdjustmentSheet open={sheetOpen} onClose={() => setSheetOpen(false)} reasons={reasons} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.color.bg.base },

  capLabel: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, fontWeight: '600',
    letterSpacing: 0.08 * 11, textTransform: 'uppercase', color: TOKENS.color.fg.tertiary,
  },

  factorsRow: { flexDirection: 'row', gap: TOKENS.space.lg, flexWrap: 'wrap', justifyContent: 'center' },
  factorCol: { alignItems: 'center' },
  factorValue: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, fontWeight: '500',
    color: TOKENS.color.fg.primary, letterSpacing: -0.01 * 13,
  },
  factorLabel: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: TOKENS.color.fg.tertiary,
    letterSpacing: 0.1 * 9, textTransform: 'uppercase', marginTop: 1,
  },

  weekStrip: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDayCol: { alignItems: 'center', gap: 4 },
  weekDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: TOKENS.color.fg.tertiary,
  },
  weekDayLabel: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: TOKENS.color.fg.tertiary,
    letterSpacing: 0.1 * 9,
  },

  sessionCard: {
    backgroundColor: TOKENS.color.bg.surface, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.lg, padding: TOKENS.space.lg,
  },
  sessionCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: TOKENS.space.md },
  adjBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 3 },
  adjDot: { width: 6, height: 6, borderRadius: 3 },
  adjText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, letterSpacing: 0.08 * 10, textTransform: 'uppercase' },
  sessionExList: { marginTop: TOKENS.space.md, gap: TOKENS.space.sm },
  sessionExRow: {
    flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.md,
    paddingVertical: TOKENS.space.sm, borderTopWidth: 1, borderTopColor: TOKENS.color.border.subtle,
  },
  tagPill: {
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: TOKENS.color.bg.elevated, borderRadius: 4,
  },
  tagText: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, fontWeight: '600',
    color: TOKENS.color.fg.tertiary, letterSpacing: 0.1 * 9, textTransform: 'uppercase',
  },

  goalCard: {
    backgroundColor: TOKENS.color.bg.surface, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.lg, padding: TOKENS.space.lg,
  },
  goalCurrent: {
    fontSize: 32, fontWeight: '500', letterSpacing: -0.02 * 32, color: TOKENS.color.accent.primary,
  },
  goalBar: {
    height: 6, backgroundColor: TOKENS.color.bg.elevated, borderRadius: 3,
    overflow: 'hidden', marginTop: TOKENS.space.md,
  },
  goalBarFill: {
    height: '100%', backgroundColor: TOKENS.color.accent.primary, borderRadius: 3,
  },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheetContainer: {
    backgroundColor: TOKENS.color.bg.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: TOKENS.space.xl, paddingBottom: 40,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: TOKENS.color.border.default, alignSelf: 'center', marginBottom: 20,
  },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: TOKENS.space.md },
  reasonDot: { width: 8, height: 8, borderRadius: 4, marginTop: 7, flexShrink: 0 },
});
