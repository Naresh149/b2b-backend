const db = require('../config/db');

// ── GET DASHBOARD STATS ────────────────────────────────
exports.getStats = (req, res) => {
  const stats = {};

  db.query('SELECT COUNT(*) as total FROM users', (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    stats.totalUsers = r[0].total;

    db.query('SELECT COUNT(*) as total FROM products', (err, r) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.totalProducts = r[0].total;

      db.query('SELECT COUNT(*) as total FROM orders', (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalOrders = r[0].total;

        db.query('SELECT SUM(total) as revenue FROM orders WHERE payment_status="paid"', (err, r) => {
          if (err) return res.status(500).json({ error: err.message });
          stats.totalRevenue = r[0].revenue || 0;

          db.query('SELECT COUNT(*) as total FROM users WHERE role="seller"', (err, r) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.totalSellers = r[0].total;

            db.query('SELECT COUNT(*) as total FROM users WHERE role="buyer"', (err, r) => {
              if (err) return res.status(500).json({ error: err.message });
              stats.totalBuyers = r[0].total;

              db.query(`SELECT COUNT(*) as total FROM orders WHERE status='pending'`, (err, r) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.pendingOrders = r[0].total;
                res.json(stats);
              });
            });
          });
        });
      });
    });
  });
};

// ── GET MONTHLY SALES ──────────────────────────────────
exports.getMonthlySales = (req, res) => {
  db.query(`
    SELECT 
      DATE_FORMAT(created_at, '%b') as month,
      DATE_FORMAT(created_at, '%Y-%m') as month_key,
      COUNT(*) as orders,
      SUM(total) as revenue
    FROM orders
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY month_key, month
    ORDER BY month_key ASC
  `, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// ── GET ALL USERS ──────────────────────────────────────
exports.getAllUsers = (req, res) => {
  db.query(
    'SELECT id, name, email, role, company_name, phone, is_active, created_at FROM users ORDER BY created_at DESC',
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
};

// ── TOGGLE USER STATUS ─────────────────────────────────
exports.toggleUserStatus = (req, res) => {
  db.query(
    'UPDATE users SET is_active = !is_active WHERE id = ?',
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: '✅ User status updated!' });
    }
  );
};

// ── GET ALL ORDERS (Admin) ─────────────────────────────
exports.getAllOrders = (req, res) => {
  db.query(`
    SELECT o.*, u.name as buyer_name, u.email,
    COUNT(oi.id) as item_count
    FROM orders o
    JOIN users u ON o.buyer_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

// ── UPDATE ORDER STATUS ────────────────────────────────
exports.updateOrderStatus = (req, res) => {
  const { status } = req.body;
  db.query(
    'UPDATE orders SET status=? WHERE id=?',
    [status, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.query('SELECT buyer_id FROM orders WHERE id=?', [req.params.id], (err, orders) => {
        if (!err && orders.length > 0) {
          db.query(
            'INSERT INTO notifications (user_id, message) VALUES (?,?)',
            [orders[0].buyer_id, `📦 Your order #${req.params.id} is now ${status}`],
            () => {}
          );
        }
      });
      res.json({ message: '✅ Order status updated!' });
    }
  );
};

// ── GET SELLER STATS ───────────────────────────────────
exports.getSellerStats = (req, res) => {
  const sellerId = req.user.id;
  const stats = {};

  db.query('SELECT COUNT(*) as total FROM products WHERE seller_id=?', [sellerId], (err, r) => {
    if (err) return res.status(500).json({ error: err.message });
    stats.totalProducts = r[0].total;

    db.query(`
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE p.seller_id = ?
    `, [sellerId], (err, r) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.totalOrders = r[0].total;

      db.query(`
        SELECT SUM(oi.price * oi.quantity) as revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE p.seller_id = ?
      `, [sellerId], (err, r) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalRevenue = r[0].revenue || 0;

        db.query(`
          SELECT COUNT(*) as total FROM products
          WHERE seller_id=? AND is_active=1
        `, [sellerId], (err, r) => {
          if (err) return res.status(500).json({ error: err.message });
          stats.activeProducts = r[0].total;
          res.json(stats);
        });
      });
    });
  });
};

// ── GET SELLER ORDERS ──────────────────────────────────
exports.getSellerOrders = (req, res) => {
  db.query(`
    SELECT DISTINCT o.*, u.name as buyer_name,
    u.company_name, COUNT(oi.id) as item_count
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    JOIN users u ON o.buyer_id = u.id
    WHERE p.seller_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};