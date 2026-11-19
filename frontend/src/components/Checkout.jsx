import { useState } from 'react';

export default function Checkout({ cart, onSubmit, onBack }) {
  const [form, setForm] = useState({ name: '', email: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(form);
    setSubmitting(false);
  };

  return (
    <div className="panel">
      <h2>Checkout</h2>
      <p className="muted">
        {cart.items.length} item(s) · Total <strong>₹{cart.total.toFixed(2)}</strong>
      </p>
      <form onSubmit={submit} className="form">
        <label>Full name
          <input name="name" value={form.name} onChange={change} required />
        </label>
        <label>Email
          <input name="email" type="email" value={form.email} onChange={change} required />
        </label>
        <label>Shipping address
          <textarea name="address" rows="3" value={form.address} onChange={change} required />
        </label>
        <div className="actions">
          <button type="button" onClick={onBack}>Back to cart</button>
          <button className="primary" disabled={submitting}>
            {submitting ? 'Placing order...' : 'Place order'}
          </button>
        </div>
      </form>
    </div>
  );
}
