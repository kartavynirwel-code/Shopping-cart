// Small API client. Each browser gets a random session id stored in localStorage,
// which keys its cart on the server (no login needed for this basic app).
const getSessionId = () => {
  let id = localStorage.getItem('sessionId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('sessionId', id);
  }
  return id;
};

const sid = getSessionId();

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getProducts: () => request('/products'),
  getCart: () => request(`/cart/${sid}`),
  addToCart: (productId, quantity = 1) =>
    request(`/cart/${sid}/items`, { method: 'POST', body: JSON.stringify({ productId, quantity }) }),
  setQuantity: (productId, quantity) =>
    request(`/cart/${sid}/items/${productId}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),
  removeItem: (productId) => request(`/cart/${sid}/items/${productId}`, { method: 'DELETE' }),
  checkout: (details) => request(`/checkout/${sid}`, { method: 'POST', body: JSON.stringify(details) }),
};
