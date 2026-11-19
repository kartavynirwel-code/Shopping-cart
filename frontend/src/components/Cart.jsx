export default function Cart({ cart, onQty, onRemove, onContinue, onCheckout }) {
  if (!cart.items.length) {
    return (
      <div className="panel center">
        <h2>Your cart is empty</h2>
        <button className="primary" onClick={onContinue}>Browse products</button>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Your cart</h2>
      {cart.items.map((i) => (
        <div className="cart-row" key={i.product_id}>
          <img src={i.image_url} alt={i.name} />
          <div className="grow">
            <strong>{i.name}</strong>
            <div className="muted">₹{i.price.toFixed(2)} each</div>
          </div>
          <div className="qty">
            <button onClick={() => onQty(i.product_id, i.quantity - 1)}>−</button>
            <span>{i.quantity}</span>
            <button onClick={() => onQty(i.product_id, i.quantity + 1)} disabled={i.quantity >= i.stock}>+</button>
          </div>
          <div className="line-total">₹{(i.price * i.quantity).toFixed(2)}</div>
          <button className="link danger" onClick={() => onRemove(i.product_id)}>Remove</button>
        </div>
      ))}
      <div className="total-row">
        <span>Total</span>
        <strong>₹{cart.total.toFixed(2)}</strong>
      </div>
      <div className="actions">
        <button onClick={onContinue}>Continue shopping</button>
        <button className="primary" onClick={onCheckout}>Checkout</button>
      </div>
    </div>
  );
}
