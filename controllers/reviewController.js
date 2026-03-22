const db = require('../config/db')

// ── GET PRODUCT REVIEWS ────────────────────────────────
exports.getReviews = (req, res) => {
  db.query(
    `SELECT r.*, u.name as user_name
     FROM reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.product_id = ?
     ORDER BY r.created_at DESC`,
    [req.params.productId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message })
      res.json(results)
    }
  )
}

// ── ADD REVIEW ─────────────────────────────────────────
exports.addReview = (req, res) => {
  const { rating, comment } = req.body
  const { productId } = req.params

  if (!rating) return res.status(400).json({ error: 'Rating required!' })
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5!' })

  db.query(
    'SELECT * FROM reviews WHERE product_id=? AND user_id=?',
    [productId, req.user.id],
    (err, existing) => {
      if (err) return res.status(500).json({ error: err.message })
      if (existing.length > 0) {
        return res.status(400).json({ error: 'You already reviewed this product!' })
      }

      db.query(
        'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?,?,?,?)',
        [productId, req.user.id, rating, comment || ''],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message })
          res.status(201).json({ message: '✅ Review added!' })
        }
      )
    }
  )
}

// ── DELETE REVIEW ──────────────────────────────────────
exports.deleteReview = (req, res) => {
  db.query(
    'DELETE FROM reviews WHERE id=? AND user_id=?',
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message })
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Review not found!' })
      res.json({ message: '✅ Review deleted!' })
    }
  )
}