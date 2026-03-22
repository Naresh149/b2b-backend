const db = require('../config/db');

// ── GET CART ───────────────────────────────────────────
exports.getCart = (req, res) => {
  db.query(
    `SELECT c.id, c.quantity, p.id as product_id,
     p.title, p.price, p.image, p.stock,
     cat.name as category_name
     FROM cart c
     JOIN products p ON c.product_id = p.id
     LEFT JOIN categories cat ON p.category_id = cat.id
     WHERE c.user_id = ?`,
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      const total = results.reduce((sum, item) =>
        sum + (item.price * item.quantity), 0);
      res.json({ items: results, total });
    }
  );
};

// ── ADD TO CART ────────────────────────────────────────
exports.addToCart = (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  if (!product_id) return res.status(400).json({ error: 'Product ID required!' });

  db.query(
    'SELECT * FROM cart WHERE user_id=? AND product_id=?',
    [req.user.id, product_id],
    (err, existing) => {
      if (err) return res.status(500).json({ error: err.message });

      if (existing.length > 0) {
        db.query(
          'UPDATE cart SET quantity=quantity+? WHERE user_id=? AND product_id=?',
          [quantity, req.user.id, product_id],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: '✅ Cart updated!' });
          }
        );
      } else {
        db.query(
          'INSERT INTO cart (user_id, product_id, quantity) VALUES (?,?,?)',
          [req.user.id, product_id, quantity],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: '✅ Added to cart!' });
          }
        );
      }
    }
  );
};

// ── UPDATE QUANTITY ────────────────────────────────────
exports.updateCart = (req, res) => {
  const { quantity } = req.body;
  if (quantity < 1) return res.status(400).json({ error: 'Quantity must be at least 1!' });

  db.query(
    'UPDATE cart SET quantity=? WHERE id=? AND user_id=?',
    [quantity, req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Cart item not found!' });
      res.json({ message: '✅ Quantity updated!' });
    }
  );
};

// ── REMOVE FROM CART ───────────────────────────────────
exports.removeFromCart = (req, res) => {
  db.query(
    'DELETE FROM cart WHERE id=? AND user_id=?',
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Cart item not found!' });
      res.json({ message: '✅ Removed from cart!' });
    }
  );
};

// ── CLEAR CART ─────────────────────────────────────────
exports.clearCart = (req, res) => {
  db.query('DELETE FROM cart WHERE user_id=?', [req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '✅ Cart cleared!' });
  });
};