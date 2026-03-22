const db = require('../config/db')

// ── GET NOTIFICATIONS ──────────────────────────────────
exports.getNotifications = (req, res) => {
  db.query(
    `SELECT * FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 20`,
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message })
      res.json(results)
    }
  )
}

// ── MARK ALL READ ──────────────────────────────────────
exports.markAllRead = (req, res) => {
  db.query(
    'UPDATE notifications SET is_read=1 WHERE user_id=?',
    [req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message })
      res.json({ message: '✅ All notifications marked as read!' })
    }
  )
}

// ── DELETE NOTIFICATION ────────────────────────────────
exports.deleteNotification = (req, res) => {
  db.query(
    'DELETE FROM notifications WHERE id=? AND user_id=?',
    [req.params.id, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message })
      res.json({ message: '✅ Notification deleted!' })
    }
  )
}