const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '90d' });
}

// POST /auth/signup
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password too short' });

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Account already exists' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email.toLowerCase(), hash]
    );
    const token = makeToken(result.rows[0].id);
    res.json({ token, setupComplete: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/signin
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Incorrect email or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect email or password' });

    const token = makeToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        age: user.age,
        heightCm: user.height_cm,
        weightKg: user.weight_kg,
        experienceLevel: user.experience_level,
        setupComplete: user.setup_complete,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, age, height_cm, weight_kg, experience_level, setup_complete FROM users WHERE id = $1',
      [req.user.userId]
    );
    const u = result.rows[0];
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: u.id, email: u.email, name: u.name, age: u.age,
      heightCm: u.height_cm, weightKg: u.weight_kg,
      experienceLevel: u.experience_level, setupComplete: u.setup_complete,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /auth/profile  — completes onboarding setup OR updates profile
router.put('/profile', requireAuth, async (req, res) => {
  const { name, age, heightCm, weightKg, experienceLevel } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        age = COALESCE($2, age),
        height_cm = COALESCE($3, height_cm),
        weight_kg = COALESCE($4, weight_kg),
        experience_level = COALESCE($5, experience_level),
        setup_complete = TRUE
       WHERE id = $6
       RETURNING id, email, name, age, height_cm, weight_kg, experience_level, setup_complete`,
      [name, age, heightCm, weightKg, experienceLevel, req.user.userId]
    );
    const u = result.rows[0];
    res.json({
      id: u.id, email: u.email, name: u.name, age: u.age,
      heightCm: u.height_cm, weightKg: u.weight_kg,
      experienceLevel: u.experience_level, setupComplete: u.setup_complete,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/reset-request — MVP: accepts any account, no email sent
router.post('/reset-request', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  // Don't reveal whether account exists — always return ok
  res.json({ ok: true });
});

// POST /auth/reset-confirm — MVP: any 6-digit code accepted
router.post('/reset-confirm', async (req, res) => {
  const { email, code, password } = req.body;
  if (!email || !code || !password) return res.status(400).json({ error: 'Missing fields' });
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Invalid code' });
  if (password.length < 6) return res.status(400).json({ error: 'Password too short' });

  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!result.rows[0]) return res.status(404).json({ error: 'No account found with that email' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, email.toLowerCase()]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
