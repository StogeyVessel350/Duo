// DUO — WorkoutFlow: complete port of workout-flow.jsx, live-set-screen.jsx,
// post-set-feedback.jsx, rest-timer.jsx, muscle-picker.jsx,
// workout-type-picker.jsx, and catalog.jsx → single self-contained RN file.

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, ScrollView, Pressable, Text as RNText, StyleSheet,
  Modal, TextInput,
} from 'react-native';
import Svg, {
  Circle as SvgCircle, Path, Path as SvgPath, Line, Line as SvgLine,
  Rect as SvgRect, G, Text as SvgText,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKENS } from '@/theme';
import { Text, Button, Icon } from '@/components/primitives';
import { TAB_BAR_CLEARANCE } from '@/components/shell/TabBar';
import { useUnits, fromKg, unitLabel, type UnitSystem } from '@/context/UnitsContext';

// ─── Haptics helpers ───────────────────────────────────────────
const haptics = {
  light:     () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium:    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy:     () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  selection: () => Haptics.selectionAsync(),
  success:   () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

// ─── Colors ───────────────────────────────────────────────────
const C = TOKENS.color;
const S = TOKENS.space;
const R = TOKENS.radius;

// ─── Velocity zones (velocity.jsx) ────────────────────────────
const VELOCITY_ZONES = [
  { id: 'strength-abs', min: 0,    max: 0.50, label: 'Abs. strength',  color: '#60A5FA' },
  { id: 'strength',     min: 0.50, max: 0.75, label: 'Strength',       color: '#67E8F9' },
  { id: 'power',        min: 0.75, max: 1.00, label: 'Power',          color: '#E6FF3D' },
  { id: 'speed-str',    min: 1.00, max: 1.30, label: 'Speed-strength', color: '#FBBF24' },
  { id: 'speed',        min: 1.30, max: 99,   label: 'Speed',          color: '#F87171' },
];
function zoneFor(v: number) {
  return VELOCITY_ZONES.find(z => v >= z.min && v < z.max) || VELOCITY_ZONES[0];
}
function velocityLossColor(pct: number) {
  if (pct >= 0.35) return C.semantic.danger;
  if (pct >= 0.20) return C.semantic.warning;
  return C.fg.secondary;
}

// ─── Muscle groups (catalog.jsx) ──────────────────────────────
const MUSCLE_GROUPS = [
  { id: 'chest',      label: 'Chest',      region: 'upper' },
  { id: 'back',       label: 'Back',       region: 'upper' },
  { id: 'shoulders',  label: 'Shoulders',  region: 'upper' },
  { id: 'biceps',     label: 'Biceps',     region: 'arms'  },
  { id: 'triceps',    label: 'Triceps',    region: 'arms'  },
  { id: 'forearms',   label: 'Forearms',   region: 'arms'  },
  { id: 'quads',      label: 'Quads',      region: 'legs'  },
  { id: 'hamstrings', label: 'Hamstrings', region: 'legs'  },
  { id: 'glutes',     label: 'Glutes',     region: 'legs'  },
  { id: 'calves',     label: 'Calves',     region: 'legs'  },
  { id: 'core',       label: 'Core',       region: 'core'  },
];

// ─── Exercise pool (catalog.jsx) ──────────────────────────────
const EXERCISE_POOL = [
  { id: 'bench-press', name: 'Bench press', equipment: 'barbell',
    muscles: ['chest','triceps','shoulders'], baseLoadKg: 80, style: ['heavy','hypertrophy'],
    why: 'Compound chest builder. Drives horizontal pressing strength and bar-path symmetry — ideal for bilateral DUO tracking.' },
  { id: 'db-bench', name: 'DB bench press', equipment: 'dumbbell',
    muscles: ['chest','triceps','shoulders'], baseLoadKg: 32, style: ['hypertrophy','hiit'],
    why: 'Unilateral control with deeper stretch. Good for fixing left/right asymmetries DUO has flagged.' },
  { id: 'pushup', name: 'Push-up', equipment: 'bodyweight',
    muscles: ['chest','triceps','core'], baseLoadKg: 0, style: ['hiit','hypertrophy'],
    why: "Bodyweight compound. Low fatigue cost — a good high-rep finisher when you're primed but not loaded." },
  { id: 'incline-db-press', name: 'Incline DB press', equipment: 'dumbbell',
    muscles: ['chest','shoulders','triceps'], baseLoadKg: 28, style: ['hypertrophy','heavy'],
    why: "Upper-chest emphasis you've been underloading lately — your last 3 sessions skewed flat-bench." },
  { id: 'cable-row', name: 'Seated cable row', equipment: 'cable',
    muscles: ['back','biceps'], baseLoadKg: 68, style: ['hypertrophy','hiit'],
    why: 'Retraction pattern that matches your bench volume. Keeps shoulder health on track.' },
  { id: 'deadlift', name: 'Deadlift', equipment: 'barbell',
    muscles: ['back','hamstrings','glutes','core'], baseLoadKg: 140, style: ['heavy'],
    why: 'Your posterior chain keystone. Readiness is green — pull heavy today.' },
  { id: 'pullup', name: 'Pull-up', equipment: 'bodyweight',
    muscles: ['back','biceps','core'], baseLoadKg: 0, style: ['hypertrophy','hiit'],
    why: 'Vertical pull to balance your pressing volume this block.' },
  { id: 'bent-row', name: 'Bent-over row', equipment: 'barbell',
    muscles: ['back','biceps','core'], baseLoadKg: 70, style: ['heavy','hypertrophy'],
    why: 'Hinge + pull. Builds the bracing DUO measures during your deadlift setup.' },
  { id: 'overhead-press', name: 'Overhead press', equipment: 'barbell',
    muscles: ['shoulders','triceps','core'], baseLoadKg: 48, style: ['heavy','hypertrophy'],
    why: 'Vertical press keystone. DUO flagged 6% L/R split last week — reps in the 5-rep range will cement symmetry.' },
  { id: 'lateral-raise', name: 'Lateral raise', equipment: 'dumbbell',
    muscles: ['shoulders'], baseLoadKg: 10, style: ['hypertrophy','hiit'],
    why: 'Side-delt isolation. Light load, high reps — perfect for a conditioning finisher.' },
  { id: 'db-shoulder-press', name: 'DB shoulder press', equipment: 'dumbbell',
    muscles: ['shoulders','triceps'], baseLoadKg: 20, style: ['hypertrophy'],
    why: 'Unilateral pressing — DUO detects independent side velocity for each arm.' },
  { id: 'db-curl', name: 'Dumbbell curl', equipment: 'dumbbell',
    muscles: ['biceps','forearms'], baseLoadKg: 14, style: ['hypertrophy','hiit'],
    why: 'Bilateral curl. DUO on each bell shows which arm is stronger through the concentric.' },
  { id: 'hammer-curl', name: 'Hammer curl', equipment: 'dumbbell',
    muscles: ['biceps','forearms'], baseLoadKg: 14, style: ['hypertrophy'],
    why: "Brachialis emphasis — DUO data shows your long-head bias; this evens it out." },
  { id: 'barbell-curl', name: 'Barbell curl', equipment: 'barbell',
    muscles: ['biceps'], baseLoadKg: 30, style: ['heavy','hypertrophy'],
    why: 'Highest biceps load. Good for building concentric strength.' },
  { id: 'tricep-pushdown', name: 'Tricep pushdown', equipment: 'cable',
    muscles: ['triceps'], baseLoadKg: 40, style: ['hypertrophy','hiit'],
    why: 'Lockout power for your bench. Programmed between heavier presses.' },
  { id: 'skull-crusher', name: 'Skull crusher', equipment: 'barbell',
    muscles: ['triceps'], baseLoadKg: 25, style: ['hypertrophy'],
    why: 'Long-head tricep emphasis. Pairs well with overhead work.' },
  { id: 'back-squat', name: 'Back squat', equipment: 'barbell',
    muscles: ['quads','glutes','core'], baseLoadKg: 110, style: ['heavy','hypertrophy'],
    why: "Your strongest lift this block. Readiness is green — program a working set of 5 at 82%." },
  { id: 'goblet-squat', name: 'Goblet squat', equipment: 'dumbbell',
    muscles: ['quads','glutes','core'], baseLoadKg: 28, style: ['hypertrophy','hiit'],
    why: 'Upright-torso squat pattern. Perfect for higher reps when you want quad volume without spinal load.' },
  { id: 'leg-press', name: 'Leg press', equipment: 'machine',
    muscles: ['quads','glutes','hamstrings'], baseLoadKg: 180, style: ['heavy','hypertrophy'],
    why: 'Heavy isolation of the quads — good for accumulating volume with low stabilizer demand.' },
  { id: 'bulgarian-split', name: 'Bulgarian split squat', equipment: 'dumbbell',
    muscles: ['quads','glutes','hamstrings'], baseLoadKg: 22, style: ['hypertrophy','hiit'],
    why: 'Unilateral — DUO shows your R quad drives 7% harder. This will correct.' },
  { id: 'rdl', name: 'Romanian deadlift', equipment: 'barbell',
    muscles: ['hamstrings','glutes','back'], baseLoadKg: 90, style: ['heavy','hypertrophy'],
    why: 'Hamstring stretch loaded. Velocity target = 0.55 m/s for eccentric control.' },
  { id: 'hip-thrust', name: 'Hip thrust', equipment: 'barbell',
    muscles: ['glutes','hamstrings'], baseLoadKg: 120, style: ['heavy','hypertrophy'],
    why: 'Top-end glute loading. Matches your posterior chain focus this block.' },
  { id: 'calf-raise', name: 'Calf raise', equipment: 'bodyweight',
    muscles: ['calves'], baseLoadKg: 0, style: ['hypertrophy','hiit'],
    why: 'High-rep calf. Easy load progression week over week.' },
  { id: 'back-squat', name: 'Back squat', equipment: 'barbell',
    muscles: ['quads','glutes','core'], baseLoadKg: 110, style: ['heavy','hypertrophy'],
    why: "Your strongest lift this block." },
  { id: 'plank', name: 'Plank', equipment: 'bodyweight',
    muscles: ['core'], baseLoadKg: 0, style: ['hiit'],
    why: 'Isometric bracing. DUO tracks tilt drift across the hold.' },
  { id: 'ab-rollout', name: 'Ab rollout', equipment: 'bodyweight',
    muscles: ['core','shoulders'], baseLoadKg: 0, style: ['hypertrophy','hiit'],
    why: 'Anti-extension core. Transfers to your deadlift setup bracing.' },
];

// ─── Workout types (catalog.jsx) ──────────────────────────────
const WORKOUT_TYPES = [
  {
    id: 'heavy', label: 'Heavy', subtitle: 'Low reps · heavy load',
    sets: 4, reps: 5, restSec: 180, intensity: 0.85,
    targetVelocity: 0.5, velocityZone: 'strength',
    description: 'Four sets of five at 85% 1RM. Full rest — priority on bar speed holding.',
    tag: 'STRENGTH', fitGoals: ['strength','power'],
  },
  {
    id: 'hypertrophy', label: 'Hypertrophy', subtitle: 'Moderate reps · growth',
    sets: 4, reps: 10, restSec: 90, intensity: 0.72,
    targetVelocity: 0.7, velocityZone: 'power',
    description: 'Four sets of ten at 72% 1RM, 90 s rest. Volume-driven growth work.',
    tag: 'GROWTH', fitGoals: ['muscle','aesthetic','general'],
  },
  {
    id: 'hiit', label: 'HIIT', subtitle: 'High intensity intervals',
    sets: 5, reps: 12, restSec: 45, intensity: 0.55,
    targetVelocity: 0.85, velocityZone: 'speed',
    description: 'Five rounds of twelve at 55% 1RM, short rest. Conditioning meets strength.',
    tag: 'CONDITION', fitGoals: ['fat-loss','conditioning','general'],
  },
];

// ─── Exercise guides (catalog.jsx) ────────────────────────────
const EXERCISE_GUIDES: Record<string, { setup: string[]; execution: string[] }> = {
  'bench-press': {
    setup: [
      'Clip the DUO tracker onto the center of the barbell, between your hands.',
      'Load the bar and lie flat on the bench. Eyes directly under the bar.',
      'Plant feet, retract shoulder blades, arch slightly — create a stable base.',
    ],
    execution: [
      'Unrack and hold over your shoulders with locked elbows.',
      'Lower the bar to your mid-chest under control (~2 sec).',
      'Press explosively upward — DUO reads bar speed on the concentric.',
      'Lock out briefly, then repeat without bouncing.',
    ],
  },
  'back-squat': {
    setup: [
      'Clip the DUO tracker onto the barbell sleeve, outside the collar.',
      'Set the rack height just below shoulders. Load the bar.',
      'Step under, position the bar on your upper traps, brace, and unrack.',
    ],
    execution: [
      'Take two steps back, stance shoulder-width, toes slightly out.',
      'Brace your core, break at the hips and knees together.',
      'Descend until hips are below knees — controlled ~2 sec.',
      'Drive through your heels and stand up. DUO measures concentric velocity.',
    ],
  },
  'deadlift': {
    setup: [
      'Clip the DUO tracker onto the barbell sleeve, outside the plates.',
      'Bar over mid-foot, roughly one inch from your shins.',
      'Hinge to grip the bar just outside your knees. Flat back, chest up.',
    ],
    execution: [
      'Take the slack out of the bar — feel tension in your lats.',
      'Push the floor away — bar stays in contact with your legs.',
      'Stand tall at lockout, squeeze glutes. Do NOT hyperextend.',
      'Lower under control, reset your brace before the next rep.',
    ],
  },
  'overhead-press': {
    setup: [
      'Clip the DUO tracker onto the center of the barbell.',
      'Set the rack at upper-chest height. Grip just outside shoulders.',
      'Unrack onto your front delts, elbows slightly in front of the bar.',
    ],
    execution: [
      'Tuck your chin, brace your core and glutes.',
      'Press straight up, moving your head through as the bar passes your forehead.',
      'Finish with biceps by your ears, bar stacked over mid-foot.',
      'Lower under control back to your front delts.',
    ],
  },
  'cable-row': {
    setup: [
      'Clip the DUO tracker to the cable handle or attachment.',
      'Sit with feet on the platform, knees slightly bent.',
      'Grab the handle, sit tall, shoulders down — no shrug.',
    ],
    execution: [
      'Start with arms extended, torso vertical.',
      'Drive elbows back, pulling the handle to your lower ribs.',
      'Squeeze shoulder blades together at the end.',
      'Return slowly (~2 sec) to the start, maintaining tension.',
    ],
  },
  'goblet-squat': {
    setup: [
      'Clip the DUO tracker to the dumbbell or kettlebell handle.',
      'Hold the weight at chest height, elbows tucked under.',
      'Feet just wider than shoulders, toes slightly turned out.',
    ],
    execution: [
      'Brace, sit down between your hips — torso stays upright.',
      'Descend to full depth, elbows inside knees.',
      'Drive through mid-foot to stand up.',
      'Keep the weight close to your chest the entire rep.',
    ],
  },
};
const DEFAULT_GUIDES: Record<string, { setup: string[]; execution: string[] }> = {
  barbell: {
    setup: ['Clip the DUO tracker onto the barbell sleeve, outside the collar.', 'Load the bar with your working weight.', 'Set your grip and establish your brace before unracking.'],
    execution: ['Move the bar through its full range of motion under control.', 'DUO tracks bar velocity and left/right balance through every rep.', 'Keep your tempo consistent — ~2 sec down, explosive up.'],
  },
  dumbbell: {
    setup: ['Clip one DUO tracker onto each dumbbell — DUO will sync both arms.', 'Pick weights from the rack using a neutral spine.', 'Set your stance and brace before starting the first rep.'],
    execution: ['Match left and right sides through the rep — DUO flags asymmetry.', 'Control the eccentric for ~2 seconds.', 'Drive through the concentric explosively.'],
  },
  cable: {
    setup: ['Clip the DUO tracker to the cable attachment.', 'Select your working weight on the stack.', 'Set body position so the cable pulls in a straight line.'],
    execution: ['Start from a fully stretched position.', 'Move the handle through its full range, squeezing at peak contraction.', "Return slowly to maintain tension — don't let the stack crash."],
  },
  machine: {
    setup: ["Clip the DUO tracker to the machine's load arm.", 'Adjust the seat and pad to fit your body.', 'Select your weight and secure any safety pins.'],
    execution: ["Move through the machine's path smoothly.", 'Control the eccentric, drive the concentric.', 'Stop if anything twinges — fixed paths are less forgiving.'],
  },
  bodyweight: {
    setup: ['Clip the DUO tracker to your wristband, or pin to your shirt.', 'Set body alignment for the movement — feet, hands, hips in position.', 'Brace your core before starting.'],
    execution: ['Control the descent for ~2 seconds.', "Drive the concentric explosively — DUO reads the body's velocity.", 'Keep alignment tight through every rep.'],
  },
};
function getGuideForExercise(exercise: any) {
  if (!exercise) return { setup: [], execution: [] };
  return EXERCISE_GUIDES[exercise.id] || DEFAULT_GUIDES[exercise.equipment] || { setup: [], execution: [] };
}

// ─── Catalog helpers ──────────────────────────────────────────
function pickExercise(selectedMuscleIds: string[], styleId: string, excludeIds: string[] = []) {
  const selected = new Set(selectedMuscleIds);
  const pool = EXERCISE_POOL
    .filter(ex => ex.muscles.some(m => selected.has(m)))
    .filter(ex => !styleId || ex.style.includes(styleId))
    .filter(ex => !excludeIds.includes(ex.id));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * Math.min(pool.length, 4))];
}

function prescribe(exercise: any, workoutType: any) {
  const readiness = 0.78;
  const readinessMod = 0.95 + (readiness - 0.7) * 0.3;
  const loadKg = exercise.baseLoadKg > 0
    ? Math.round(exercise.baseLoadKg * workoutType.intensity * readinessMod / 2.5) * 2.5
    : 0;
  return {
    sets: workoutType.sets,
    reps: workoutType.reps,
    restSec: workoutType.restSec,
    loadKg,
    targetVelocity: workoutType.targetVelocity,
    velocityZone: workoutType.velocityZone,
  };
}

function suggestWorkoutType(goalIds: string[] = []) {
  const goals = new Set(goalIds);
  for (const t of WORKOUT_TYPES) {
    if (t.fitGoals.some(g => goals.has(g))) return t.id;
  }
  return 'hypertrophy';
}

// ─── Mock velocity stream (replaces BLE device) ───────────────
function useMockVelocityStream(active: boolean, targetVelocity: number) {
  const [reps, setReps] = useState<any[]>([]);
  const [leftReps, setLeftReps] = useState<any[]>([]);
  const [rightReps, setRightReps] = useState<any[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) return;
    setReps([]); setLeftReps([]); setRightReps([]);
    let repN = 0;
    intervalRef.current = setInterval(() => {
      repN++;
      const fatigue = Math.min(0.15, repN * 0.015);
      const base = targetVelocity * (1 - fatigue) + (Math.random() - 0.5) * 0.08;
      const peakV = Math.max(0.3, base);
      const L = { peakV: peakV + (Math.random() - 0.5) * 0.04, avgV: peakV * 0.85, tilt: (Math.random() - 0.5) * 4, rep: repN, t: Date.now(), side: 'left' };
      const R = { peakV: peakV - 0.03 + (Math.random() - 0.5) * 0.04, avgV: peakV * 0.83, tilt: (Math.random() - 0.5) * 3, rep: repN, t: Date.now(), side: 'right' };
      setLeftReps(prev => [...prev.slice(-20), L]);
      setRightReps(prev => [...prev.slice(-20), R]);
      const combined = { peakV: (L.peakV + R.peakV) / 2, avgV: (L.avgV + R.avgV) / 2, tilt: 0, rep: repN, t: Date.now() };
      setReps(prev => [...prev.slice(-20), combined]);
    }, 2200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, targetVelocity]);

  const latest = reps[reps.length - 1] || null;
  const loss = reps.length >= 2
    ? Math.max(0, (reps[0].peakV - reps[reps.length - 1].peakV) / reps[0].peakV)
    : 0;

  const lAvg = leftReps.length ? leftReps.reduce((a, r) => a + r.peakV, 0) / leftReps.length : 0;
  const rAvg = rightReps.length ? rightReps.reduce((a, r) => a + r.peakV, 0) / rightReps.length : 0;
  const max = Math.max(lAvg, rAvg);
  const signed = max > 0 ? (rAvg - lAvg) / max : 0;
  const imbalance = { pct: Math.abs(signed), weaker: signed > 0.02 ? 'left' : signed < -0.02 ? 'right' : null, signed };

  return { reps, leftReps, rightReps, latest, loss, imbalance };
}

// ─── WorkoutFlow orchestrator (workout-flow.jsx) ──────────────
type Step = 'muscles' | 'type' | 'preview' | 'live' | 'feedback' | 'rest' | 'complete';

interface Props { onComplete: () => void; }

export function WorkoutFlow({ onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('muscles');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [typeId, setTypeId] = useState<string | null>(null);
  const [currentExercise, setCurrentExercise] = useState<any>(null);
  const [prescription, setPrescription] = useState<any>(null);
  const [setIndex, setSetIndex] = useState(0);
  const [lastSetResult, setLastSetResult] = useState<any>(null);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [sessionLog, setSessionLog] = useState<any[]>([]);
  const [sessionStart] = useState(() => Date.now());

  const suggestedTypeId = 'hypertrophy';
  const workoutType = typeId ? WORKOUT_TYPES.find(t => t.id === typeId) : null;

  const toggleMuscle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const musclesContinue = () => { setTypeId(suggestedTypeId); setStep('type'); };

  const typeContinue = () => {
    const wt = WORKOUT_TYPES.find(t => t.id === typeId);
    if (!wt) return;
    const ex = pickExercise([...selected], typeId!, []);
    if (!ex) return;
    setCurrentExercise(ex);
    setPrescription(prescribe(ex, wt));
    setSetIndex(0);
    setStep('preview');
  };

  const previewReady = () => { setStep('live'); };

  const swapExercise = () => {
    const wt = WORKOUT_TYPES.find(t => t.id === typeId);
    if (!wt) return;
    const ex = pickExercise([...selected], typeId!, [...excludeIds, currentExercise?.id]);
    if (!ex) return;
    setExcludeIds(ids => [...ids, currentExercise?.id]);
    setCurrentExercise(ex);
    setPrescription(prescribe(ex, wt));
  };

  const liveDone = (setResult: any) => {
    setLastSetResult({ ...setResult, startedAt: Date.now() });
    setStep('feedback');
  };

  const logSet = useCallback((result: any) => {
    if (!result || result.repCount === 0) return;
    const peakVs = result.leftReps?.length && result.rightReps?.length
      ? result.leftReps.map((L: any, i: number) => ((L.peakV + (result.rightReps[i]?.peakV || L.peakV)) / 2))
      : result.reps?.map((r: any) => r.peakV) || [];
    const avgPeak = peakVs.length ? peakVs.reduce((a: number, b: number) => a + b, 0) / peakVs.length : 0;
    const maxPeak = peakVs.length ? Math.max(...peakVs) : 0;
    const metrics = { avgPeak, maxPeak, hasBilateral: false, imbalancePct: 0 };
    setSessionLog(log => {
      const existing = log.find((l: any) => l.exerciseId === currentExercise?.id);
      const newSet = { repCount: result.repCount, reps: result.reps, elapsedSec: result.elapsedSec, metrics };
      if (existing) {
        return log.map((l: any) => l.exerciseId === currentExercise?.id ? { ...l, sets: [...l.sets, newSet] } : l);
      }
      return [...log, { exerciseId: currentExercise?.id, prescription, sets: [newSet] }];
    });
  }, [currentExercise, prescription]);

  const feedbackContinue = () => { logSet(lastSetResult); setStep('rest'); };
  const feedbackSkipExercise = () => {
    logSet(lastSetResult);
    setExcludeIds(ids => [...ids, currentExercise?.id]);
    const wt = WORKOUT_TYPES.find(t => t.id === typeId);
    const ex = pickExercise([...selected], typeId!, [...excludeIds, currentExercise?.id]);
    if (!ex || !wt) { setStep('complete'); return; }
    setCurrentExercise(ex); setPrescription(prescribe(ex, wt)); setSetIndex(0); setStep('preview');
  };
  const feedbackRestart = () => setStep('preview');
  const feedbackComplete = () => { logSet(lastSetResult); setStep('complete'); };

  const restDone = () => {
    const nextIdx = setIndex + 1;
    if (nextIdx >= (prescription?.sets || 4)) { feedbackSkipExercise(); return; }
    setSetIndex(nextIdx); setStep('preview');
  };

  const durationMin = Math.max(1, Math.round((Date.now() - sessionStart) / 60000));

  switch (step) {
    case 'muscles':
      return <MuscleGroupPicker selected={selected} onToggle={toggleMuscle}
        onContinue={musclesContinue} onCancel={onComplete} insets={insets}/>;
    case 'type':
      return <WorkoutTypePicker selectedType={typeId} suggestedTypeId={suggestedTypeId}
        onPick={setTypeId} onContinue={typeContinue} onBack={() => setStep('muscles')} insets={insets}/>;
    case 'preview':
      return <ExercisePreview exercise={currentExercise} prescription={prescription}
        workoutType={workoutType} setIndex={setIndex} totalSets={prescription?.sets || 4}
        exerciseIndex={sessionLog.length} totalExercises={sessionLog.length + 1}
        onReady={previewReady} onSwap={swapExercise} onExit={onComplete} insets={insets}/>;
    case 'live':
      return <LiveSetScreen exercise={currentExercise} prescription={prescription}
        setIndex={setIndex} totalSets={prescription?.sets || 4}
        onDone={liveDone} onPause={() => setStep('preview')} insets={insets}/>;
    case 'feedback':
      return <SetFeedbackScreen exercise={currentExercise} setResult={lastSetResult}
        prescription={prescription} setIndex={setIndex} totalSets={prescription?.sets || 4}
        onContinue={feedbackContinue} onSkipExercise={feedbackSkipExercise}
        onCompleteWorkout={feedbackComplete} onRestart={feedbackRestart} insets={insets}/>;
    case 'rest':
      return <RestTimerScreen restSec={prescription?.restSec || 90}
        nextSetIndex={setIndex + 1} totalSets={prescription?.sets || 4}
        exercise={currentExercise} onDone={restDone} onSkip={restDone} insets={insets}/>;
    case 'complete':
      return <WorkoutCompleteScreen sessionLog={sessionLog}
        workoutType={workoutType || WORKOUT_TYPES[0]} selectedMuscles={[...selected]}
        durationMin={durationMin} onDone={onComplete} insets={insets}/>;
    default:
      return null;
  }
}

// ─── MuscleGroupPicker (muscle-picker.jsx) ────────────────────
function MuscleGroupPicker({ selected, onToggle, onContinue, onCancel, insets }: any) {
  const count = selected.size;
  const regions = [
    { label: 'Upper', ids: ['chest','back','shoulders'] },
    { label: 'Arms',  ids: ['biceps','triceps','forearms'] },
    { label: 'Legs',  ids: ['quads','hamstrings','glutes','calves'] },
    { label: 'Core',  ids: ['core'] },
  ];

  return (
    <View style={[fl.flex1, { backgroundColor: C.bg.base, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[fl.row, fl.between, fl.center, { padding: S.md, paddingHorizontal: S.xl, minHeight: 44 }]}>
        <Pressable onPress={onCancel} style={[fl.row, fl.center, { gap: 4 }]}>
          <Icon name="chevron" size={14} color={C.fg.secondary} style={{ transform: [{ rotate: '180deg' }] }} />
          <RNText style={[ty.body15, { color: C.fg.secondary }]}>Cancel</RNText>
        </Pressable>
        <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>Step 1 of 3</RNText>
        <View style={{ width: 50 }} />
      </View>

      {/* Title */}
      <View style={{ paddingHorizontal: S.xl, paddingBottom: S.xl }}>
        <RNText style={ty.display28}>What are you{'\n'}training today?</RNText>
        <RNText style={[ty.body15, { color: C.fg.tertiary, marginTop: S.sm }]}>
          Pick one or more muscle groups. We'll program the rest.
        </RNText>
      </View>

      <ScrollView style={fl.flex1} contentContainerStyle={{ paddingHorizontal: S.xl, paddingBottom: S.xl }}>
        {regions.map(region => (
          <View key={region.label} style={{ marginBottom: S.xl }}>
            <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>{region.label.toUpperCase()}</RNText>
            <View style={{ marginTop: S.sm, gap: S.sm }}>
              {region.ids.map(id => {
                const group = MUSCLE_GROUPS.find(g => g.id === id);
                if (!group) return null;
                const isOn = selected.has(id);
                return (
                  <Pressable key={id}
                    onPress={() => { haptics.selection(); onToggle(id); }}
                    style={[
                      st.muscleCard,
                      { backgroundColor: isOn ? C.accent.primary : C.bg.surface,
                        borderColor: isOn ? C.accent.primary : C.border.subtle },
                    ]}>
                    <RNText style={[ty.title17, { color: isOn ? C.bg.base : C.fg.primary }]}>
                      {group.label}
                    </RNText>
                    <View style={[st.checkCircle, {
                      backgroundColor: isOn ? C.bg.base : 'transparent',
                      borderColor: isOn ? C.bg.base : C.border.default,
                    }]}>
                      {isOn && <Icon name="check" size={11} color={C.accent.primary} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: 112 }}>
        <Button variant="primary" size="lg" full disabled={count === 0}
          onPress={() => { haptics.medium(); onContinue(); }}
          trailing={<Icon name="arrowRight" size={16} color={C.accent.onPrimary} />}>
          {count === 0 ? 'Select a muscle group' : count === 1 ? 'Continue' : `Continue · ${count} groups`}
        </Button>
      </View>
    </View>
  );
}

// ─── WorkoutTypePicker (workout-type-picker.jsx) ───────────────
function WorkoutTypePicker({ selectedType, suggestedTypeId, onPick, onContinue, onBack, insets }: any) {
  const suggested = WORKOUT_TYPES.find(t => t.id === suggestedTypeId);
  return (
    <View style={[fl.flex1, { backgroundColor: C.bg.base, paddingTop: insets.top }]}>
      <View style={[fl.row, fl.between, fl.center, { padding: S.md, paddingHorizontal: S.xl, minHeight: 44 }]}>
        <Pressable onPress={onBack} style={[fl.row, fl.center, { gap: 4 }]}>
          <Icon name="chevron" size={14} color={C.fg.secondary} style={{ transform: [{ rotate: '180deg' }] }} />
          <RNText style={[ty.body15, { color: C.fg.secondary }]}>Back</RNText>
        </Pressable>
        <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>Step 2 of 3</RNText>
        <View style={{ width: 50 }} />
      </View>

      <View style={{ paddingHorizontal: S.xl, paddingBottom: S.xl }}>
        <RNText style={ty.display28}>Pick a style.</RNText>
        <RNText style={[ty.body15, { color: C.fg.tertiary, marginTop: S.sm }]}>
          Based on your goals, we suggest{' '}
          <RNText style={{ color: C.accent.primary }}>{suggested?.label}</RNText>.
        </RNText>
      </View>

      <ScrollView style={fl.flex1} contentContainerStyle={{ paddingHorizontal: S.xl, paddingBottom: S.xl }}>
        {WORKOUT_TYPES.map(type => {
          const isActive = selectedType === type.id;
          const isSuggested = suggestedTypeId === type.id;
          const zoneColor = (C.velocity as any)[type.velocityZone] || C.accent.primary;
          return (
            <Pressable key={type.id} onPress={() => { haptics.selection(); onPick(type.id); }}
              style={[st.typeCard, { backgroundColor: isActive ? C.bg.elevated : C.bg.surface, borderColor: isActive ? C.accent.primary : C.border.subtle }]}>
              <View style={[fl.row, fl.between, { gap: S.md }]}>
                <View style={fl.flex1}>
                  <View style={[fl.row, fl.center, { gap: S.sm, marginBottom: 4 }]}>
                    <RNText style={ty.title20}>{type.label}</RNText>
                    {isSuggested && (
                      <View style={st.forYouBadge}>
                        <RNText style={st.forYouText}>FOR YOU</RNText>
                      </View>
                    )}
                  </View>
                  <RNText style={[ty.body13, { color: C.fg.secondary }]}>{type.subtitle}</RNText>
                  <View style={[fl.row, { gap: S.md, flexWrap: 'wrap', marginTop: S.md }]}>
                    <TypeStat label="SETS × REPS" value={`${type.sets} × ${type.reps}`} />
                    <TypeStat label="REST" value={`${type.restSec}s`} />
                    <TypeStat label="LOAD" value={`${Math.round(type.intensity * 100)}% 1RM`} />
                  </View>
                  <View style={[fl.row, fl.center, { gap: S.sm, marginTop: S.md }]}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: zoneColor }} />
                    <RNText style={[ty.body13, { color: C.fg.tertiary }]}>
                      Target ≈ {type.targetVelocity.toFixed(2)} m/s · {type.velocityZone}
                    </RNText>
                  </View>
                </View>
                <View style={[st.radioCircle, { borderColor: isActive ? C.accent.primary : C.border.default, backgroundColor: isActive ? C.accent.primary : 'transparent' }]}>
                  {isActive && <Icon name="check" size={12} color={C.bg.base} />}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: 112 }}>
        <Button variant="primary" size="lg" full disabled={!selectedType}
          onPress={() => { haptics.medium(); onContinue(); }}
          trailing={<Icon name="arrowRight" size={16} color={C.accent.onPrimary} />}>
          Generate workout
        </Button>
      </View>
    </View>
  );
}

function TypeStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <RNText style={ty.monoLabel9}>{label}</RNText>
      <RNText style={[ty.body16, { marginTop: 2, color: C.fg.primary }]}>{value}</RNText>
    </View>
  );
}

// ─── ExercisePreview (workout-type-picker.jsx — ExercisePreview) ──
function ExercisePreview({ exercise, prescription, workoutType, setIndex, totalSets,
  exerciseIndex, totalExercises, onReady, onSwap, onExit, insets }: any) {
  const { units } = useUnits();
  const guide = getGuideForExercise(exercise);
  const [execOpen, setExecOpen] = useState(true);
  const weightDisp = prescription?.loadKg > 0
    ? `${Math.round(fromKg(prescription.loadKg, units as UnitSystem))} ${unitLabel(units as UnitSystem)}`
    : 'Bodyweight';
  const targetMuscles = exercise?.muscles
    ?.map((id: string) => MUSCLE_GROUPS.find(g => g.id === id)?.label || id) || [];
  const isFirstSet = setIndex === 0;

  if (!exercise) return null;

  return (
    <View style={[fl.flex1, { backgroundColor: C.bg.base, paddingTop: insets.top }]}>
      <View style={[fl.row, fl.between, fl.center, { padding: S.md, paddingHorizontal: S.xl }]}>
        <Pressable onPress={onExit} style={[fl.row, fl.center, { gap: 4 }]}>
          <Icon name="close" size={14} color={C.fg.secondary} />
          <RNText style={[ty.body15, { color: C.fg.secondary }]}>Exit</RNText>
        </Pressable>
        <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>
          Exercise {exerciseIndex + 1} · Set {setIndex + 1} of {totalSets}
        </RNText>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={fl.flex1} contentContainerStyle={{ paddingBottom: 160 }}>
        {/* Hero placeholder */}
        <View style={[st.hero, { marginHorizontal: S.xl }]}>
          <Icon name="dumbbell" size={48} color={C.fg.tertiary} />
          <View style={st.heroBadge}>
            <RNText style={ty.monoLabel9}>FORM DEMO · LOOPING</RNText>
          </View>
        </View>

        <View style={{ paddingHorizontal: S.xl, marginTop: S.lg }}>
          <RNText style={ty.display28}>{exercise.name}</RNText>
          <View style={[fl.row, { flexWrap: 'wrap', gap: S.xs, marginTop: S.sm }]}>
            {targetMuscles.map((m: string, i: number) => (
              <View key={m} style={[st.muscleTag, {
                backgroundColor: i === 0 ? C.accent.primary + '22' : C.bg.elevated,
                borderColor: i === 0 ? C.accent.primary + '44' : C.border.subtle,
              }]}>
                <RNText style={[ty.monoLabel10, { color: i === 0 ? C.accent.primary : C.fg.secondary }]}>{m}</RNText>
              </View>
            ))}
          </View>
        </View>

        {/* Prescription card */}
        <View style={[st.card, { marginHorizontal: S.xl, marginTop: S.lg }]}>
          <View style={[fl.row, { gap: S.md }]}>
            <PresStat label="SETS" value={String(prescription?.sets || '—')} highlight={isFirstSet} />
            <PresStat label="REPS" value={String(prescription?.reps || '—')} />
            <PresStat label="LOAD" value={weightDisp.split(' ')[0]} unit={weightDisp.includes(' ') ? weightDisp.split(' ')[1] : ''} />
          </View>
          <View style={[st.divTop, fl.row, fl.center, { gap: S.sm, marginTop: S.lg, paddingTop: S.md }]}>
            <View style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: C.velocity?.power || C.accent.primary }} />
            <RNText style={[ty.body13, { color: C.fg.secondary }]}>
              Target velocity ≈ <RNText style={[ty.mono13, { color: C.fg.primary }]}>
                {prescription?.targetVelocity?.toFixed(2)} m/s
              </RNText>
            </RNText>
          </View>
        </View>

        {/* Why picked */}
        {isFirstSet && exercise.why && (
          <View style={{ paddingHorizontal: S.xl, marginTop: S.lg }}>
            <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>WHY THIS EXERCISE</RNText>
            <RNText style={[ty.body15, { color: C.fg.secondary, marginTop: S.sm }]}>{exercise.why}</RNText>
          </View>
        )}

        {/* Setup section */}
        {guide.setup.length > 0 && (
          <View style={{ paddingHorizontal: S.xl, marginTop: S.xl }}>
            <View style={[fl.row, fl.center, { gap: S.sm, marginBottom: S.sm }]}>
              <View style={st.duoBadge}><RNText style={st.duoBadgeText}>DUO</RNText></View>
              <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>SET UP</RNText>
            </View>
            <View style={st.guideCard}>
              {guide.setup.map((line: string, i: number) => (
                <DirectionRow key={i} index={i + 1} total={guide.setup.length} text={line} accentColor={C.accent.primary} numbered={false} />
              ))}
            </View>
          </View>
        )}

        {/* Execution section */}
        {guide.execution.length > 0 && (
          <View style={{ paddingHorizontal: S.xl, marginTop: S.lg }}>
            <Pressable onPress={() => { haptics.selection(); setExecOpen(v => !v); }}
              style={[fl.row, fl.between, fl.center, { marginBottom: S.sm }]}>
              <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>HOW TO PERFORM</RNText>
              <Icon name="chevron" size={12} color={C.fg.tertiary}
                style={{ transform: [{ rotate: execOpen ? '90deg' : '0deg' }] }} />
            </Pressable>
            {execOpen && (
              <View style={st.guideCard}>
                {guide.execution.map((line: string, i: number) => (
                  <DirectionRow key={i} index={i + 1} total={guide.execution.length} text={line} numbered />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={st.stickyBottom}>
        <Button variant="primary" size="lg" full
          onPress={() => { haptics.medium(); onReady(); }}
          trailing={<Icon name="arrowRight" size={16} color={C.accent.onPrimary} />}>
          {isFirstSet ? 'Ready' : `Start set ${setIndex + 1}`}
        </Button>
        {isFirstSet && (
          <Pressable onPress={onSwap} style={{ marginTop: S.md, alignItems: 'center', padding: S.sm }}>
            <RNText style={[ty.body14, { color: C.fg.tertiary }]}>Swap for different exercise</RNText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function PresStat({ label, value, unit, highlight }: any) {
  return (
    <View style={fl.flex1}>
      <RNText style={ty.monoLabel9}>{label}</RNText>
      <View style={[fl.row, fl.center, { gap: 4, marginTop: 4, alignItems: 'flex-end' }]}>
        <RNText style={[ty.display32, { color: highlight ? C.accent.primary : C.fg.primary }]}>{value}</RNText>
        {unit ? <RNText style={[ty.mono11, { color: C.fg.tertiary, paddingBottom: 4 }]}>{unit}</RNText> : null}
      </View>
    </View>
  );
}

function DirectionRow({ index, total, text, accentColor, numbered }: any) {
  const isLast = index === total;
  return (
    <View style={[fl.row, { gap: S.md, paddingBottom: isLast ? 0 : S.md, marginBottom: isLast ? 0 : S.md,
      borderBottomWidth: isLast ? 0 : 1, borderBottomColor: C.border.subtle }]}>
      <View style={[st.dirNum, {
        backgroundColor: numbered ? C.bg.elevated : (accentColor + '22'),
        borderColor: numbered ? C.border.subtle : (accentColor + '44'),
      }]}>
        <RNText style={[ty.monoLabel10, { color: numbered ? C.fg.secondary : accentColor }]}>{index}</RNText>
      </View>
      <RNText style={[ty.body15, { color: C.fg.secondary, flex: 1, lineHeight: 22 }]}>{text}</RNText>
    </View>
  );
}

// ─── LiveSetScreen (live-set-screen.jsx) ─────────────────────
function LiveSetScreen({ exercise, prescription, setIndex, totalSets, onDone, onPause, insets }: any) {
  const stream = useMockVelocityStream(true, prescription?.targetVelocity || 0.7);
  const { reps, leftReps, rightReps, latest } = stream;
  const repCount = Math.max(leftReps.length, rightReps.length, reps.length);
  const targetReps = prescription?.reps || 5;
  const progress = Math.min(1, repCount / targetReps);
  const atTarget = repCount >= targetReps;

  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const prevCount = useRef(0);
  useEffect(() => {
    if (repCount > prevCount.current) haptics.light();
    if (repCount === targetReps) haptics.success();
    prevCount.current = repCount;
  }, [repCount, targetReps]);

  const lastV = latest?.peakV || 0;
  const zone = lastV > 0 ? zoneFor(lastV) : null;
  const mm = Math.floor(elapsedSec / 60);
  const ss = elapsedSec % 60;
  const timeStr = `${mm}:${ss.toString().padStart(2, '0')}`;

  const size = 240, stroke = 6, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - progress);

  const ticks = [];
  for (let i = 0; i < targetReps; i++) {
    const angle = -Math.PI / 2 + (i / targetReps) * Math.PI * 2;
    ticks.push({ x: size / 2 + Math.cos(angle) * (r - 18), y: size / 2 + Math.sin(angle) * (r - 18), active: i < repCount });
  }

  return (
    <View style={[fl.flex1, { backgroundColor: C.bg.base, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[fl.row, fl.between, fl.center, { padding: S.md, paddingHorizontal: S.xl }]}>
        <Pressable onPress={() => { haptics.light(); onPause(); }} style={[fl.row, fl.center, { gap: 6 }]}>
          <Icon name="pause" size={12} color={C.fg.secondary} />
          <RNText style={[ty.body14, { color: C.fg.secondary }]}>Pause</RNText>
        </Pressable>
        <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>Set {setIndex + 1} of {totalSets}</RNText>
        <RNText style={[ty.mono13, { color: C.fg.secondary }]}>{timeStr}</RNText>
      </View>

      {/* Exercise name */}
      <View style={[fl.row, fl.center, { padding: S.md, paddingHorizontal: S.xl, justifyContent: 'center', gap: S.md }]}>
        <RNText style={[ty.title17, { color: C.fg.secondary }]}>{exercise?.name}</RNText>
      </View>

      {/* Rep counter ring */}
      <View style={[fl.flex1, fl.center, { alignItems: 'center' }]}>
        <View style={{ position: 'relative', width: size, height: size }}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
            <SvgCircle cx={size / 2} cy={size / 2} r={r} stroke={C.border.subtle} strokeWidth={stroke} fill="none" />
            <SvgCircle cx={size / 2} cy={size / 2} r={r}
              stroke={atTarget ? C.semantic.success : C.accent.primary}
              strokeWidth={stroke} fill="none" strokeLinecap="round"
              strokeDasharray={`${circ}`} strokeDashoffset={dashOffset} />
          </Svg>
          {ticks.map((t, i) => (
            <View key={i} style={[st.tick, {
              left: t.x - 2, top: t.y - 2,
              backgroundColor: t.active ? (atTarget ? C.semantic.success : C.accent.primary) : C.border.default,
            }]} />
          ))}
          <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
            <RNText style={[ty.display112, { color: atTarget ? C.semantic.success : C.fg.primary }]}>{repCount}</RNText>
            <RNText style={[ty.cap11, { color: C.fg.tertiary, marginTop: 4 }]}>of {targetReps} reps</RNText>
          </View>
        </View>

        {/* Live velocity chip */}
        <View style={[st.velChip, { marginTop: S.xl }]}>
          {zone ? (
            <>
              <View style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: zone.color }} />
              <RNText style={[ty.mono13, { color: C.fg.primary, fontWeight: '600' }]}>{lastV.toFixed(2)} m/s</RNText>
              <RNText style={[ty.monoLabel9, { color: C.fg.tertiary }]}>{zone.label.toUpperCase()}</RNText>
            </>
          ) : (
            <RNText style={[ty.body13, { color: C.fg.tertiary }]}>Waiting for first rep…</RNText>
          )}
        </View>

        <RNText style={[ty.cap11, { color: C.fg.tertiary, marginTop: S.md }]}>
          Target ≈ {prescription?.targetVelocity?.toFixed(2)} m/s
        </RNText>
      </View>

      {/* Done CTA */}
      <View style={{ paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: 112 }}>
        <Button variant={atTarget ? 'primary' : 'ghost'} size="lg" full
          onPress={() => { haptics.medium(); onDone({ repCount, reps, leftReps, rightReps, elapsedSec }); }}
          trailing={<Icon name="arrowRight" size={16} color={atTarget ? C.accent.onPrimary : C.fg.primary} />}>
          {atTarget ? 'Complete set' : `Done · ${repCount} rep${repCount !== 1 ? 's' : ''}`}
        </Button>
        {repCount === 0 && (
          <RNText style={[ty.cap11, { color: C.fg.tertiary, textAlign: 'center', marginTop: S.md }]}>
            Tap done to skip without logging
          </RNText>
        )}
      </View>
    </View>
  );
}

// ─── BarPathCard helpers ─────────────────────────────────────────
function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  return Math.abs(h);
}
function mulberry32(seed: number) {
  let s = seed;
  return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function buildBarPaths(exercise: any, metrics: any) {
  const W = 300, H = 170, padX = 30, padY = 16;
  const innerW = W - 2 * padX, innerH = H - 2 * padY, cx = W / 2;
  const id = exercise?.id || '';
  const family =
    ['bench-press','db-bench','incline-db-press'].includes(id) ? 'bench' :
    ['overhead-press','db-shoulder-press'].includes(id) ? 'press' :
    ['back-squat','goblet-squat','leg-press','bulgarian-split'].includes(id) ? 'squat' :
    ['deadlift','romanian-dl','hip-thrust'].includes(id) ? 'deadlift' :
    ['cable-row','tricep-pushdown'].includes(id) ? 'row' : 'vertical';
  const steps = 40;
  const ideal: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = (H - padY) - innerH * (0.5 - 0.5 * Math.cos(t * Math.PI * 2));
    let x = cx;
    if (family === 'press') x = cx - innerW * 0.02 * Math.sin(t * Math.PI * 2);
    else if (family === 'deadlift') x = cx + innerW * 0.01 * Math.sin(t * Math.PI);
    else if (family === 'row') x = cx - innerW * 0.22 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2));
    ideal.push({ x, y });
  }
  const reps = Math.max(1, metrics.repCount);
  const velOff = Math.abs((metrics.avgPeak || 0) - 0.6) / 0.6;
  const offness = Math.min(0.85, 0.18 + Math.max(0, (5 - reps) / 5) * 0.4 + velOff * 0.3);
  const seed = hashString(id + ':' + reps);
  const rand = mulberry32(seed);
  const drift = (rand() - 0.5) * innerW * 0.15;
  const actual = ideal.map((p, i) => {
    const t = i / steps;
    const wobble = Math.sin(t * Math.PI * 4 + seed * 0.01) * innerW * 0.04 * offness;
    const jitter = (rand() - 0.5) * innerW * 0.02 * offness;
    return { x: p.x + wobble + jitter + drift * (0.5 - 0.5 * Math.cos(t * Math.PI * 2)), y: p.y + (rand() - 0.5) * 1.5 };
  });
  let maxDrift = 0;
  ideal.forEach((p, i) => { const d = Math.hypot(actual[i].x - p.x, actual[i].y - p.y); if (d > maxDrift) maxDrift = d; });
  const avgDrift = actual.reduce((s, p, i) => s + Math.hypot(p.x - ideal[i].x, p.y - ideal[i].y), 0) / ideal.length;
  const match = Math.max(0.35, 1 - avgDrift / (innerW * 0.3));
  const toD = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const verdict = match >= 0.85 ? 'Clean path — bar tracked the ideal line.' : match >= 0.70 ? 'Minor drift — within acceptable range.' : 'Noticeable deviation — check bar path consistency.';
  return { idealD: toD(ideal), actualD: toD(actual), match, maxDrift: maxDrift * 0.6, verdict, start: ideal[0], end: ideal[ideal.length - 1] };
}

function BarPathCard({ exercise, metrics }: any) {
  const [front, setFront] = useState<'actual' | 'ideal'>('actual');
  const paths = useMemo(() => buildBarPaths(exercise, metrics), [exercise, metrics]);
  const matchPct = Math.round(paths.match * 100);
  const matchColor = matchPct >= 85 ? C.semantic.success : matchPct >= 70 ? C.accent.primary : C.semantic.warning;
  const W = 300, H = 170, padX = 30, padY = 16;
  return (
    <View style={st.card}>
      <View style={[{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: S.md }]}>
        <View>
          <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>Bar path vs ideal</RNText>
          <RNText style={[ty.body13, { color: C.fg.secondary, marginTop: 2 }]}>{paths.verdict}</RNText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: matchColor + '1f', borderWidth: 1, borderColor: matchColor + '55' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: matchColor }} />
          <RNText style={[ty.mono11, { fontWeight: '700', color: matchColor }]}>{matchPct}%</RNText>
          <RNText style={[ty.monoLabel9, { color: matchColor }]}>MATCH</RNText>
        </View>
      </View>
      <Pressable onPress={() => { haptics.selection(); setFront(f => f === 'actual' ? 'ideal' : 'actual'); }}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {[0.25, 0.5, 0.75].map(r => (
            <SvgLine key={r} x1={padX} x2={W - padX} y1={padY + (H - 2 * padY) * r} y2={padY + (H - 2 * padY) * r} stroke={C.border.subtle} strokeWidth={1} strokeDasharray="2,4" />
          ))}
          {front === 'actual' ? (
            <>
              <SvgPath d={paths.idealD} stroke={C.fg.tertiary} strokeWidth={2} strokeDasharray="5,4" fill="none" strokeLinecap="round" opacity={0.55} />
              <SvgPath d={paths.actualD} stroke={C.accent.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : (
            <>
              <SvgPath d={paths.actualD} stroke={C.accent.primary} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.4} />
              <SvgPath d={paths.idealD} stroke={C.fg.primary} strokeWidth={2.5} strokeDasharray="6,5" fill="none" strokeLinecap="round" />
            </>
          )}
          <SvgCircle cx={paths.start.x} cy={paths.start.y} r={3.5} fill={C.bg.base} stroke={front === 'ideal' ? C.fg.primary : C.fg.tertiary} strokeWidth={1.5} />
          <SvgCircle cx={paths.end.x} cy={paths.end.y} r={3.5} fill={front === 'actual' ? C.accent.primary : C.fg.primary} />
          <SvgText x={padX - 6} y={padY + 4} fontFamily="JetBrainsMono_400Regular" fontSize="9" fontWeight="700" letterSpacing="0.08" fill={C.fg.tertiary} textAnchor="end">TOP</SvgText>
          <SvgText x={padX - 6} y={H - padY} fontFamily="JetBrainsMono_400Regular" fontSize="9" fontWeight="700" letterSpacing="0.08" fill={C.fg.tertiary} textAnchor="end">BOT</SvgText>
          <SvgText x={W - padX} y={padY + 8} fontFamily="JetBrainsMono_400Regular" fontSize="8" fontWeight="700" letterSpacing="0.1" fill={C.fg.tertiary} textAnchor="end" opacity={0.6}>TAP TO SWAP</SvgText>
        </Svg>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: S.lg, marginTop: S.sm, alignItems: 'center' }}>
        <Pressable onPress={() => setFront('actual')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 16, height: 2.5, borderRadius: 2, backgroundColor: front === 'actual' ? C.accent.primary : C.fg.tertiary }} />
          <RNText style={[ty.cap11, { color: front === 'actual' ? C.fg.primary : C.fg.tertiary }]}>Actual</RNText>
        </Pressable>
        <Pressable onPress={() => setFront('ideal')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 16, height: 2, borderRadius: 2, borderWidth: 1, borderColor: front === 'ideal' ? C.fg.primary : C.fg.tertiary, borderStyle: 'dashed' }} />
          <RNText style={[ty.cap11, { color: front === 'ideal' ? C.fg.primary : C.fg.tertiary }]}>Ideal</RNText>
        </Pressable>
      </View>
    </View>
  );
}

// ─── SetFeedbackScreen (post-set-feedback.jsx) ─────────────────
function SetFeedbackScreen({ exercise, setResult, prescription, setIndex, totalSets,
  onContinue, onSkipExercise, onCompleteWorkout, onRestart, insets }: any) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const metrics = useMemo(() => {
    if (!setResult) return { repCount: 0, avgPeak: 0, maxPeak: 0, velocityLoss: 0, peakVs: [], hasBilateral: false, imbalancePct: 0, dominantSide: null, tempo: 0 };
    const { reps = [], leftReps = [], rightReps = [], elapsedSec = 0, repCount = 0 } = setResult;
    const hasBilateral = leftReps.length > 0 && rightReps.length > 0;
    const peakVs = hasBilateral
      ? leftReps.map((L: any, i: number) => ((L.peakV + (rightReps[i]?.peakV || L.peakV)) / 2))
      : reps.map((r: any) => r.peakV);
    const avgPeak = peakVs.length ? peakVs.reduce((a: number, b: number) => a + b, 0) / peakVs.length : 0;
    const maxPeak = peakVs.length ? Math.max(...peakVs) : 0;
    const minPeak = peakVs.length ? Math.min(...peakVs) : 0;
    const velocityLoss = maxPeak > 0 ? ((maxPeak - minPeak) / maxPeak) * 100 : 0;
    let leftAvg = 0, rightAvg = 0, imbalancePct = 0, dominantSide = null;
    if (hasBilateral) {
      leftAvg = leftReps.reduce((a: number, r: any) => a + r.peakV, 0) / leftReps.length;
      rightAvg = rightReps.reduce((a: number, r: any) => a + r.peakV, 0) / rightReps.length;
      const mean = (leftAvg + rightAvg) / 2;
      imbalancePct = mean > 0 ? (Math.abs(leftAvg - rightAvg) / mean) * 100 : 0;
      dominantSide = leftAvg > rightAvg ? 'left' : 'right';
    }
    const tempo = repCount > 0 ? elapsedSec / repCount : 0;
    return { repCount, avgPeak, maxPeak, velocityLoss, peakVs, hasBilateral, leftAvg, rightAvg, imbalancePct, dominantSide, tempo };
  }, [setResult]);

  const score = useMemo(() => {
    let s = 1;
    if (metrics.repCount < (prescription?.reps || 5)) s -= 0.15 * (1 - metrics.repCount / (prescription?.reps || 5));
    const velDelta = Math.abs(metrics.avgPeak - (prescription?.targetVelocity || 0.7)) / (prescription?.targetVelocity || 0.7);
    s -= Math.min(0.3, velDelta);
    if (metrics.imbalancePct > 5) s -= Math.min(0.2, (metrics.imbalancePct - 5) / 100);
    return Math.max(0.2, s);
  }, [metrics, prescription]);

  const headline = metrics.repCount === 0 ? 'No reps logged'
    : metrics.repCount >= (prescription?.reps || 5)
      ? score > 0.85 ? 'Dialed in.' : metrics.imbalancePct > 8 ? 'Solid set — one thing to watch.' : 'Set complete.'
    : `${metrics.repCount} of ${prescription?.reps || 5} reps logged.`;

  const encouragement = metrics.repCount === 0 ? 'No worries — skip or try again.'
    : metrics.avgPeak >= (prescription?.targetVelocity || 0.7) * 0.98 && metrics.imbalancePct < 5
      ? 'Velocity is right on target and both sides are balanced. Rest and repeat.'
    : metrics.avgPeak >= (prescription?.targetVelocity || 0.7)
      ? 'Bar speed was strong — you had more in the tank on that one.'
    : metrics.avgPeak < (prescription?.targetVelocity || 0.7) * 0.85
      ? 'A bit slow vs target — fatigue or load could be heavier than programmed.'
    : 'Nice work. A few small things the tracker picked up — tap below to see.';

  const cues = useMemo(() => {
    const out: any[] = [];
    if (metrics.avgPeak > 0) {
      const delta = metrics.avgPeak - (prescription?.targetVelocity || 0.7);
      const pct = Math.abs(delta / (prescription?.targetVelocity || 0.7) * 100);
      const accent = Math.abs(delta) < (prescription?.targetVelocity || 0.7) * 0.08 ? C.semantic.success : delta > 0 ? C.accent.primary : C.semantic.warning;
      out.push({ id: 'velocity', icon: 'bolt', accent, title: `Avg bar speed · ${metrics.avgPeak.toFixed(2)} m/s`, short: delta >= 0 ? `+${pct.toFixed(0)}% above target` : `−${pct.toFixed(0)}% below target`,
        detail: delta > (prescription?.targetVelocity || 0.7) * 0.08 ? 'Bar is moving faster than programmed. Next set, try +2.5 kg to land in the zone.'
          : delta < -(prescription?.targetVelocity || 0.7) * 0.08 ? "Slower than target — that's more hypertrophy than power today. Hold load, slow the eccentric."
          : 'Locked in the prescribed zone. Keep the same load and intent.' });
    }
    if (metrics.peakVs.length >= 3) {
      const loss = metrics.velocityLoss;
      const accent = loss > 30 ? C.semantic.warning : loss > 15 ? C.accent.primary : C.semantic.success;
      out.push({ id: 'fatigue', icon: 'history', accent, title: `Velocity loss · ${loss.toFixed(0)}%`, short: loss > 25 ? 'High fatigue' : loss > 12 ? 'Normal decay' : 'Low fatigue',
        detail: loss > 30 ? 'Big velocity drop — bar slowed significantly. Consider dropping 2.5 kg and ending sets with a rep or two left.'
          : loss > 15 ? "Healthy velocity decay across the set. You're working in the right range."
          : 'Minimal velocity loss — you could have pushed more reps or added weight.' });
    }
    if (metrics.hasBilateral) {
      const severe = metrics.imbalancePct > 8, mild = metrics.imbalancePct > 4;
      const accent = severe ? C.semantic.warning : mild ? C.accent.primary : C.semantic.success;
      const weakSide = metrics.dominantSide === 'left' ? 'right' : 'left';
      out.push({ id: 'bilateral', icon: 'bolt', accent,
        title: `Bilateral · ${metrics.imbalancePct.toFixed(0)}% imbalance`,
        short: severe ? `${weakSide[0].toUpperCase()}${weakSide.slice(1)} side ${metrics.imbalancePct.toFixed(0)}% weaker` : mild ? 'Minor asymmetry detected' : 'Left-right balanced',
        detail: severe ? `${weakSide[0].toUpperCase()}${weakSide.slice(1)} side is lagging. Focus on unilateral accessories and ensure the weaker side leads in split movements.`
          : mild ? 'Small imbalance is normal under fatigue. Watch the trend over multiple sessions.'
          : 'Both sides contributing evenly. Keep up the bilateral tracking.' });
    }
    if (metrics.tempo > 0 && metrics.repCount >= 3) {
      const slow = metrics.tempo > 5, fast = metrics.tempo < 2;
      out.push({ id: 'tempo', icon: 'bolt',
        accent: slow ? C.accent.primary : fast ? C.semantic.warning : C.semantic.success,
        title: `Tempo · ${metrics.tempo.toFixed(1)}s per rep`,
        short: slow ? 'Controlled' : fast ? 'Rushed' : 'On tempo',
        detail: fast ? 'Reps were quick — you\'re likely bouncing out of the bottom. Slow the eccentric (2-3s down) for better muscle tension.'
          : slow ? 'Deliberate pace — good for hypertrophy and control. Keep it up.'
          : 'Tempo is balanced. Consistent cadence is a strong sign of good form under load.' });
    }
    return out;
  }, [metrics, prescription]);

  const scoreColor = score > 0.85 ? C.semantic.success : score > 0.65 ? C.accent.primary : C.semantic.warning;
  const scoreLetter = score > 0.9 ? 'A' : score > 0.8 ? 'B' : score > 0.65 ? 'C' : 'D';

  return (
    <View style={[fl.flex1, { backgroundColor: C.bg.base, paddingTop: insets.top }]}>
      <View style={[fl.row, fl.between, fl.center, { padding: S.md, paddingHorizontal: S.xl }]}>
        <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>{exercise?.name} · Set {setIndex + 1} of {totalSets}</RNText>
        <View style={[st.scoreBadge, { backgroundColor: scoreColor + '22', borderColor: scoreColor + '44' }]}>
          <RNText style={[ty.body14, { fontWeight: '600', color: scoreColor }]}>{scoreLetter}</RNText>
          <RNText style={[ty.monoLabel9, { color: C.fg.tertiary }]}>SET GRADE</RNText>
        </View>
      </View>

      <ScrollView style={fl.flex1} contentContainerStyle={{ paddingBottom: 200 }}>
        <View style={{ paddingHorizontal: S.xl, paddingTop: S.lg }}>
          <RNText style={ty.display28}>{headline}</RNText>
          <RNText style={[ty.body15, { color: C.fg.secondary, marginTop: S.sm }]}>{encouragement}</RNText>
        </View>

        {/* Bar path vs ideal */}
        {metrics.repCount > 0 && (
          <View style={{ paddingHorizontal: S.xl, marginTop: S.xl }}>
            <BarPathCard exercise={exercise} metrics={metrics} />
          </View>
        )}

        {/* Stats card */}
        <View style={[st.card, { marginHorizontal: S.xl, marginTop: S.xl }]}>
          <View style={[fl.row, { gap: S.md }]}>
            <FeedbackStat label="REPS" value={String(metrics.repCount)} unit={`/${prescription?.reps || 5}`} />
            <FeedbackStat label="AVG VEL" value={metrics.avgPeak.toFixed(2)} unit="m/s" />
            <FeedbackStat label="PEAK" value={metrics.maxPeak.toFixed(2)} unit="m/s" />
          </View>
        </View>

        {/* Cues */}
        {cues.length > 0 && (
          <View style={{ paddingHorizontal: S.xl, marginTop: S.xl }}>
            <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>DUO PICKED UP</RNText>
            <View style={{ marginTop: S.sm, gap: S.sm }}>
              {cues.map(cue => (
                <Pressable key={cue.id} onPress={() => { haptics.light(); setExpandedCard(expandedCard === cue.id ? null : cue.id); }}
                  style={[st.cueCard]}>
                  <View style={[fl.row, fl.center, { gap: S.md }]}>
                    <View style={[st.cueIcon, { backgroundColor: cue.accent + '22' }]}>
                      <Icon name={cue.icon as any} size={14} color={cue.accent} />
                    </View>
                    <View style={fl.flex1}>
                      <RNText style={[ty.body15, { fontWeight: '500' }]}>{cue.title}</RNText>
                      <RNText style={[ty.body13, { color: C.fg.tertiary, marginTop: 2 }]}>{cue.short}</RNText>
                    </View>
                    <Icon name="chevron" size={12} color={C.fg.tertiary}
                      style={{ transform: [{ rotate: expandedCard === cue.id ? '90deg' : '0deg' }] }} />
                  </View>
                  {expandedCard === cue.id && (
                    <View style={[st.divTop, { marginTop: S.md, paddingTop: S.md }]}>
                      <RNText style={[ty.body15, { color: C.fg.secondary }]}>{cue.detail}</RNText>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* CTAs */}
      <View style={st.stickyBottom}>
        {metrics.repCount === 0 ? (
          <View style={{ gap: S.sm }}>
            <Button variant="primary" size="lg" full onPress={onRestart}>Try again</Button>
            <Button variant="ghost" size="lg" full onPress={onSkipExercise}>Pick a different exercise</Button>
          </View>
        ) : setIndex + 1 < totalSets ? (
          <View style={{ gap: S.sm }}>
            <Button variant="primary" size="lg" full onPress={() => { haptics.medium(); onContinue(); }}
              trailing={<Icon name="arrowRight" size={16} color={C.accent.onPrimary} />}>
              Rest, then set {setIndex + 2}
            </Button>
            <View style={[fl.row, { gap: S.sm }]}>
              <Pressable onPress={onSkipExercise} style={[st.smallBtn, fl.flex1]}>
                <RNText style={[ty.body13, { color: C.fg.secondary }]}>Skip exercise</RNText>
              </Pressable>
              <Pressable onPress={onCompleteWorkout} style={[st.smallBtn, fl.flex1]}>
                <RNText style={[ty.body13, { color: C.fg.secondary }]}>Complete workout</RNText>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ gap: S.sm }}>
            <Button variant="primary" size="lg" full onPress={onSkipExercise}
              trailing={<Icon name="arrowRight" size={16} color={C.accent.onPrimary} />}>
              Next exercise
            </Button>
            <Button variant="ghost" size="md" full onPress={onCompleteWorkout}>End workout here</Button>
          </View>
        )}
      </View>
    </View>
  );
}

function FeedbackStat({ label, value, unit }: any) {
  return (
    <View style={fl.flex1}>
      <RNText style={ty.monoLabel9}>{label}</RNText>
      <View style={[fl.row, { alignItems: 'flex-end', gap: 3, marginTop: 4 }]}>
        <RNText style={[ty.display26, { color: C.fg.primary }]}>{value}</RNText>
        {unit && <RNText style={[ty.mono10, { color: C.fg.tertiary, paddingBottom: 3 }]}>{unit}</RNText>}
      </View>
    </View>
  );
}

// ─── RestTimerScreen (rest-timer.jsx) ─────────────────────────
function RestTimerScreen({ restSec, nextSetIndex, totalSets, exercise, onDone, onSkip, insets }: any) {
  const [remaining, setRemaining] = useState(restSec);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) { haptics.medium(); onDone(); return; }
    if (remaining === 10) haptics.light();
    const t = setTimeout(() => setRemaining((r: number) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, paused]);

  const progress = 1 - (remaining / restSec);
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const timeStr = mm > 0 ? `${mm}:${ss.toString().padStart(2, '0')}` : String(ss);

  const size = 260, stroke = 4, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const isUrgent = remaining <= 10 && remaining > 0;

  return (
    <View style={[fl.flex1, { backgroundColor: C.bg.base, paddingTop: insets.top }]}>
      <View style={[fl.row, fl.between, fl.center, { padding: S.md, paddingHorizontal: S.xl }]}>
        <View style={{ width: 50 }} />
        <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>Rest</RNText>
        <Pressable onPress={() => { haptics.light(); onSkip(); }}>
          <RNText style={[ty.body14, { color: C.fg.secondary }]}>Skip</RNText>
        </Pressable>
      </View>

      <View style={[fl.flex1, fl.center, { alignItems: 'center', gap: S.xl }]}>
        {/* Ring */}
        <View style={{ position: 'relative', width: size, height: size }}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
            <SvgCircle cx={size / 2} cy={size / 2} r={r} stroke={C.border.subtle} strokeWidth={stroke} fill="none" />
            <SvgCircle cx={size / 2} cy={size / 2} r={r}
              stroke={isUrgent ? C.accent.primary : C.fg.secondary}
              strokeWidth={stroke} fill="none" strokeLinecap="round"
              strokeDasharray={`${circ}`} strokeDashoffset={circ * progress} />
          </Svg>
          <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
            <RNText style={[ty.display88, { color: isUrgent ? C.accent.primary : C.fg.primary }]}>{timeStr}</RNText>
            <RNText style={[ty.cap11, { color: C.fg.tertiary, marginTop: S.sm }]}>
              {paused ? 'PAUSED' : mm > 0 ? 'MIN · SEC' : 'SECONDS LEFT'}
            </RNText>
          </View>
        </View>

        <View style={{ alignItems: 'center' }}>
          <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>Up next</RNText>
          <RNText style={[ty.title20, { marginTop: 4 }]}>Set {nextSetIndex + 1} of {totalSets}</RNText>
          <RNText style={[ty.body13, { color: C.fg.tertiary, marginTop: 2 }]}>{exercise?.name}</RNText>
        </View>
      </View>

      <View style={{ paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: 112 }}>
        <View style={[fl.row, { gap: S.sm }]}>
          {[
            { label: paused ? 'Resume' : 'Pause', onPress: () => { haptics.light(); setPaused(p => !p); } },
            { label: '−15s', onPress: () => { setRemaining((r: number) => Math.max(0, r - 15)); haptics.light(); } },
            { label: '+15s', onPress: () => { setRemaining((r: number) => r + 15); haptics.light(); } },
          ].map(btn => (
            <Pressable key={btn.label} onPress={btn.onPress} style={[st.restBtn, fl.flex1]}>
              <RNText style={[ty.body15, { color: C.fg.primary, fontWeight: '500' }]}>{btn.label}</RNText>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── WorkoutCompleteScreen (rest-timer.jsx — WorkoutCompleteScreen) ──
function WorkoutCompleteScreen({ sessionLog, workoutType, selectedMuscles, durationMin, onDone, insets }: any) {
  const { units } = useUnits();
  const [rpe, setRpe] = useState<number | null>(null);
  const [stage, setStage] = useState<'rpe' | 'summary'>('rpe');

  const summary = useMemo(() => {
    const allReps = sessionLog.flatMap((e: any) => e.sets.flatMap((s: any) => s.reps || []));
    const totalReps = sessionLog.reduce((a: number, e: any) => a + e.sets.reduce((b: number, s: any) => b + s.repCount, 0), 0);
    const totalSets = sessionLog.reduce((a: number, e: any) => a + e.sets.length, 0);
    const totalVolumeKg = sessionLog.reduce((a: number, e: any) =>
      a + e.sets.reduce((b: number, s: any) => b + s.repCount * (e.prescription?.loadKg || 0), 0), 0);
    const peaks = allReps.map((r: any) => r?.peakV || 0).filter((v: number) => v > 0);
    const avgVel = peaks.length ? peaks.reduce((a: number, b: number) => a + b, 0) / peaks.length : 0;
    const maxVel = peaks.length ? Math.max(...peaks) : 0;
    return { totalReps, totalSets, totalVolumeKg, avgVel, maxVel, exerciseCount: sessionLog.length };
  }, [sessionLog]);

  if (stage === 'rpe') {
    return (
      <View style={[fl.flex1, { backgroundColor: C.bg.base, paddingTop: insets.top }]}>
        <View style={{ padding: S.md, paddingHorizontal: S.xl, alignItems: 'center' }}>
          <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>Session done</RNText>
        </View>
        <View style={[fl.flex1, { paddingHorizontal: S.xl, paddingTop: S.xl }]}>
          <RNText style={[ty.display28, { textAlign: 'center' }]}>How did it feel?</RNText>
          <RNText style={[ty.body15, { color: C.fg.tertiary, marginTop: S.sm, textAlign: 'center' }]}>
            Rate of perceived exertion (1–10)
          </RNText>
          <View style={{ marginTop: S.xxl, flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {[1,2,3,4,5,6,7,8,9,10].map(v => (
              <Pressable key={v} onPress={() => { haptics.selection(); setRpe(v); }}
                style={[st.rpeBtn, {
                  backgroundColor: rpe === v ? C.accent.primary : C.bg.surface,
                  borderColor: rpe === v ? C.accent.primary : C.border.subtle,
                }]}>
                <RNText style={[ty.display22, { color: rpe === v ? C.bg.base : C.fg.primary }]}>{v}</RNText>
              </Pressable>
            ))}
          </View>
          {rpe && (
            <View style={{ marginTop: S.lg, alignItems: 'center' }}>
              <RNText style={[ty.body15, { color: C.fg.secondary }]}>
                {rpe <= 3 ? 'Easy day — barely felt it.'
                : rpe <= 5 ? 'Moderate — room in the tank.'
                : rpe <= 7 ? 'Tough but clean.'
                : rpe <= 9 ? 'Hard session — at the edge.'
                : 'All out. Grinding through.'}
              </RNText>
            </View>
          )}
        </View>
        <View style={{ paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: 112 }}>
          <Button variant="primary" size="lg" full disabled={!rpe}
            onPress={() => { haptics.medium(); setStage('summary'); }}
            trailing={<Icon name="arrowRight" size={16} color={C.accent.onPrimary} />}>
            See summary
          </Button>
          <Pressable onPress={() => { setRpe(7); setStage('summary'); }} style={{ marginTop: S.md, alignItems: 'center', padding: S.sm }}>
            <RNText style={[ty.body13, { color: C.fg.tertiary }]}>Skip</RNText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[fl.flex1, { backgroundColor: C.bg.base, paddingTop: insets.top }]}>
      <ScrollView style={fl.flex1} contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={{ paddingHorizontal: S.xl, paddingTop: S.xl, alignItems: 'center' }}>
          <View style={st.completeBadge}>
            <Icon name="check" size={26} color={C.accent.primary} />
          </View>
          <RNText style={[ty.display28, { marginTop: S.md }]}>Workout logged</RNText>
          <RNText style={[ty.body15, { color: C.fg.secondary, marginTop: S.sm }]}>
            Saved to today in your history.
          </RNText>
        </View>

        <View style={[st.card, { marginHorizontal: S.xl, marginTop: S.xl }]}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.lg }}>
            <CompleteStat label="DURATION" value={String(durationMin)} unit="min" />
            <CompleteStat label="EXERCISES" value={String(summary.exerciseCount)} unit="" />
            <CompleteStat label="TOTAL REPS" value={String(summary.totalReps)} unit="" />
            <CompleteStat label="VOLUME" value={String(Math.round(fromKg(summary.totalVolumeKg, units as UnitSystem)))} unit={unitLabel(units as UnitSystem)} />
          </View>
          <View style={[st.divTop, fl.row, fl.between, { marginTop: S.lg, paddingTop: S.md }]}>
            <View>
              <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>AVG VEL</RNText>
              <View style={[fl.row, fl.center, { gap: 4, marginTop: 2 }]}>
                <RNText style={[ty.title20, { fontFamily: 'JetBrainsMono_400Regular' }]}>{summary.avgVel.toFixed(2)}</RNText>
                <RNText style={[ty.body12, { color: C.fg.tertiary }]}>m/s</RNText>
              </View>
            </View>
            <View>
              <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>PEAK</RNText>
              <View style={[fl.row, fl.center, { gap: 4, marginTop: 2 }]}>
                <RNText style={[ty.title20, { fontFamily: 'JetBrainsMono_400Regular' }]}>{summary.maxVel.toFixed(2)}</RNText>
                <RNText style={[ty.body12, { color: C.fg.tertiary }]}>m/s</RNText>
              </View>
            </View>
            {rpe && (
              <View>
                <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>RPE</RNText>
                <View style={[fl.row, fl.center, { gap: 2, marginTop: 2 }]}>
                  <RNText style={[ty.title20, { fontFamily: 'JetBrainsMono_400Regular' }]}>{rpe}</RNText>
                  <RNText style={[ty.body12, { color: C.fg.tertiary }]}>/10</RNText>
                </View>
              </View>
            )}
          </View>
        </View>

        {sessionLog.length > 0 && (
          <View style={{ paddingHorizontal: S.xl, marginTop: S.xl }}>
            <RNText style={[ty.cap11, { color: C.fg.tertiary }]}>EXERCISES</RNText>
            <View style={{ marginTop: S.sm, gap: S.sm }}>
              {sessionLog.map((e: any, i: number) => {
                const exMeta = EXERCISE_POOL.find(x => x.id === e.exerciseId);
                const setsDone = e.sets.length;
                const totalReps = e.sets.reduce((a: number, s: any) => a + s.repCount, 0);
                return (
                  <View key={i} style={[st.exRow]}>
                    <View style={st.exNum}>
                      <RNText style={[ty.mono11, { color: C.fg.tertiary }]}>{i + 1}</RNText>
                    </View>
                    <View style={fl.flex1}>
                      <RNText style={[ty.body15, { fontWeight: '500' }]}>{exMeta?.name || e.exerciseId}</RNText>
                      <RNText style={[ty.body13, { color: C.fg.tertiary, marginTop: 2 }]}>
                        {setsDone} set{setsDone !== 1 ? 's' : ''} · {totalReps} reps
                      </RNText>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: 112 }}>
        <Button variant="primary" size="lg" full
          onPress={() => { haptics.success(); onDone(); }}
          trailing={<Icon name="arrowRight" size={16} color={C.accent.onPrimary} />}>
          Done
        </Button>
      </View>
    </View>
  );
}

function CompleteStat({ label, value, unit }: any) {
  return (
    <View style={{ width: '45%' }}>
      <RNText style={ty.monoLabel9}>{label}</RNText>
      <View style={[fl.row, { alignItems: 'flex-end', gap: 3, marginTop: 4 }]}>
        <RNText style={[ty.display26, { color: C.fg.primary }]}>{value}</RNText>
        {unit ? <RNText style={[ty.mono10, { color: C.fg.tertiary, paddingBottom: 3 }]}>{unit}</RNText> : null}
      </View>
    </View>
  );
}

// ─── Shared layout / type helpers ─────────────────────────────
const fl = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row' },
  center: { alignItems: 'center' },
  between: { justifyContent: 'space-between' },
});

const ty = StyleSheet.create({
  display112: { fontSize: 112, lineHeight: 112, fontWeight: '500', letterSpacing: -0.04 * 112, color: C.fg.primary },
  display88: { fontSize: 88, lineHeight: 88, fontWeight: '500', letterSpacing: -0.04 * 88, color: C.fg.primary },
  display32: { fontSize: 32, fontWeight: '500', letterSpacing: -0.02 * 32, color: C.fg.primary },
  display28: { fontSize: 28, lineHeight: 34, fontWeight: '500', letterSpacing: -0.01 * 28, color: C.fg.primary },
  display26: { fontSize: 26, fontWeight: '500', letterSpacing: -0.02 * 26, color: C.fg.primary },
  display22: { fontSize: 22, fontWeight: '500', color: C.fg.primary },
  title20: { fontSize: 20, lineHeight: 26, fontWeight: '600', color: C.fg.primary },
  title17: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: C.fg.primary },
  body16: { fontSize: 16, fontWeight: '500', color: C.fg.primary },
  body15: { fontSize: 15, lineHeight: 22, color: C.fg.primary },
  body14: { fontSize: 14, color: C.fg.primary },
  body13: { fontSize: 13, lineHeight: 18, color: C.fg.primary },
  body12: { fontSize: 12, color: C.fg.primary },
  cap11: { fontSize: 11, fontWeight: '600', letterSpacing: 0.08 * 11, textTransform: 'uppercase', color: C.fg.tertiary },
  mono13: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, color: C.fg.primary },
  mono11: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: C.fg.primary },
  mono10: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, color: C.fg.tertiary },
  monoLabel9: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, fontWeight: '700', letterSpacing: 0.1 * 9, color: C.fg.tertiary, textTransform: 'uppercase' },
  monoLabel10: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 10, fontWeight: '600', letterSpacing: 0.04 * 10, color: C.fg.secondary },
});

const st = StyleSheet.create({
  muscleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: S.lg, minHeight: 64, borderRadius: R.lg, borderWidth: 1,
  },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  typeCard: { borderRadius: R.lg, padding: S.lg, marginBottom: S.sm, borderWidth: 1 },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  forYouBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: C.accent.primary },
  forYouText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, fontWeight: '700', letterSpacing: 0.08 * 9, color: C.bg.base },
  hero: { height: 220, backgroundColor: C.bg.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border.subtle, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  heroBadge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.sm, backgroundColor: 'rgba(0,0,0,0.5)' },
  muscleTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.sm, borderWidth: 1 },
  card: { backgroundColor: C.bg.surface, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.border.subtle },
  guideCard: { backgroundColor: C.bg.surface, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.border.subtle, marginBottom: S.lg },
  duoBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: R.sm, backgroundColor: C.accent.primary },
  duoBadgeText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, fontWeight: '700', letterSpacing: 0.08 * 9, color: C.bg.base },
  dirNum: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stickyBottom: { paddingHorizontal: S.xl, paddingTop: S.lg, paddingBottom: 112, backgroundColor: C.bg.base },
  tick: { position: 'absolute', width: 4, height: 4, borderRadius: 2 },
  velChip: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: C.bg.surface, borderWidth: 1, borderColor: C.border.subtle, minWidth: 140, justifyContent: 'center' },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  cueCard: { backgroundColor: C.bg.surface, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.border.subtle },
  cueIcon: { width: 32, height: 32, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  smallBtn: { padding: 10, backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border.default, borderRadius: R.md, alignItems: 'center' },
  restBtn: { padding: 14, backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border.default, borderRadius: 999, alignItems: 'center' },
  divTop: { borderTopWidth: 1, borderTopColor: C.border.subtle },
  completeBadge: { width: 68, height: 68, borderRadius: 34, backgroundColor: C.accent.primary + '22', borderWidth: 2, borderColor: C.accent.primary, alignItems: 'center', justifyContent: 'center' },
  rpeBtn: { width: '18%', aspectRatio: 1, backgroundColor: C.bg.surface, borderRadius: R.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.bg.surface, borderRadius: R.lg, padding: S.md, borderWidth: 1, borderColor: C.border.subtle },
  exNum: { width: 28, height: 28, borderRadius: R.sm, backgroundColor: C.bg.elevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
