# Shopping Cart App (3-tier)

A basic shopping cart website split into three tiers:

| Tier | Tech | Folder |
|------|------|--------|
| Presentation | React 18 + Vite | `frontend/` |
| Application | Node.js + Express (REST API) | `backend/` |
| Data | PostgreSQL | `database/schema.sql` |

## Features
- Browse products with stock levels
- Add to cart, change quantity, remove items (cart is stored in the database per browser session)
- Checkout form creates an order, saves order items, reduces stock (in a transaction)

## Prerequisites
- Node.js 18+
- PostgreSQL 13+

## 1. Database
```bash
createdb -U postgres shopdb
psql -U postgres -d shopdb -f database/schema.sql
```
This creates the tables (`products`, `cart_items`, `orders`, `order_items`) and inserts 8 sample products.

## 2. Backend (port 5000)
```bash
cd backend
cp .env.example .env     # edit DB_USER / DB_PASSWORD if needed
npm install
npm start
```
Check it: http://localhost:5000/api/health

## 3. Frontend (port 5173)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. The Vite dev server proxies `/api` to the backend.

## API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Single product |
| GET | `/api/cart/:sessionId` | Get cart |
| POST | `/api/cart/:sessionId/items` | Add item `{productId, quantity}` |
| PUT | `/api/cart/:sessionId/items/:productId` | Set quantity `{quantity}` (0 removes) |
| DELETE | `/api/cart/:sessionId/items/:productId` | Remove item |
| POST | `/api/checkout/:sessionId` | Place order `{name, email, address}` |

## Project structure
```
shopping-cart-app/
├── database/schema.sql
├── backend/   (server.js, db.js, package.json, .env.example)
└── frontend/  (index.html, vite.config.js, src/...)
```
