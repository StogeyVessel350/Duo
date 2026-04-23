import React, { useState, useMemo } from 'react';
import {
  View, ScrollView, Pressable, TextInput, StyleSheet,
  Text as RNText,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '@/theme';
import { Text, Button, Icon } from '@/components/primitives';
import { ScreenHeader, DuoMark } from '@/components/shell';
import { TAB_BAR_CLEARANCE } from '@/components/shell/TabBar';
import { useUnits, fromKg, unitLabel } from '@/context/UnitsContext';

// ─── Exercise data ────────────────────────────────────────────
interface Exercise {
  id: string; name: string; equipment: string; muscles: string[];
  cues: string[];
}

const EXERCISES: Exercise[] = [
  { id: 'bench-press',      name: 'Bench press',           equipment: 'barbell',    muscles: ['Chest', 'Triceps', 'Shoulders'], cues: ['Retract scapula and create an arch', 'Bar to mid-chest, elbows ~45°', 'Drive feet into floor, press explosively', 'DUO tracks bar speed on the concentric'] },
  { id: 'back-squat',       name: 'Back squat',            equipment: 'barbell',    muscles: ['Quads', 'Glutes', 'Core'],       cues: ['Brace your core before each rep', 'Break at hips and knees together', 'Descend until hips are below knees', 'Drive through your heels, DUO measures concentric velocity'] },
  { id: 'deadlift',         name: 'Deadlift',              equipment: 'barbell',    muscles: ['Back', 'Hamstrings', 'Glutes'],  cues: ['Bar over mid-foot, roughly one inch from shins', 'Push the floor away — bar stays in contact with legs', 'Stand tall at lockout, squeeze glutes', 'Lower under control, reset brace before next rep'] },
  { id: 'overhead-press',   name: 'Overhead press',        equipment: 'barbell',    muscles: ['Shoulders', 'Triceps', 'Core'],  cues: ['Tuck your chin, brace core and glutes', 'Press straight up, head through as bar passes forehead', 'Finish with biceps by ears, bar over mid-foot', 'Lower under control to front delts'] },
  { id: 'cable-row',        name: 'Seated cable row',      equipment: 'cable',      muscles: ['Back', 'Biceps'],                cues: ['Start with arms extended, torso vertical', 'Drive elbows back, pull to lower ribs', 'Squeeze shoulder blades together at end', 'Return slowly (~2 sec) to start'] },
  { id: 'leg-press',        name: 'Leg press',             equipment: 'machine',    muscles: ['Quads', 'Glutes', 'Hamstrings'], cues: ['Feet shoulder-width on platform', 'Lower until knees reach ~90°', 'Press through mid-foot, avoid hard lockout', 'Controlled tempo throughout'] },
  { id: 'pushup',           name: 'Push-up',               equipment: 'bodyweight', muscles: ['Chest', 'Triceps', 'Core'],      cues: ['Hollow body, hands just outside shoulders', 'Lower chest to within an inch of the floor', 'Elbows tracking ~45° from torso', 'Press the floor away, fully extending arms'] },
  { id: 'goblet-squat',     name: 'Goblet squat',          equipment: 'dumbbell',   muscles: ['Quads', 'Glutes', 'Core'],       cues: ['Hold weight at chest height, elbows tucked', 'Feet just wider than shoulders, toes slightly out', 'Sit down between your hips — torso stays upright', 'Drive through mid-foot to stand up'] },
  { id: 'romanian-dl',      name: 'Romanian deadlift',     equipment: 'barbell',    muscles: ['Hamstrings', 'Glutes', 'Back'],   cues: ['Hip hinge, soft knee bend', 'Feel the hamstring stretch at the bottom', 'Return explosively, squeeze glutes at top', 'Velocity target = 0.55 m/s for eccentric control'] },
  { id: 'db-shoulder-press',name: 'DB shoulder press',     equipment: 'dumbbell',   muscles: ['Shoulders', 'Triceps'],           cues: ['Dumbbells at ear height, elbows below wrists', 'Press directly overhead to lockout', 'DUO detects independent side velocity for each arm', 'Lower under control to starting position'] },
  { id: 'incline-bench',    name: 'Incline bench press',   equipment: 'dumbbell',   muscles: ['Chest', 'Shoulders', 'Triceps'],  cues: ['Set bench to 30–45°', 'Lower dumbbells to outside of upper chest', 'Elbows ~45° from torso — don\'t flare', 'Press up and slightly together until lockout'] },
  { id: 'hip-thrust',       name: 'Hip thrust',            equipment: 'barbell',    muscles: ['Glutes', 'Hamstrings'],           cues: ['Bench at shoulder blades', 'Drive hips up to full extension', 'Squeeze glutes at the top', 'Lower under control, keep tension throughout'] },
  { id: 'lat-pulldown',     name: 'Lat pulldown',          equipment: 'cable',      muscles: ['Back', 'Biceps'],                 cues: ['Lean back slightly, chest up', 'Pull elbows down and back', 'Squeeze lats at the bottom', 'Return with control, full stretch at top'] },
  { id: 'db-curl',          name: 'Dumbbell curl',         equipment: 'dumbbell',   muscles: ['Biceps', 'Forearms'],             cues: ['Pin elbows to sides', 'Supinate at the top of the rep', 'DUO on each bell shows which arm is stronger', 'Control the eccentric for ~2 seconds'] },
  { id: 'tricep-pushdown',  name: 'Tricep pushdown',       equipment: 'cable',      muscles: ['Triceps'],                       cues: ['Elbows pinned to sides', 'Full lockout extension', 'Control the return, don\'t let stack crash', 'Programmed between heavier presses'] },
  { id: 'calf-raise',       name: 'Calf raise',            equipment: 'bodyweight', muscles: ['Calves'],                        cues: ['Full range of motion', 'Pause at the top', 'Controlled descent', 'High reps with easy load progression week over week'] },
  { id: 'plank',            name: 'Plank',                 equipment: 'bodyweight', muscles: ['Core'],                          cues: ['Hollow body, squeeze glutes', 'Breathe controlled', 'DUO tracks tilt drift across the hold', 'Build duration progressively'] },
  { id: 'pull-up',          name: 'Pull-up',               equipment: 'bodyweight', muscles: ['Back', 'Biceps', 'Core'],        cues: ['Dead hang start position', 'Drive elbows down and back', 'Chin over bar at top', 'Lower under control'] },
  { id: 'lateral-raise',    name: 'Lateral raise',         equipment: 'dumbbell',   muscles: ['Shoulders'],                     cues: ['Slight elbow bend throughout', 'Lead with elbows, not wrists', 'Raise to shoulder height', 'Control the descent — where gains are made'] },
  { id: 'face-pull',        name: 'Face pull',             equipment: 'cable',      muscles: ['Shoulders'],                     cues: ['Pull to forehead level', 'External rotate at end range', 'Squeeze rear delts', 'Excellent for shoulder health'] },
];

const MUSCLES = ['Chest', 'Back', 'Quads', 'Shoulders', 'Glutes', 'Core', 'Biceps', 'Triceps', 'Calves', 'Hamstrings'];
const EQUIP = ['barbell', 'dumbbell', 'cable', 'bodyweight', 'machine'];

// ─── MetaPill ─────────────────────────────────────────────────
function MetaPill({ children, accent }: { children: string; accent?: boolean }) {
  return (
    <View style={[styles.metaPill, accent && styles.metaPillAccent]}>
      <RNText style={[styles.metaPillText, accent && styles.metaPillTextAccent]}>{children}</RNText>
    </View>
  );
}

// ─── FilterRow ────────────────────────────────────────────────
function FilterRow({ items, active, onChange, label }: { items: string[]; active: string | null; onChange: (v: string | null) => void; label: string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRowContent}>
      <View style={styles.filterRowLabel}>
        <RNText style={styles.filterRowLabelText}>{label}</RNText>
      </View>
      {items.map(item => {
        const isActive = active === item;
        return (
          <Pressable
            key={item}
            onPress={() => { Haptics.selectionAsync(); onChange(isActive ? null : item); }}
            style={[styles.filterPill, isActive && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, isActive ? styles.filterPillTextActive : undefined]}>{item}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Sparkline for history rows ───────────────────────────────
function InlineSparkline({ data, w = 52, h = 20 }: { data: number[]; w?: number; h?: number }) {
  if (data.length < 2) return <View style={{ width: w, height: h }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h * 0.8 - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <Svg width={w} height={h}>
      <Polyline points={pts} fill="none" stroke={TOKENS.color.accent.primary} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── ExerciseDetailScreen ─────────────────────────────────────
function ExerciseDetailScreen({ exercise, onBack }: { exercise: Exercise; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { units } = useUnits();
  const [showHistory, setShowHistory] = useState(true);

  const history = [
    { date: 'Mon', reps: 5, weight: 140, peakVel: 0.84, sparkline: [0.72, 0.78, 0.82, 0.81, 0.84] },
    { date: 'Fri', reps: 5, weight: 135, peakVel: 0.88, sparkline: [0.78, 0.82, 0.86, 0.85, 0.88] },
    { date: 'Wed', reps: 5, weight: 135, peakVel: 0.86, sparkline: [0.80, 0.84, 0.85, 0.83, 0.86] },
    { date: 'Mon', reps: 6, weight: 130, peakVel: 0.92, sparkline: [0.82, 0.86, 0.90, 0.89, 0.92, 0.90] },
    { date: 'Fri', reps: 5, weight: 130, peakVel: 0.90, sparkline: [0.84, 0.88, 0.90, 0.88, 0.90] },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader right={<Button size="sm" variant="ghost" onPress={onBack}>Back</Button>}>
        <DuoMark size={13} />
      </ScreenHeader>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE + 80 }}>
        {/* Hero illustration placeholder */}
        <View style={styles.heroPlaceholder}>
          <View style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundColor: TOKENS.color.accent.primary }} />
          <View style={styles.heroFigurePlaceholder}>
            <Icon name="dumbbell" size={40} color={TOKENS.color.fg.tertiary} />
          </View>
        </View>

        {/* Title + muscles */}
        <View style={{ paddingHorizontal: TOKENS.space.xl }}>
          <Text style={{ fontSize: 28, lineHeight: 34, fontWeight: '500', letterSpacing: -0.01 * 28, color: TOKENS.color.fg.primary }}>
            {exercise.name}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: TOKENS.space.sm, marginTop: TOKENS.space.md }}>
            {exercise.muscles.map((m, i) => (
              <MetaPill key={m} accent={i === 0}>{m}</MetaPill>
            ))}
            <MetaPill>{exercise.equipment}</MetaPill>
          </View>
        </View>

        {/* Cues */}
        <View style={{ paddingHorizontal: TOKENS.space.xl, paddingTop: TOKENS.space.xxl }}>
          <Text style={styles.sectionLabel}>Cues</Text>
          <View style={{ marginTop: TOKENS.space.md, gap: TOKENS.space.md }}>
            {exercise.cues.map((cue, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: TOKENS.space.md, alignItems: 'flex-start' }}>
                <View style={styles.cueDot} />
                <Text style={{ fontSize: 15, lineHeight: 22, color: TOKENS.color.fg.primary, flex: 1 }}>{cue}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* History */}
        <View style={{ paddingHorizontal: TOKENS.space.xl, paddingTop: TOKENS.space.xxl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionLabel}>Your history</Text>
            <Pressable onPress={() => setShowHistory(h => !h)}>
              <RNText style={styles.toggleHistoryBtn}>{showHistory ? 'SHOW EMPTY' : 'SHOW DATA'}</RNText>
            </Pressable>
          </View>

          {showHistory ? (
            <View style={styles.historyTable}>
              {history.map((h, i) => (
                <View key={i} style={[styles.historyRow, i < history.length - 1 && { borderBottomWidth: 1, borderBottomColor: TOKENS.color.border.subtle }]}>
                  <View style={{ width: 32, flexShrink: 0 }}>
                    <Text style={styles.sectionLabel}>{h.date}</Text>
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: TOKENS.space.md }}>
                    <RNText style={styles.historyValue}>
                      {h.reps}<RNText style={{ color: TOKENS.color.fg.tertiary, fontSize: 12 }}>×</RNText>{Math.round(fromKg(h.weight, units))}
                    </RNText>
                    <RNText style={styles.historyUnit}>{unitLabel(units)}</RNText>
                  </View>
                  <InlineSparkline data={h.sparkline} />
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, width: 56, justifyContent: 'flex-end' }}>
                    <RNText style={styles.historyVel}>{h.peakVel.toFixed(2)}</RNText>
                    <RNText style={styles.historyVelUnit}>m/s</RNText>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.historyEmpty}>
              <Text style={{ fontSize: 15, color: TOKENS.color.fg.secondary, textAlign: 'center' }}>No sets logged yet.</Text>
              <Text style={{ fontSize: 13, color: TOKENS.color.fg.tertiary, textAlign: 'center', marginTop: 4 }}>
                Start a workout to log your first rep.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add to workout CTA */}
      <View style={styles.detailCta}>
        <Button variant="primary" size="lg" full trailing={<Icon name="plus" size={14} color={TOKENS.color.accent.onPrimary} />}>
          Add to workout
        </Button>
      </View>
    </View>
  );
}

// ─── LibraryScreen ────────────────────────────────────────────
export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [equipFilter, setEquipFilter] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const filtered = useMemo(() => EXERCISES.filter(e => {
    if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (equipFilter && e.equipment !== equipFilter) return false;
    if (muscleFilter && !e.muscles.some(m => m.toLowerCase().includes(muscleFilter.toLowerCase()))) return false;
    return true;
  }), [q, muscleFilter, equipFilter]);

  if (selectedExercise) {
    return <ExerciseDetailScreen exercise={selectedExercise} onBack={() => setSelectedExercise(null)} />;
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader><DuoMark size={13} /></ScreenHeader>
      <View style={{ paddingHorizontal: TOKENS.space.xl, marginTop: TOKENS.space.sm }}>
        <Text style={{ fontSize: 28, lineHeight: 34, fontWeight: '500', letterSpacing: -0.01 * 28, color: TOKENS.color.fg.primary }}>Library</Text>
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: TOKENS.space.xl, paddingTop: TOKENS.space.lg }}>
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color={TOKENS.color.fg.tertiary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="search exercises"
            placeholderTextColor={TOKENS.color.fg.tertiary}
            style={styles.searchInput}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')}>
              <RNText style={{ color: TOKENS.color.fg.tertiary, fontSize: 18, lineHeight: 18 }}>×</RNText>
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter rows */}
      <View style={{ paddingTop: TOKENS.space.md, gap: TOKENS.space.sm }}>
        <FilterRow items={MUSCLES} active={muscleFilter} onChange={setMuscleFilter} label="muscle" />
        <FilterRow items={EQUIP} active={equipFilter} onChange={setEquipFilter} label="equip" />
      </View>

      {/* Exercise list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: TOKENS.space.xl, paddingBottom: TAB_BAR_CLEARANCE + 20, gap: TOKENS.space.md }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={{ padding: TOKENS.space.xxl, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: TOKENS.color.fg.tertiary, textAlign: 'center' }}>No exercises match.</Text>
          </View>
        ) : (
          filtered.map(ex => (
            <Pressable
              key={ex.id}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedExercise(ex); }}
              style={styles.exerciseCard}
            >
              <View style={styles.exerciseCardThumb}>
                <Icon name="dumbbell" size={20} color={TOKENS.color.fg.tertiary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 17, fontWeight: '600', letterSpacing: -0.01 * 17, color: TOKENS.color.fg.primary }}>
                  {ex.name}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  <MetaPill>{ex.equipment}</MetaPill>
                  <MetaPill accent>{ex.muscles[0]}</MetaPill>
                </View>
              </View>
              <Icon name="chevron" size={10} color={TOKENS.color.fg.tertiary} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.color.bg.base },

  searchBar: {
    height: 44, flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.md,
    backgroundColor: TOKENS.color.bg.elevated, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.pill, paddingHorizontal: TOKENS.space.lg,
  },
  searchInput: {
    flex: 1, color: TOKENS.color.fg.primary,
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, letterSpacing: 0.02 * 13,
  },

  filterRowContent: {
    paddingHorizontal: TOKENS.space.xl, gap: TOKENS.space.sm, alignItems: 'center',
  },
  filterRowLabel: { flexShrink: 0, paddingRight: 4 },
  filterRowLabelText: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.color.fg.tertiary,
    letterSpacing: 0.1 * 10, textTransform: 'uppercase',
  },
  filterPill: {
    height: 28, paddingHorizontal: TOKENS.space.md,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: TOKENS.color.border.default,
    borderRadius: TOKENS.radius.pill, alignItems: 'center', justifyContent: 'center',
  },
  filterPillActive: { backgroundColor: TOKENS.color.fg.primary, borderColor: 'transparent' },
  filterPillText: { fontSize: 12, fontWeight: '500', color: TOKENS.color.fg.secondary },
  filterPillTextActive: { color: TOKENS.color.bg.base },

  exerciseCard: {
    flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.lg,
    backgroundColor: TOKENS.color.bg.surface, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.lg, padding: TOKENS.space.md,
  },
  exerciseCardThumb: {
    width: 80, height: 106,
    backgroundColor: TOKENS.color.bg.base, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  metaPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: TOKENS.radius.sm,
    backgroundColor: TOKENS.color.bg.elevated, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
  },
  metaPillAccent: {},
  metaPillText: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, letterSpacing: 0.06 * 10,
    textTransform: 'uppercase', color: TOKENS.color.fg.secondary,
  },
  metaPillTextAccent: { color: TOKENS.color.accent.primary },

  heroPlaceholder: {
    height: 240, alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  heroFigurePlaceholder: {
    width: 120, height: 160, backgroundColor: TOKENS.color.bg.surface,
    borderWidth: 1, borderColor: TOKENS.color.border.subtle, borderRadius: TOKENS.radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },

  sectionLabel: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, fontWeight: '600',
    letterSpacing: 0.08 * 11, textTransform: 'uppercase', color: TOKENS.color.fg.tertiary,
  },
  cueDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: TOKENS.color.accent.primary, marginTop: 9, flexShrink: 0,
  },

  historyTable: {
    marginTop: TOKENS.space.md,
    backgroundColor: TOKENS.color.bg.surface, borderWidth: 1, borderColor: TOKENS.color.border.subtle,
    borderRadius: TOKENS.radius.md, overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: TOKENS.space.md,
    paddingHorizontal: TOKENS.space.lg, paddingVertical: TOKENS.space.md,
  },
  historyValue: {
    fontFamily: undefined, fontSize: 18, fontWeight: '500',
    color: TOKENS.color.fg.primary, letterSpacing: -0.01 * 18,
  },
  historyUnit: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.color.fg.tertiary,
  },
  historyVel: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, fontWeight: '500',
    color: TOKENS.color.accent.primary,
  },
  historyVelUnit: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: TOKENS.color.fg.tertiary,
  },

  historyEmpty: {
    marginTop: TOKENS.space.md, padding: TOKENS.space.xl,
    backgroundColor: TOKENS.color.bg.surface,
    borderWidth: 1, borderColor: TOKENS.color.border.default, borderStyle: 'dashed',
    borderRadius: TOKENS.radius.md, alignItems: 'center',
  },

  toggleHistoryBtn: {
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: TOKENS.color.fg.tertiary,
    letterSpacing: 0.08 * 10, textTransform: 'uppercase',
  },

  detailCta: {
    position: 'absolute', bottom: 96, left: 0, right: 0,
    paddingHorizontal: TOKENS.space.xl,
  },
});
