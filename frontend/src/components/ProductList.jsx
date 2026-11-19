export default function ProductList({ products, onAdd }) {
  return (
    <>
      <h2>Products</h2>
      <div className="grid">
        {products.map((p) => (
          <div className="card" key={p.id}>
            <img src={p.image_url} alt={p.name} />
            <div className="card-body">
              <h3>{p.name}</h3>
              <p className="muted">{p.description}</p>
              <div className="row">
                <strong>₹{Number(p.price).toFixed(2)}</strong>
                <span className="muted small">{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</span>
              </div>
              <button className="primary" disabled={p.stock === 0} onClick={() => onAdd(p.id)}>
                Add to cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
