const db = require('../config/db');

// ── GET ALL PRODUCTS ───────────────────────────────────
exports.getProducts = (req, res) => {
  const { search, category_id, min_price, max_price, page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT p.*, c.name as category_name, u.name as seller_name, u.company_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.seller_id = u.id
    WHERE p.is_active = 1
  `;
  const params = [];

  if (search) {
    query += ' AND (p.title LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category_id) {
    query += ' AND p.category_id = ?';
    params.push(category_id);
  }
  if (min_price) {
    query += ' AND p.price >= ?';
    params.push(min_price);
  }
  if (max_price) {
    query += ' AND p.price <= ?';
    params.push(max_price);
  }

  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// ── GET SINGLE PRODUCT ─────────────────────────────────
exports.getProduct = (req, res) => {
  const query = `
    SELECT p.*, c.name as category_name, u.name as seller_name, u.company_name,
    ROUND(AVG(r.rating), 1) as avg_rating, COUNT(r.id) as review_count
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.seller_id = u.id
    LEFT JOIN reviews r ON p.id = r.product_id
    WHERE p.id = ?
    GROUP BY p.id
  `;
  db.query(query, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Product not found!' });
    res.json(results[0]);
  });
};

// ── CREATE PRODUCT ─────────────────────────────────────
exports.createProduct = (req, res) => {
  const { title, description, price, stock, category_id } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  if (!title || !price) {
    return res.status(400).json({ error: 'Title and price required!' });
  }

  db.query(
    'INSERT INTO products (title, description, price, stock, category_id, seller_id, image) VALUES (?,?,?,?,?,?,?)',
    [title, description || '', price, stock || 0, category_id || null, req.user.id, image],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId, message: '✅ Product created!' });
    }
  );
};

// ── UPDATE PRODUCT ─────────────────────────────────────
exports.updateProduct = (req, res) => {
  const { title, description, price, stock, category_id, is_active } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  let query = 'UPDATE products SET title=?, description=?, price=?, stock=?, category_id=?, is_active=?';
  let params = [title, description, price, stock, category_id, is_active ?? 1];

  if (image) {
    query += ', image=?';
    params.push(image);
  }

  query += ' WHERE id=? AND seller_id=?';
  params.push(req.params.id, req.user.id);

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found!' });
    res.json({ message: '✅ Product updated!' });
  });
};

// ── DELETE PRODUCT ─────────────────────────────────────
exports.deleteProduct = (req, res) => {
  db.query(
    'DELETE FROM products WHERE id=? AND seller_id=?',
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found!' });
      res.json({ message: '✅ Product deleted!' });
    }
  );
};

// ── GET SELLER PRODUCTS ────────────────────────────────
exports.getSellerProducts = (req, res) => {
  db.query(
    `SELECT p.*, c.name as category_name FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.seller_id = ? ORDER BY p.created_at DESC`,
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
};