CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name TEXT,
    date_of_birth DATE,
    height_cm DOUBLE PRECISION,
    sex TEXT CHECK (sex IN ('male', 'female', 'other')),
    training_goal TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    primary_muscle_group TEXT,
    movement_pattern TEXT CHECK (movement_pattern IN ('push', 'pull', 'hinge', 'squat', 'carry', 'other')),
    is_bilateral BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INT,
    body_weight_kg DOUBLE PRECISION,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    location_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workouts_user_id_idx ON workouts(user_id);

CREATE TABLE IF NOT EXISTS sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    set_number INT NOT NULL,
    weight_kg DOUBLE PRECISION,
    rpe DOUBLE PRECISION,
    rest_seconds INT,
    rep_count INT,
    bar_type TEXT CHECK (bar_type IN ('barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'other')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sets_workout_id_idx ON sets(workout_id);

CREATE TABLE IF NOT EXISTS reps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
    rep_number INT NOT NULL,
    peak_g DOUBLE PRECISION,
    concentric_ms INT,
    eccentric_ms INT,
    mean_velocity_ms DOUBLE PRECISION,
    peak_velocity_ms DOUBLE PRECISION,
    range_of_motion_deg DOUBLE PRECISION,
    symmetry_score DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reps_set_id_idx ON reps(set_id);
