require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Wrap async handlers so errors reach the error middleware
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api/health', wrap(async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
}));

// ---------- Products ----------
app.get('/api/products', wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY id');
  res.json(rows);
}));

app.get('/api/products/:id', wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Product not found' });
  res.json(rows[0]);
}));

// ---------- Cart ----------
const getCart = async (sessionId) => {
  const { rows } = await pool.query(
    `SELECT c.product_id, c.quantity, p.name, p.price, p.image_url, p.stock
       FROM cart_items c
       JOIN products p ON p.id = c.product_id
      WHERE c.session_id = $1
      ORDER BY c.added_at`,
    [sessionId]
  );
  const items = rows.map((r) => ({ ...r, price: Number(r.price) }));
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return { items, total: Number(total.toFixed(2)) };
};

app.get('/api/cart/:sessionId', wrap(async (req, res) => {
  res.json(await getCart(req.params.sessionId));
}));

// Add (or increase) an item in the cart
app.post('/api/cart/:sessionId/items', wrap(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const qty = Number(quantity);
  if (!productId || !Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({ error: 'productId and a positive integer quantity are required' });
  }
  const product = await pool.query('SELECT stock FROM products WHERE id = $1', [productId]);
  if (!product.rows.length) return res.status(404).json({ error: 'Product not found' });

  const existing = await pool.query(
    'SELECT quantity FROM cart_items WHERE session_id = $1 AND product_id = $2',
    [req.params.sessionId, productId]
  );
  const newQty = (existing.rows[0]?.quantity || 0) + qty;
  if (newQty > product.rows[0].stock) {
    return res.status(400).json({ error: 'Not enough stock available' });
  }
  await pool.query(
    `INSERT INTO cart_items (session_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (session_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
    [req.params.sessionId, productId, newQty]
  );
  res.status(201).json(await getCart(req.params.sessionId));
}));

// Set the quantity of an item
app.put('/api/cart/:sessionId/items/:productId', wrap(async (req, res) => {
  const qty = Number(req.body.quantity);
  if (!Number.isInteger(qty) || qty < 0) {
    return res.status(400).json({ error: 'quantity must be a non-negative integer' });
  }
  if (qty === 0) {
    await pool.query('DELETE FROM cart_items WHERE session_id = $1 AND product_id = $2',
      [req.params.sessionId, req.params.productId]);
  } else {
    const product = await pool.query('SELECT stock FROM products WHERE id = $1', [req.params.productId]);
    if (!product.rows.length) return res.status(404).json({ error: 'Product not found' });
    if (qty > product.rows[0].stock) return res.status(400).json({ error: 'Not enough stock available' });
    await pool.query(
      'UPDATE cart_items SET quantity = $1 WHERE session_id = $2 AND product_id = $3',
      [qty, req.params.sessionId, req.params.productId]
    );
  }
  res.json(await getCart(req.params.sessionId));
}));

app.delete('/api/cart/:sessionId/items/:productId', wrap(async (req, res) => {
  await pool.query('DELETE FROM cart_items WHERE session_id = $1 AND product_id = $2',
    [req.params.sessionId, req.params.productId]);
  res.json(await getCart(req.params.sessionId));
}));

// ---------- Checkout ----------
app.post('/api/checkout/:sessionId', wrap(async (req, res) => {
  const { name, email, address } = req.body;
  if (!name || !email || !address) {
    return res.status(400).json({ error: 'name, email and address are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the product rows so concurrent checkouts can't oversell
    const { rows: items } = await client.query(
      `SELECT c.product_id, c.quantity, p.name, p.price, p.stock
         FROM cart_items c
         JOIN products p ON p.id = c.product_id
        WHERE c.session_id = $1
        FOR UPDATE OF p`,
      [req.params.sessionId]
    );
    if (!items.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cart is empty' });
    }
    for (const i of items) {
      if (i.quantity > i.stock) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Not enough stock for ${i.name}` });
      }
    }

    const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
    const order = await client.query(
      `INSERT INTO orders (customer_name, customer_email, address, total)
       VALUES ($1, $2, $3, $4) RETURNING id, total, status, created_at`,
      [name, email, address, total.toFixed(2)]
    );
    const orderId = order.rows[0].id;

    for (const i of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name, price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, i.product_id, i.name, i.price, i.quantity]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [i.quantity, i.product_id]);
    }
    await client.query('DELETE FROM cart_items WHERE session_id = $1', [req.params.sessionId]);

    await client.query('COMMIT');
    res.status(201).json({ ...order.rows[0], total: Number(order.rows[0].total) });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// ---------- Error handling ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
