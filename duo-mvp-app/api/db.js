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
      reset_code TEXT,
      reset_code_expires TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add reset columns if upgrading from old schema
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_expires TIMESTAMPTZ`);

  // Check if workouts table exists with correct schema
  const cols = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workouts'
  `);
  const colNames = cols.rows.map(r => r.column_name);

  if (colNames.length > 0 && !colNames.includes('workout_date')) {
    // Table exists with old schema — drop it (no real data, service never ran successfully)
    console.log('Dropping workouts table with old schema, columns:', colNames);
    await pool.query('DROP TABLE IF EXISTS workouts CASCADE');
  }

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
