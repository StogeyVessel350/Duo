const express = require('express');
const { pool } = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /workouts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, workout_date, focus, duration_min, total_volume_kg, has_pr, exercises, created_at
       FROM workouts WHERE user_id = $1 ORDER BY workout_date DESC, created_at DESC`,
      [req.user.userId]
    );
    res.json(result.rows.map(row => ({
      id: row.id,
      date: row.workout_date.toISOString().slice(0, 10),
      focus: row.focus,
      durationMin: row.duration_min,
      totalVolumeKg: row.total_volume_kg,
      hasPR: row.has_pr,
      exercises: row.exercises,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /workouts/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM workouts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({
      id: row.id,
      date: row.workout_date.toISOString().slice(0, 10),
      focus: row.focus,
      durationMin: row.duration_min,
      totalVolumeKg: row.total_volume_kg,
      hasPR: row.has_pr,
      exercises: row.exercises,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /workouts
router.post('/', async (req, res) => {
  const { date, focus, durationMin, totalVolumeKg, hasPR, exercises } = req.body;
  if (!date || !focus) return res.status(400).json({ error: 'date and focus required' });

  try {
    const result = await pool.query(
      `INSERT INTO workouts (user_id, workout_date, focus, duration_min, total_volume_kg, has_pr, exercises)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [req.user.userId, date, focus, durationMin ?? 0, totalVolumeKg ?? 0, hasPR ?? false, JSON.stringify(exercises ?? [])]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /workouts/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM workouts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
