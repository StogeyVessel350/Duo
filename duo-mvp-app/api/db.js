const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway.internal')
    ? false
    : { rejectUnauthorized: false },
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      age INTEGER,
      height_cm INTEGER,
      weight_kg REAL,
      experience_level INTEGER DEFAULT 2,
      setup_complete BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Drop workouts table if it was created with old 'date' column instead of 'workout_date'
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workouts' AND column_name = 'date'
      ) THEN
        DROP TABLE workouts CASCADE;
      END IF;
    END $$
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workouts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workout_date DATE NOT NULL,
      focus TEXT NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 0,
      total_volume_kg REAL NOT NULL DEFAULT 0,
      has_pr BOOLEAN DEFAULT FALSE,
      exercises JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_workouts_user_date
      ON workouts(user_id, workout_date DESC)
  `);

  console.log('Schema ready.');
}

module.exports = { pool, initSchema };
