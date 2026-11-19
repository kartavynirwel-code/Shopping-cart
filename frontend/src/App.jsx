import { useEffect, useState } from 'react';
import { api } from './api.js';
import ProductList from './components/ProductList.jsx';
import Cart from './components/Cart.jsx';
import Checkout from './components/Checkout.jsx';

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [view, setView] = useState('shop'); // shop | cart | checkout | done
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    try {
      const [p, c] = await Promise.all([api.getProducts(), api.getCart()]);
      setProducts(p);
      setCart(c);
      setError('');
    } catch (e) {
      setError('Cannot reach the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Run a cart action and refresh the cart state from its response
  const act = async (fn) => {
    try {
      setCart(await fn());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCheckout = async (details) => {
    try {
      const result = await api.checkout(details);
      setOrder(result);
      setView('done');
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  };

  const count = cart.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="app">
      <header className="header">
        <h1 onClick={() => setView('shop')}>QuickCart</h1>
        <nav>
          <button className="link" onClick={() => setView('shop')}>Shop</button>
          <button className="cart-btn" onClick={() => setView('cart')}>
            Cart <span className="badge">{count}</span>
          </button>
        </nav>
      </header>

      <main>
        {error && <div className="error">{error}</div>}
        {loading && <p>Loading...</p>}

        {!loading && view === 'shop' && (
          <ProductList products={products} onAdd={(id) => act(() => api.addToCart(id))} />
        )}
        {view === 'cart' && (
          <Cart
            cart={cart}
            onQty={(id, q) => act(() => api.setQuantity(id, q))}
            onRemove={(id) => act(() => api.removeItem(id))}
            onContinue={() => setView('shop')}
            onCheckout={() => setView('checkout')}
          />
        )}
        {view === 'checkout' && (
          <Checkout cart={cart} onSubmit={handleCheckout} onBack={() => setView('cart')} />
        )}
        {view === 'done' && order && (
          <div className="panel center">
            <h2>Thank you for your order!</h2>
            <p>Order #{order.id} was placed. Total: ₹{order.total.toFixed(2)}</p>
            <button className="primary" onClick={() => setView('shop')}>Continue shopping</button>
          </div>
        )}
      </main>
    </div>
  );
}
