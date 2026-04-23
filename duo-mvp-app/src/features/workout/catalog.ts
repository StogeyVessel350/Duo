export interface MuscleGroup {
  id: string;
  label: string;
  emoji: string;
  regions: string[];
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  { id: 'legs',       label: 'Legs',         emoji: '🦵', regions: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { id: 'chest',      label: 'Chest',        emoji: '💪', regions: ['pec-major', 'pec-minor'] },
  { id: 'back',       label: 'Back',         emoji: '🔙', regions: ['lats', 'traps', 'rhomboids', 'erectors'] },
  { id: 'shoulders',  label: 'Shoulders',    emoji: '🤷', regions: ['front-delt', 'mid-delt', 'rear-delt'] },
  { id: 'arms',       label: 'Arms',         emoji: '💪', regions: ['biceps', 'triceps', 'forearms'] },
  { id: 'core',       label: 'Core',         emoji: '🎯', regions: ['abs', 'obliques', 'lower-back'] },
  { id: 'glutes',     label: 'Glutes',       emoji: '🍑', regions: ['glute-max', 'glute-med'] },
  { id: 'hamstrings', label: 'Hamstrings',   emoji: '🦿', regions: ['biceps-femoris', 'semitendinosus'] },
  { id: 'quads',      label: 'Quads',        emoji: '🦵', regions: ['rectus-femoris', 'vastus-lateralis'] },
  { id: 'calves',     label: 'Calves',       emoji: '🦶', regions: ['gastrocnemius', 'soleus'] },
  { id: 'full-body',  label: 'Full Body',    emoji: '⚡', regions: [] },
];

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: 'barbell' | 'dumbbell' | 'cable' | 'bodyweight' | 'machine';
  clip: string;
  bilateral: boolean;
  cues: string[];
}

export const EXERCISE_POOL: Exercise[] = [
  { id: 'back-squat',        name: 'Back Squat',          muscleGroup: 'legs',      equipment: 'barbell',   clip: 'backSquat',     bilateral: true,  cues: ['Brace core tight', 'Drive knees out', 'Chest up through ascent'] },
  { id: 'front-squat',       name: 'Front Squat',         muscleGroup: 'legs',      equipment: 'barbell',   clip: 'backSquat',     bilateral: true,  cues: ['Elbows high', 'Upright torso', 'Full depth'] },
  { id: 'deadlift',          name: 'Deadlift',            muscleGroup: 'back',      equipment: 'barbell',   clip: 'deadlift',      bilateral: true,  cues: ['Push floor away', 'Bar against legs', 'Lock hips at top'] },
  { id: 'rdl',               name: 'Romanian Deadlift',   muscleGroup: 'hamstrings',equipment: 'barbell',   clip: 'deadlift',      bilateral: true,  cues: ['Hip hinge', 'Soft knee bend', 'Feel hamstring stretch'] },
  { id: 'bench-press',       name: 'Bench Press',         muscleGroup: 'chest',     equipment: 'barbell',   clip: 'benchPress',    bilateral: true,  cues: ['Retract scapula', 'Tuck elbows slightly', 'Drive feet into floor'] },
  { id: 'incline-press',     name: 'Incline Press',       muscleGroup: 'chest',     equipment: 'barbell',   clip: 'benchPress',    bilateral: true,  cues: ['45° incline', 'Control the descent', 'Full lockout'] },
  { id: 'overhead-press',    name: 'Overhead Press',      muscleGroup: 'shoulders', equipment: 'barbell',   clip: 'overheadPress', bilateral: true,  cues: ['Stack joints', 'Squeeze glutes', 'Push bar overhead'] },
  { id: 'push-press',        name: 'Push Press',          muscleGroup: 'shoulders', equipment: 'barbell',   clip: 'overheadPress', bilateral: true,  cues: ['Dip and drive', 'Use leg drive', 'Lock out overhead'] },
  { id: 'goblet-squat',      name: 'Goblet Squat',        muscleGroup: 'legs',      equipment: 'dumbbell',  clip: 'gobletSquat',   bilateral: true,  cues: ['Hold at chest', 'Elbows inside knees', 'Upright torso'] },
  { id: 'db-row',            name: 'Dumbbell Row',        muscleGroup: 'back',      equipment: 'dumbbell',  clip: 'cableRow',      bilateral: false, cues: ['Brace on bench', 'Pull elbow back', 'Squeeze at top'] },
  { id: 'cable-row',         name: 'Cable Row',           muscleGroup: 'back',      equipment: 'cable',     clip: 'cableRow',      bilateral: true,  cues: ['Neutral spine', 'Pull to lower chest', 'Control return'] },
  { id: 'lat-pulldown',      name: 'Lat Pulldown',        muscleGroup: 'back',      equipment: 'cable',     clip: 'cableRow',      bilateral: true,  cues: ['Lean back slightly', 'Pull elbows down', 'Squeeze lats'] },
  { id: 'leg-press',         name: 'Leg Press',           muscleGroup: 'legs',      equipment: 'machine',   clip: 'legPress',      bilateral: true,  cues: ['Feet shoulder width', 'Full range', 'Drive through heels'] },
  { id: 'leg-curl',          name: 'Leg Curl',            muscleGroup: 'hamstrings',equipment: 'machine',   clip: 'legPress',      bilateral: true,  cues: ['Control eccentric', 'Full contraction', 'Neutral hips'] },
  { id: 'pushup',            name: 'Push-up',             muscleGroup: 'chest',     equipment: 'bodyweight',clip: 'pushup',        bilateral: true,  cues: ['Hollow body', 'Elbows at 45°', 'Full lockout'] },
  { id: 'pull-up',           name: 'Pull-up',             muscleGroup: 'back',      equipment: 'bodyweight',clip: 'cableRow',      bilateral: true,  cues: ['Dead hang start', 'Drive elbows down', 'Chin over bar'] },
  { id: 'dip',               name: 'Dip',                 muscleGroup: 'chest',     equipment: 'bodyweight',clip: 'pushup',        bilateral: true,  cues: ['Slight forward lean', 'Elbows back', 'Full depth'] },
  { id: 'lunge',             name: 'Walking Lunge',       muscleGroup: 'legs',      equipment: 'barbell',   clip: 'backSquat',     bilateral: false, cues: ['90° knee angle', 'Upright torso', 'Drive through front heel'] },
  { id: 'hip-thrust',        name: 'Hip Thrust',          muscleGroup: 'glutes',    equipment: 'barbell',   clip: 'deadlift',      bilateral: true,  cues: ['Bench at shoulder blades', 'Drive hips up', 'Squeeze glutes at top'] },
  { id: 'glute-bridge',      name: 'Glute Bridge',        muscleGroup: 'glutes',    equipment: 'bodyweight',clip: 'deadlift',      bilateral: true,  cues: ['Feet flat', 'Bridge fully', 'Hold 1s at top'] },
  { id: 'db-curl',           name: 'Dumbbell Curl',       muscleGroup: 'arms',      equipment: 'dumbbell',  clip: 'gobletSquat',   bilateral: false, cues: ['Pin elbows', 'Supinate at top', 'Control eccentric'] },
  { id: 'tricep-ext',        name: 'Tricep Extension',    muscleGroup: 'arms',      equipment: 'cable',     clip: 'cableRow',      bilateral: true,  cues: ['Elbows in', 'Full extension', 'Squeeze at bottom'] },
  { id: 'face-pull',         name: 'Face Pull',           muscleGroup: 'shoulders', equipment: 'cable',     clip: 'cableRow',      bilateral: true,  cues: ['Pull to forehead', 'External rotate', 'Squeeze rear delts'] },
  { id: 'lateral-raise',     name: 'Lateral Raise',       muscleGroup: 'shoulders', equipment: 'dumbbell',  clip: 'gobletSquat',   bilateral: false, cues: ['Slight elbow bend', 'Lead with elbows', 'Control descent'] },
  { id: 'calf-raise',        name: 'Calf Raise',          muscleGroup: 'calves',    equipment: 'machine',   clip: 'legPress',      bilateral: true,  cues: ['Full range', 'Pause at top', 'Controlled descent'] },
  { id: 'plank',             name: 'Plank',               muscleGroup: 'core',      equipment: 'bodyweight',clip: 'pushup',        bilateral: true,  cues: ['Hollow body', 'Squeeze glutes', 'Breathe controlled'] },
  { id: 'ab-rollout',        name: 'Ab Rollout',          muscleGroup: 'core',      equipment: 'barbell',   clip: 'deadlift',      bilateral: true,  cues: ['Brace hard', 'Hips level', 'Pull back with lats'] },
  { id: 'hang-clean',        name: 'Hang Clean',          muscleGroup: 'full-body', equipment: 'barbell',   clip: 'deadlift',      bilateral: true,  cues: ['Explosive hip extension', 'High pull', 'Catch in quarter squat'] },
  { id: 'power-clean',       name: 'Power Clean',         muscleGroup: 'full-body', equipment: 'barbell',   clip: 'deadlift',      bilateral: true,  cues: ['Setup like deadlift', 'Triple extension', 'Fast elbows'] },
  { id: 'box-jump',          name: 'Box Jump',            muscleGroup: 'legs',      equipment: 'bodyweight',clip: 'backSquat',     bilateral: true,  cues: ['Load hips', 'Full extension', 'Land soft'] },
  { id: 'kb-swing',          name: 'Kettlebell Swing',    muscleGroup: 'glutes',    equipment: 'dumbbell',  clip: 'deadlift',      bilateral: true,  cues: ['Hip hinge not squat', 'Snap hips', 'Control float'] },
  { id: 'trap-bar-deadlift', name: 'Trap Bar Deadlift',   muscleGroup: 'legs',      equipment: 'barbell',   clip: 'deadlift',      bilateral: true,  cues: ['Neutral grip', 'Push floor', 'Stand tall'] },
  { id: 'sumo-deadlift',     name: 'Sumo Deadlift',       muscleGroup: 'legs',      equipment: 'barbell',   clip: 'deadlift',      bilateral: true,  cues: ['Wide stance', 'Toes out', 'Drive hips through'] },
  { id: 'seated-row',        name: 'Seated Cable Row',    muscleGroup: 'back',      equipment: 'cable',     clip: 'cableRow',      bilateral: true,  cues: ['Neutral spine', 'Pull to navel', 'Squeeze scapula'] },
];

export interface WorkoutType {
  id: string;
  label: string;
  sets: number;
  reps: number;
  intensityPct: number;
  rest: number;
  description: string;
}

export const WORKOUT_TYPES: WorkoutType[] = [
  { id: 'heavy',       label: 'Heavy',        sets: 4, reps: 5,  intensityPct: 0.85, rest: 180, description: 'Max strength development' },
  { id: 'hypertrophy', label: 'Hypertrophy',  sets: 4, reps: 10, intensityPct: 0.72, rest: 90,  description: 'Muscle size & endurance' },
  { id: 'hiit',        label: 'Power',        sets: 5, reps: 3,  intensityPct: 0.60, rest: 120, description: 'Speed-strength & explosiveness' },
];

export function filterExercises(muscleGroup: string, equipment?: string) {
  return EXERCISE_POOL.filter(e =>
    (muscleGroup === 'full-body' || e.muscleGroup === muscleGroup) &&
    (!equipment || e.equipment === equipment)
  );
}

export function pickExercise(muscleGroup: string): Exercise {
  const pool = filterExercises(muscleGroup);
  return pool[Math.floor(Math.random() * pool.length)] ?? EXERCISE_POOL[0];
}

export function prescribe(exercise: Exercise, workoutType: WorkoutType, oneRMkg: number) {
  const weightKg = Math.round(oneRMkg * workoutType.intensityPct / 2.5) * 2.5;
  return {
    exercise,
    workoutType,
    sets: workoutType.sets,
    reps: workoutType.reps,
    weightKg,
    intensityPct: workoutType.intensityPct,
    rest: workoutType.rest,
  };
}
