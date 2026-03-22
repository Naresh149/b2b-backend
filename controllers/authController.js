const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ── REGISTER ───────────────────────────────────────────
exports.register = async (req, res) => {
  const { name, email, password, role, company_name, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, password required!' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (name,email,password,role,company_name,phone) VALUES (?,?,?,?,?,?)',
      [name, email, hashed, role || 'buyer', company_name || '', phone || ''],
      (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists!' });
          }
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: '✅ Account created successfully!' });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── LOGIN ──────────────────────────────────────────────
exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required!' });
  }

  db.query('SELECT * FROM users WHERE email=?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password!' });
    }

    const user = results[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated!' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password!' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_name: user.company_name
      }
    });
  });
};

// ── GET PROFILE ────────────────────────────────────────
exports.getProfile = (req, res) => {
  db.query(
    'SELECT id,name,email,role,company_name,phone,created_at FROM users WHERE id=?',
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0]);
    }
  );
};

// ── UPDATE PROFILE ─────────────────────────────────────
exports.updateProfile = (req, res) => {
  const { name, company_name, phone } = req.body;
  db.query(
    'UPDATE users SET name=?, company_name=?, phone=? WHERE id=?',
    [name, company_name, phone, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: '✅ Profile updated!' });
    }
  );
};