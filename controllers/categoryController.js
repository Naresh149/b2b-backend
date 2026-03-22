const db = require('../config/db');

exports.getCategories = (req, res) => {
  db.query('SELECT * FROM categories', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

exports.createCategory = (req, res) => {
  const { name, parent_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required!' });
  db.query(
    'INSERT INTO categories (name, parent_id) VALUES (?,?)',
    [name, parent_id || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId, name });
    }
  );
};

exports.deleteCategory = (req, res) => {
  db.query('DELETE FROM categories WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '✅ Category deleted!' });
  });
};