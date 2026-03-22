const Razorpay = require('razorpay');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/db');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── CREATE RAZORPAY ORDER ──────────────────────────────
exports.createRazorpayOrder = async (req, res) => {
  const { amount } = req.body;
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    });
    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── VERIFY RAZORPAY PAYMENT ────────────────────────────
exports.verifyRazorpay = (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

  const sign = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(sign)
    .digest('hex');

  if (expectedSign === razorpay_signature) {
    db.query(
      `UPDATE orders SET payment_status='paid',
       payment_id=? WHERE id=?`,
      [razorpay_payment_id, order_id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: '✅ Payment verified!' });
      }
    );
  } else {
    res.status(400).json({ error: 'Invalid signature!' });
  }
};

// ── CREATE STRIPE INTENT ───────────────────────────────
exports.createStripeIntent = async (req, res) => {
  const { amount } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'inr',
      automatic_payment_methods: { enabled: true }
    });
    res.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};