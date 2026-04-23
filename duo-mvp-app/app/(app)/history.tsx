import React, { useState, useMemo, useEffect } from 'react';
import {
  View, ScrollView, Pressable, TextInput, Modal, StyleSheet,
  Text as RNText,
} from 'react-native';
import Svg, { Polyline, Path, Circle as SvgCircle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '@/theme';
import { Text, Button, Icon } from '@/components/primitives';
import { ScreenHeader, DuoMark } from '@/components/shell';
import { TAB_BAR_CLEARANCE } from '@/components/shell/TabBar';
import { useUnits, fromKg, unitLabel, type UnitSystem } from '@/context/UnitsContext';

// ─── Exercise name map ───────────────────────────────────────
const EX_NAMES: Record<string, string> = {
  'back-squat': 'Back squat', 'bench-press': 'Bench press',
  'deadlift': 'Deadlift', 'overhead-press': 'Overhead press',
  'cable-row': 'Cable row', 'leg-press': 'Leg press',
  'pushup': 'Push-up', 'goblet-squat': 'Goblet squat',
  'bulgarian-split': 'Bulgarian split',
};
const exName = (id: string) => EX_NAMES[id] || id;

// ─── Mock history data ───────────────────────────────────────
interface SetData {
  reps: number; load: number; peakV: number; avgV: number; isPR: boolean;
}
interface ExerciseLog { exerciseId: string; sets: SetData[]; }
interface Workout {
  id: string; date: string; focus: string; durationMin: number;
  exercises: ExerciseLog[]; totalVolumeKg: number; hasPR: boolean;
}

function mockHistoryData(): Workout[] {
  const today = new Date(2026, 3, 22);
  const workouts: Workout[] = [];
  const patterns = [
    { focus: 'Upper · Strength', exercises: ['bench-press', 'overhead-press', 'cable-row'] },
    { focus: 'Lower · Strength', exercises: ['back-squat', 'deadlift', 'leg-press'] },
    { focus: 'Upper · Power',    exercises: ['bench-press', 'overhead-press', 'pushup'] },
    { focus: 'Lower · Power',    exercises: ['back-squat', 'goblet-squat', 'bulgarian-split'] },
    { focus: 'Full body',        exercises: ['back-squat', 'bench-press', 'cable-row'] },
    { focus: 'Deload · Technique', exercises: ['back-squat', 'bench-press'] },
  ];
  const baseLoads: Record<string, number> = {
    'back-squat': 130, 'bench-press': 100, 'deadlift': 160,
    'overhead-press': 60, 'cable-row': 70, 'leg-press': 200,
    'pushup': 0, 'goblet-squat': 32, 'bulgarian-split': 24,
  };
  const baseVels: Record<string, number> = {
    'back-squat': 0.72, 'bench-press': 0.68, 'deadlift': 0.60,
    'overhead-press': 0.78, 'cable-row': 0.88, 'leg-press': 0.55,
    'pushup': 1.10, 'goblet-squat': 0.95, 'bulgarian-split': 0.90,
  };

  for (let d = 89; d >= 0; d--) {
    const dayOfWeek = (today.getDay() - d + 700) % 7;
    if (![1, 2, 4, 5].includes(dayOfWeek)) continue;
    if ((d % 17) === 3) continue;
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const pattern = patterns[d % patterns.length];
    const isPR = d % 23 === 0;

    const exercises: ExerciseLog[] = pattern.exercises.map(exId => {
      const sets = 3 + (d % 2);
      const setData: SetData[] = [];
      const baseLoad = baseLoads[exId] ?? 50;
      const baseVel = baseVels[exId] ?? 0.70;
      for (let s = 0; s < sets; s++) {
        const reps = 5 + (s % 4);
        const velSeed = Math.sin(d * 7 + s * 11 + exId.length) * 0.5 + 0.5;
        const avgV = baseVel + (velSeed - 0.5) * 0.2 - s * 0.03;
        const peakV = avgV + 0.08;
        setData.push({
          reps, load: baseLoad + s * 2.5,
          peakV: parseFloat(peakV.toFixed(2)),
          avgV: parseFloat(avgV.toFixed(2)),
          isPR: isPR && s === sets - 1,
        });
      }
      return { exerciseId: exId, sets: setData };
    });

    const totalVolumeKg = exercises.reduce(
      (acc, ex) => acc + ex.sets.reduce((s, set) => s + set.reps * set.load, 0), 0
    );

    workouts.push({
      id: `wk-${d}`,
      date: date.toISOString().slice(0, 10),
      focus: pattern.focus,
      durationMin: 45 + (d % 40),
      exercises,
      totalVolumeKg,
      hasPR: isPR,
    });
  }
  return workouts;
}

// ─── Calendar ────────────────────────────────────────────────
function HistoryCalendar({ workouts, onPickDate }: { workouts: Workout[]; onPickDate: (d: string) => void }) {
  const [month, setMonth] = useState({ y: 2026, m: 3 });

  const workoutSet = useMemo(() => {
    const s = new Set<string>();
    workouts.forEach(w => s.add(w.date));
    return s;
  }, [workouts]);
  const prSet = useMemo(() => {
    const s = new Set<string>();
    workouts.forEach(w => w.hasPR && s.add(w.date));
    return s;
  }, [workouts]);

  const firstDay = new Date(month.y, month.m, 1);
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Only pad to complete the current row — avoid blank rows that create visual gaps
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const monthLabel = new Date(month.y, month.m).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const cellDate = (d: number) =>
    `${month.y}-${String(month.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const todayStr = '2026-04-22';

  return (
    <View style={styles.calendarCard}>
      <View style={styles.calendarNav}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setMonth(m => m.m === 0 ? { y: m.y - 1, m: 11 } : { y: m.y, m: m.m - 1 }); }}
          style={styles.calNavBtn}
        >
          <Icon name="chevron" size={12} color={TOKENS.color.fg.secondary} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>
        <Text style={styles.calMonthLabel}>{monthLabel}</Text>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setMonth(m => m.m === 11 ? { y: m.y + 1, m: 0 } : { y: m.y, m: m.m + 1 }); }}
          style={styles.calNavBtn}
        >
          <Icon name="chevron" size={12} color={TOKENS.color.fg.secondary} />
        </Pressable>
      </View>

      <View style={styles.calWeekdays}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <View key={i} style={styles.calDayHeader}>
            <RNText style={styles.calDayHeaderText}>{d}</RNText>
          </View>
        ))}
      </View>

      {/* Row-by-row layout: more reliable centering than flexWrap in React Native */}
      <View>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.calRow}>
            {row.map((d, ci) => {
              if (d == null) return <View key={ci} style={styles.calCell} />;
              const ds = cellDate(d);
              const hasWorkout = workoutSet.has(ds);
              const isPR = prSet.has(ds);
              const isToday = ds === todayStr;
              return (
                <Pressable
                  key={ci}
                  style={[
                    styles.calCell,
                    hasWorkout && { backgroundColor: TOKENS.color.accent.primary, borderRadius: TOKENS.radius.sm },
                    !hasWorkout && isToday && { borderWidth: 1.5, borderColor: TOKENS.color.accent.primary, borderRadius: TOKENS.radius.sm },
                  ]}
                  onPress={() => { if (hasWorkout) { Haptics.selectionAsync(); onPickDate(ds); } }}
                  disabled={!hasWorkout}
                >
                  <RNText style={[
                    styles.calCellText,
                    hasWorkout && { color: TOKENS.color.accent.onPrimary, fontWeight: '600' },
                    !hasWorkout && isToday && { color: TOKENS.color.accent.primary, fontWeight: '600' },
                  ]}>{d}</RNText>
                  {isPR && <View style={styles.calPrDot} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── SetSparkline ─────────────────────────────────────────────
function SetSparkline({ sets }: { sets: SetData[] }) {
  const W = 260, H = 56;
  const values = sets.map(s => s.peakV);
  if (values.length < 2) return null;
  const maxV = Math.max(...values) * 1.1;
  const minV = Math.min(...values) * 0.85;
  const pathD = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - minV) / (maxV - minV || 1)) * H;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ marginTop: 8 }}>
      <Path d={pathD} fill="none" stroke={TOKENS.color.accent.primary} strokeWidth={2} strokeLinecap="round" />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * W;
        const y = H - ((v - minV) / (maxV - minV || 1)) * H;
        return <SvgCircle key={i} cx={x} cy={y} r={3} fill={TOKENS.color.accent.primary} />;
      })}
    </Svg>
  );
}

// ─── WorkoutRow ───────────────────────────────────────────────
function WorkoutRow({ workout, onOpen, units }: { workout: Workout; onOpen: (w: Workout) => void; units: UnitSystem }) {
  const date = new Date(workout.date + 'T12:00:00');
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const day = date.getDate();
  const volDisplay = Math.round(fromKg(workout.totalVolumeKg, units) / 100) * 100;

  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onOpen(workout); }}
      style={styles.workoutRow}
    >
      <View style={styles.workoutDateCol}>
        <RNText style={styles.workoutWeekday}>{weekday.toUpperCase()}</RNText>
        <RNText style={styles.workoutDay}>{day}</RNText>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: TOKENS.space.sm }}>
          <Text style={{ fontSize: 15, color: TOKENS.color.fg.primary }}>{workout.focus}</Text>
          {workout.hasPR && (
            <View style={styles.prBadge}>
              <RNText style={styles.prBadgeText}>PR</RNText>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary, marginTop: 2 }}>
          {workout.durationMin}min · {workout.exercises.map(e => exName(e.exerciseId)).slice(0, 3).join(' · ')}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <RNText style={styles.workoutVol}>
          {volDisplay.toLocaleString()}
          <RNText style={styles.workoutVolUnit}> {unitLabel(units)}</RNText>
        </RNText>
        <Text style={{ fontSize: 11, color: TOKENS.color.fg.tertiary, marginTop: 2, fontFamily: 'JetBrainsMono_400Regular' }}>volume</Text>
      </View>
    </Pressable>
  );
}

// ─── WorkoutDetail ────────────────────────────────────────────
function WorkoutDetailScreen({ workout, onBack, units }: { workout: Workout; onBack: () => void; units: UnitSystem }) {
  const insets = useSafeAreaInsets();
  const [expandedEx, setExpandedEx] = useState<number | null>(null);
  const date = new Date(workout.date + 'T12:00:00');
  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const volDisplay = Math.round(fromKg(workout.totalVolumeKg, units));
  const totalSets = workout.exercises.reduce((s, e) => s + e.sets.length, 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.detailHeader}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onBack(); }} style={styles.backBtn}>
          <Icon name="chevron" size={12} color={TOKENS.color.fg.secondary} style={{ transform: [{ rotate: '180deg' }] }} />
          <Text style={{ fontSize: 13, color: TOKENS.color.fg.secondary }}>Back</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE + 40 }}>
        <View style={{ paddingHorizontal: TOKENS.space.xl }}>
          <Text style={{ fontSize: 11, fontFamily: 'JetBrainsMono_400Regular', color: TOKENS.color.fg.tertiary, letterSpacing: 0.08 * 11, textTransform: 'uppercase' }}>
            {dateLabel.toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: TOKENS.space.md, marginTop: 4 }}>
            <Text style={{ fontSize: 28, lineHeight: 34, fontWeight: '500', letterSpacing: -0.01 * 28, color: TOKENS.color.fg.primary }}>{workout.focus}</Text>
            {workout.hasPR && (
              <View style={[styles.prBadge, { paddingHorizontal: 8, paddingVertical: 3 }]}>
                <RNText style={[styles.prBadgeText, { fontSize: 11 }]}>New PR</RNText>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: TOKENS.space.xl, paddingTop: TOKENS.space.xl, flexDirection: 'row', gap: TOKENS.space.lg }}>
          {[
            { label: 'Duration', val: String(workout.durationMin), unit: 'min' },
            { label: 'Volume', val: volDisplay.toLocaleString(), unit: unitLabel(units) },
            { label: 'Sets', val: String(totalSets), unit: undefined },
          ].map(stat => (
            <View key={stat.label}>
              <Text style={{ fontSize: 11, fontFamily: 'JetBrainsMono_400Regular', color: TOKENS.color.fg.tertiary, letterSpacing: 0.08 * 11, textTransform: 'uppercase' }}>{stat.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 4 }}>
                <RNText style={{ fontSize: 28, fontWeight: '500', letterSpacing: -0.02 * 28, color: TOKENS.color.fg.primary }}>{stat.val}</RNText>
                {stat.unit && <RNText style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 14, color: TOKENS.color.fg.tertiary, paddingBottom: 3 }}>{stat.unit}</RNText>}
              </View>
            </View>
          ))}
        </View>

        <View style={{ paddingHorizontal: TOKENS.space.xl, paddingTop: TOKENS.space.xl, paddingBottom: TOKENS.space.xl }}>
          <Text style={{ fontSize: 11, fontFamily: 'JetBrainsMono_400Regular', color: TOKENS.color.fg.tertiary, letterSpacing: 0.08 * 11, textTransform: 'uppercase', marginBottom: TOKENS.space.sm }}>Exercises</Text>
          <View style={{ gap: TOKENS.space.sm }}>
            {workout.exercises.map((ex, ei) => {
              const expanded = expandedEx === ei;
              const hasPR = ex.sets.some(s => s.isPR);
              const peakV = Math.max(...ex.sets.map(s => s.peakV));
              return (
                <View key={ei} style={styles.exerciseBlock}>
                  <Pressable
                    onPress={() => { Haptics.selectionAsync(); setExpandedEx(expanded ? null : ei); }}
                    style={styles.exerciseBlockHeader}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                        <Text style={{ fontSize: 15, color: TOKENS.color.fg.primary }}>{exName(ex.exerciseId)}</Text>
                        {hasPR && <View style={styles.prBadge}><RNText style={styles.prBadgeText}>PR</RNText></View>}
                      </View>
                      <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary, marginTop: 2 }}>
                        {ex.sets.length} sets · peak {peakV.toFixed(2)} m/s
                      </Text>
                    </View>
                    <Icon name="chevron" size={12} color={TOKENS.color.fg.tertiary}
                      style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }} />
                  </Pressable>

                  {expanded && (
                    <View style={{ padding: TOKENS.space.md, paddingTop: 0 }}>
                      <View style={[styles.setTableRow, { borderBottomWidth: 1, borderBottomColor: TOKENS.color.border.subtle, paddingBottom: 6 }]}>
                        {['#', 'Reps', 'Load', 'Peak v'].map((h, i) => (
                          <RNText key={i} style={[styles.setTableHeader, i === 0 && { width: 24, flex: 0 }, i === 3 && { textAlign: 'right' }]}>{h}</RNText>
                        ))}
                      </View>
                      {ex.sets.map((set, si) => (
                        <View key={si} style={[styles.setTableRow, si < ex.sets.length - 1 && { borderBottomWidth: 1, borderBottomColor: TOKENS.color.border.subtle }]}>
                          <RNText style={[styles.setTableCell, { width: 24, flex: 0, color: TOKENS.color.fg.tertiary }]}>{si + 1}</RNText>
                          <RNText style={styles.setTableCell}>{set.reps}</RNText>
                          <RNText style={styles.setTableCell}>
                            {set.load ? `${Math.round(fromKg(set.load, units))} ${unitLabel(units)}` : '—'}
                          </RNText>
                          <RNText style={[styles.setTableCell, {
                            textAlign: 'right',
                            color: set.peakV >= 0.9 ? TOKENS.color.velocity.speed
                              : set.peakV >= 0.7 ? TOKENS.color.velocity.power
                              : TOKENS.color.velocity.strength,
                          }]}>{set.peakV.toFixed(2)}</RNText>
                        </View>
                      ))}
                      <View style={{ marginTop: TOKENS.space.md }}>
                        <Text style={{ fontSize: 11, fontFamily: 'JetBrainsMono_400Regular', color: TOKENS.color.fg.tertiary, letterSpacing: 0.08 * 11, textTransform: 'uppercase' }}>Peak velocity / set</Text>
                        <SetSparkline sets={ex.sets} />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Filter sheet ─────────────────────────────────────────────
interface Filters { exerciseId: string | null; days: number | null; prOnly: boolean; search: string; }

function FilterSheet({
  visible, onClose, filters, setFilters, workouts,
}: {
  visible: boolean; onClose: () => void; filters: Filters;
  setFilters: (f: Filters) => void; workouts: Workout[];
}) {
  const allExercises = useMemo(
    () => Array.from(new Set(workouts.flatMap(w => w.exercises.map(e => e.exerciseId)))),
    [workouts]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={{ fontSize: 20, lineHeight: 26, fontWeight: '600', color: TOKENS.color.fg.primary, marginBottom: TOKENS.space.lg }}>Filters</Text>

          <Text style={styles.capLabel}>Exercise</Text>
          <View style={styles.filterChips}>
            <Pressable
              onPress={() => setFilters({ ...filters, exerciseId: null })}
              style={[styles.filterChip, !filters.exerciseId && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, !filters.exerciseId ? styles.filterChipTextActive : undefined]}>Any</Text>
            </Pressable>
            {allExercises.map(id => (
              <Pressable
                key={id}
                onPress={() => setFilters({ ...filters, exerciseId: id })}
                style={[styles.filterChip, filters.exerciseId === id && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, filters.exerciseId === id ? styles.filterChipTextActive : undefined]}>{exName(id)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.capLabel, { marginTop: TOKENS.space.lg }]}>Date range</Text>
          <View style={styles.filterChips}>
            {[{ id: null as null | number, label: 'All time' }, { id: 7, label: '7 days' }, { id: 30, label: '30 days' }, { id: 90, label: '90 days' }].map(o => (
              <Pressable
                key={String(o.id)}
                onPress={() => setFilters({ ...filters, days: o.id })}
                style={[styles.filterChip, filters.days === o.id && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, filters.days === o.id ? styles.filterChipTextActive : undefined]}>{o.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => setFilters({ ...filters, prOnly: !filters.prOnly })}
            style={[styles.prOnlyRow, { marginTop: TOKENS.space.lg }]}
          >
            <View style={[styles.checkbox, filters.prOnly && styles.checkboxActive]}>
              {filters.prOnly && <Icon name="check" size={12} color={TOKENS.color.accent.onPrimary} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: TOKENS.color.fg.primary }}>PRs only</Text>
              <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary, marginTop: 2 }}>Show only workouts with a personal record.</Text>
            </View>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: TOKENS.space.sm, marginTop: TOKENS.space.xl }}>
            <Button variant="ghost" size="md" full onPress={() => setFilters({ exerciseId: null, days: null, prOnly: false, search: '' })}>
              Reset
            </Button>
            <Button variant="primary" size="md" full onPress={onClose}>
              Apply
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── HistoryScreen ────────────────────────────────────────────
export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { units } = useUnits();
  const allWorkouts = useMemo(() => mockHistoryData(), []);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ exerciseId: null, days: null, prOnly: false, search: '' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, []);

  const today = new Date(2026, 3, 22);
  const filtered = useMemo(() => allWorkouts.filter(w => {
    if (filters.exerciseId && !w.exercises.some(e => e.exerciseId === filters.exerciseId)) return false;
    if (filters.days) {
      const d = new Date(w.date + 'T12:00:00');
      if ((today.getTime() - d.getTime()) / 86400000 > filters.days) return false;
    }
    if (filters.prOnly && !w.hasPR) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const hit = w.focus.toLowerCase().includes(s) || w.exercises.some(e => exName(e.exerciseId).toLowerCase().includes(s));
      if (!hit) return false;
    }
    return true;
  }), [allWorkouts, filters]);

  const totalVol = filtered.reduce((s, w) => s + w.totalVolumeKg, 0);
  const prCount = filtered.filter(w => w.hasPR).length;
  const activeFilterCount = (filters.exerciseId ? 1 : 0) + (filters.days ? 1 : 0) + (filters.prOnly ? 1 : 0);

  if (selectedWorkout) {
    return <WorkoutDetailScreen workout={selectedWorkout} onBack={() => setSelectedWorkout(null)} units={units} />;
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader><DuoMark size={13} /></ScreenHeader>
      <View style={{ paddingHorizontal: TOKENS.space.xl }}>
        <Text style={{ fontSize: 28, lineHeight: 34, fontWeight: '500', letterSpacing: -0.01 * 28, color: TOKENS.color.fg.primary }}>History</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Icon name="search" size={14} color={TOKENS.color.fg.tertiary} />
          <TextInput
            value={filters.search}
            onChangeText={t => setFilters({ ...filters, search: t })}
            placeholder="Search exercises…"
            placeholderTextColor={TOKENS.color.fg.tertiary}
            style={styles.searchInput}
          />
        </View>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFiltersOpen(true); }}
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
        >
          <Icon name="settings" size={14} color={activeFilterCount > 0 ? TOKENS.color.accent.primary : TOKENS.color.fg.secondary} />
          {activeFilterCount > 0 && (
            <RNText style={styles.filterCount}>{activeFilterCount}</RNText>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: TOKENS.space.xl, paddingBottom: TAB_BAR_CLEARANCE }}
        showsVerticalScrollIndicator={false}
      >
        <HistoryCalendar workouts={allWorkouts} onPickDate={date => {
          const w = allWorkouts.find(wk => wk.date === date);
          if (w) setSelectedWorkout(w);
        }} />

        <View style={styles.summaryStrip}>
          {[
            { label: 'Workouts', value: filtered.length.toString(), sub: undefined as string | undefined },
            { label: 'Volume', value: `${Math.round(fromKg(totalVol, units) / 1000)}k`, sub: unitLabel(units) },
            { label: 'PRs', value: prCount.toString(), sub: undefined },
          ].map((s, i) => (
            <View key={i} style={styles.summaryTile}>
              <Text style={styles.capLabel}>{s.label}</Text>
              <RNText style={styles.summaryValue}>
                {s.value}
                {s.sub && <RNText style={styles.summaryUnit}> {s.sub}</RNText>}
              </RNText>
            </View>
          ))}
        </View>

        <View style={{ marginTop: TOKENS.space.lg }}>
          <View style={{ paddingHorizontal: 4, marginBottom: TOKENS.space.sm }}>
            <Text style={styles.capLabel}>Sessions</Text>
          </View>
          {loading ? (
            <View style={{ gap: TOKENS.space.sm }}>
              {[0, 1, 2, 3].map(i => (
                <View key={i} style={[styles.workoutRow, { height: 68, opacity: 0.3, justifyContent: 'center' }]}>
                  <View style={{ height: 12, width: '60%', backgroundColor: TOKENS.color.bg.elevated, borderRadius: 6 }} />
                </View>
              ))}
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ padding: TOKENS.space.xxl, alignItems: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: TOKENS.color.fg.primary, textAlign: 'center' }}>No workouts match</Text>
              <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary, textAlign: 'center', marginTop: 4 }}>
                {filters.search || activeFilterCount ? 'Try adjusting your filters.' : "Finish a session and it'll show up here."}
              </Text>
            </View>
          ) : (
            <View style={{ gap: TOKENS.space.sm }}>
              {filtered.map(w => (
                <WorkoutRow key={w.id} workout={w} onOpen={setSelectedWorkout} units={units} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        setFilters={setFilters}
        workouts={allWorkouts}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.color.bg.base },

  searchRow: {
    flexDirection: 'row', gap: TOKENS.space.sm, alignItems: 'center',
    paddingHorizontal: TOKENS.space.xl, paddingTop: TOKENS.space.xl, paddingBottom: TOKENS.space.md,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.sm,
    backgroundColor: TOKENS.color.bg.elevated, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.md, paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1, paddingVertical: 10, color: TOKENS.color.fg.primary, fontSize: 14,
  },
  filterBtn: {
    padding: 10, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: TOKENS.color.bg.elevated, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.md,
  },
  filterBtnActive: {
    backgroundColor: TOKENS.color.accent.primary + '14', borderColor: TOKENS.color.accent.primary,
  },
  filterCount: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, fontWeight: '600',
    color: TOKENS.color.accent.primary,
  },

  calendarCard: {
    backgroundColor: TOKENS.color.bg.surface, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.lg, padding: TOKENS.space.md,
  },
  calendarNav: {
    flexDirection: 'row', alignItems: 'center', marginBottom: TOKENS.space.md, paddingHorizontal: TOKENS.space.sm,
  },
  calNavBtn: { padding: 6 },
  calMonthLabel: {
    flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: TOKENS.color.fg.primary,
  },
  calWeekdays: { flexDirection: 'row', marginBottom: 4 },
  calDayHeader: { width: '14.285%', alignItems: 'center', paddingBottom: 4 },
  calDayHeaderText: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: TOKENS.color.fg.tertiary,
    letterSpacing: 0.1 * 9,
  },
  calRow: { flexDirection: 'row' },
  calCell: {
    flex: 1, aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  calCellText: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: TOKENS.color.fg.secondary,
  },
  calPrDot: {
    position: 'absolute', top: 2, right: 2,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#000', borderWidth: 1, borderColor: TOKENS.color.accent.onPrimary,
  },

  summaryStrip: { flexDirection: 'row', gap: TOKENS.space.sm, marginTop: TOKENS.space.md },
  summaryTile: {
    flex: 1, padding: TOKENS.space.md,
    backgroundColor: TOKENS.color.bg.surface, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.md,
  },
  capLabel: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, fontWeight: '600',
    letterSpacing: 0.08 * 11, textTransform: 'uppercase', color: TOKENS.color.fg.tertiary,
  },
  summaryValue: {
    fontSize: 22, fontWeight: '500', letterSpacing: -0.02 * 22, color: TOKENS.color.fg.primary, marginTop: 4,
  },
  summaryUnit: { fontSize: 11, color: TOKENS.color.fg.tertiary },

  workoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.md,
    backgroundColor: TOKENS.color.bg.surface, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.md, padding: TOKENS.space.md,
  },
  workoutDateCol: { width: 44, alignItems: 'center', flexShrink: 0 },
  workoutWeekday: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: TOKENS.color.fg.tertiary,
    letterSpacing: 0.1 * 9, textTransform: 'uppercase',
  },
  workoutDay: {
    fontSize: 20, fontWeight: '500', color: TOKENS.color.fg.primary, letterSpacing: -0.02 * 20, marginTop: 2,
  },
  workoutVol: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, fontWeight: '500',
    color: TOKENS.color.fg.primary, letterSpacing: -0.01 * 13,
  },
  workoutVolUnit: { fontSize: 10, color: TOKENS.color.fg.tertiary },

  prBadge: {
    backgroundColor: TOKENS.color.accent.primary + '22',
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3,
  },
  prBadgeText: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, fontWeight: '600',
    color: TOKENS.color.accent.primary, letterSpacing: 0.1 * 9, textTransform: 'uppercase',
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
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: TOKENS.color.bg.elevated, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.pill,
  },
  filterChipActive: { backgroundColor: TOKENS.color.accent.primary, borderColor: TOKENS.color.accent.primary },
  filterChipText: { fontSize: 12, color: TOKENS.color.fg.primary },
  filterChipTextActive: { color: TOKENS.color.accent.onPrimary },

  prOnlyRow: {
    flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.md,
    padding: TOKENS.space.md, backgroundColor: TOKENS.color.bg.elevated, borderRadius: TOKENS.radius.md,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5,
    borderColor: TOKENS.color.border.default, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: TOKENS.color.accent.primary, borderColor: TOKENS.color.accent.primary },

  detailHeader: {
    paddingHorizontal: TOKENS.space.xl, paddingTop: TOKENS.space.lg, paddingBottom: TOKENS.space.md,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  exerciseBlock: {
    backgroundColor: TOKENS.color.bg.surface, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.lg, overflow: 'hidden',
  },
  exerciseBlockHeader: {
    flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.md, padding: TOKENS.space.md,
  },
  setTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  setTableHeader: {
    flex: 1, fontFamily: 'JetBrainsMono_400Regular', fontSize: 9,
    color: TOKENS.color.fg.tertiary, letterSpacing: 0.1 * 9, textTransform: 'uppercase',
  },
  setTableCell: {
    flex: 1, fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, color: TOKENS.color.fg.primary,
  },
});
