const db = require('../config/db');

// ── PLACE ORDER ────────────────────────────────────────
exports.placeOrder = (req, res) => {
  const { address, payment_method } = req.body;
  if (!address) return res.status(400).json({ error: 'Address required!' });

  db.query(
    `SELECT c.*, p.price, p.stock, p.title FROM cart c
     JOIN products p ON c.product_id = p.id
     WHERE c.user_id = ?`,
    [req.user.id],
    (err, cartItems) => {
      if (err) return res.status(500).json({ error: err.message });
      if (cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty!' });

      const total = cartItems.reduce((sum, item) =>
        sum + (item.price * item.quantity), 0);

      db.query(
        `INSERT INTO orders (buyer_id, total, status, payment_method, payment_status, address)
         VALUES (?,?,'pending',?,?,?)`,
        [req.user.id, total, payment_method || 'cod',
          payment_method === 'cod' ? 'pending' : 'pending', address],
        (err, orderResult) => {
          if (err) return res.status(500).json({ error: err.message });
          const orderId = orderResult.insertId;

          const orderItems = cartItems.map(item => [
            orderId, item.product_id, item.quantity, item.price
          ]);

          db.query(
            'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?',
            [orderItems],
            (err) => {
              if (err) return res.status(500).json({ error: err.message });

              db.query('DELETE FROM cart WHERE user_id=?', [req.user.id], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                db.query(
                  `INSERT INTO notifications (user_id, message) VALUES (?,?)`,
                  [req.user.id, `✅ Order #${orderId} placed successfully! Total: ₹${total}`],
                  () => {}
                );

                res.status(201).json({
                  message: '✅ Order placed successfully!',
                  order_id: orderId,
                  total
                });
              });
            }
          );
        }
      );
    }
  );
};

// ── GET MY ORDERS ──────────────────────────────────────
exports.getMyOrders = (req, res) => {
  db.query(
    `SELECT o.*, COUNT(oi.id) as item_count
     FROM orders o
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.buyer_id = ?
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
};

// ── GET ORDER DETAIL ───────────────────────────────────
exports.getOrderDetail = (req, res) => {
  db.query(
    `SELECT o.*, u.name as buyer_name, u.email
     FROM orders o
     JOIN users u ON o.buyer_id = u.id
     WHERE o.id = ? AND o.buyer_id = ?`,
    [req.params.id, req.user.id],
    (err, orders) => {
      if (err) return res.status(500).json({ error: err.message });
      if (orders.length === 0) return res.status(404).json({ error: 'Order not found!' });

      db.query(
        `SELECT oi.*, p.title, p.image FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [req.params.id],
        (err, items) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ ...orders[0], items });
        }
      );
    }
  );
};

// ── GET ALL ORDERS (Admin) ─────────────────────────────
exports.getAllOrders = (req, res) => {
  db.query(
    `SELECT o.*, u.name as buyer_name, u.email,
     COUNT(oi.id) as item_count
     FROM orders o
     JOIN users u ON o.buyer_id = u.id
     LEFT JOIN order_items oi ON o.id = oi.order_id
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
};

// ── UPDATE ORDER STATUS (Admin/Seller) ─────────────────
exports.updateOrderStatus = (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status!' });
  }

  db.query(
    'UPDATE orders SET status=? WHERE id=?',
    [status, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found!' });

      db.query(
        'SELECT buyer_id FROM orders WHERE id=?',
        [req.params.id],
        (err, orders) => {
          if (!err && orders.length > 0) {
            db.query(
              'INSERT INTO notifications (user_id, message) VALUES (?,?)',
              [orders[0].buyer_id, `📦 Order #${req.params.id} status updated to: ${status}`],
              () => {}
            );
          }
        }
      );
      res.json({ message: '✅ Order status updated!' });
    }
  );
};