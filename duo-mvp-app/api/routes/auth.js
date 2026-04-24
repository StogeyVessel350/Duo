const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const { pool } = require('../db');
const requireAuth = require('../middleware/auth');

const resend = new Resend(process.env.RESEND_API_KEY);

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

// POST /auth/reset-request — generates a code and emails it
router.post('/reset-request', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!result.rows[0]) {
      // Don't reveal whether account exists
      return res.json({ ok: true });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const hash = await bcrypt.hash(code, SALT_ROUNDS);
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await pool.query(
      'UPDATE users SET reset_code = $1, reset_code_expires = $2 WHERE email = $3',
      [hash, expires, email.toLowerCase()]
    );

    await resend.emails.send({
      from: 'DUO <onboarding@resend.dev>',
      to: email.toLowerCase(),
      subject: 'Your DUO password reset code',
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px">
          <h2 style="margin-bottom:8px">Reset your password</h2>
          <p style="color:#666;margin-bottom:24px">Enter this code in the app. It expires in 15 minutes.</p>
          <div style="background:#f4f4f4;border-radius:8px;padding:24px;text-align:center;font-size:36px;font-weight:700;letter-spacing:8px">
            ${code}
          </div>
          <p style="color:#999;font-size:12px;margin-top:24px">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/reset-confirm — verifies code and updates password
router.post('/reset-confirm', async (req, res) => {
  const { email, code, password } = req.body;
  if (!email || !code || !password) return res.status(400).json({ error: 'Missing fields' });
  if (password.length < 6) return res.status(400).json({ error: 'Password too short' });

  try {
    const result = await pool.query(
      'SELECT reset_code, reset_code_expires FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user || !user.reset_code) return res.status(400).json({ error: 'No reset code found. Request a new one.' });
    if (new Date() > new Date(user.reset_code_expires)) return res.status(400).json({ error: 'Code expired. Request a new one.' });

    const match = await bcrypt.compare(code, user.reset_code);
    if (!match) return res.status(400).json({ error: 'Incorrect code.' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_code = NULL, reset_code_expires = NULL WHERE email = $2',
      [hash, email.toLowerCase()]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
