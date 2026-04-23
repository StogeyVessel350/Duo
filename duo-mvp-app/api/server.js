// dotenv only needed locally — Railway injects env vars directly
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch {}
}
const express = require('express');
const cors = require('cors');
const { initSchema } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', require('./routes/auth'));
app.use('/workouts', require('./routes/workouts'));

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;

initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`DUO API running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to init schema:', err);
    process.exit(1);
  });
