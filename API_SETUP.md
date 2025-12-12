# BodegaEinter API Integration Setup Guide

This guide explains how to connect the frontend to your existing backend API.

## Overview

The frontend is now configured to communicate with the BodegaEinter backend API running at `http://localhost:3000`. All API endpoints from `API.txt` are integrated and ready to use.

## Files Created

### 1. **src/lib/fetch.ts** - API Client
The core API client that handles all HTTP requests to the backend:
- `fetchAPI(path, options)` - Global function for making API calls
- `useFetch(url, options)` - React hook for data fetching with loading/error states
- Automatic error handling and JSON parsing
- Converts `/(api)/` prefix to `/api/` for backend compatibility

### 2. **src/lib/types.ts** - TypeScript Definitions
Complete TypeScript type definitions for all API endpoints:
- User types (User, UserLoginRequest, UserCreateRequest, etc.)
- Product types (Product, ProductCreateRequest, etc.)
- Supplier types (Supplier, SupplierCreateRequest, etc.)
- Inventory types (Inventory, InventoryCreateRequest, etc.)
- Receipt types (Receipt, ReceiptCreateRequest, ReceiptStats, etc.)
- Order types (Order, OrderCreateRequest, OrderDetail, etc.)
- Sales, Notification, and Movement types

### 3. **src/vite-env.d.ts** - Global Type Declarations
TypeScript declarations for:
- Environment variables (VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_API_BASE_URL)
- Global `fetchAPI` function

### 4. **.env.example** - Environment Configuration Template
Template for required environment variables.

## Setup Instructions

### Step 1: Create Environment File

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Auth0 Configuration (Required)
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id

# API Configuration
VITE_API_BASE_URL=http://localhost:3000
```

### Step 2: Ensure Backend is Running

Make sure your backend API server is running on `http://localhost:3000` (or the URL specified in `VITE_API_BASE_URL`).

The backend should have CORS configured to accept requests from your frontend origin (typically `http://localhost:5173` during development).

### Step 3: Install Dependencies (if needed)

```bash
npm install
```

### Step 4: Run the Development Server

```bash
npm run dev
```

The frontend will now connect to your backend API automatically.

## How It Works

### Making API Calls

The `fetchAPI` function is available globally throughout your application. Components use it like this:

```typescript
// GET request
const response = await fetchAPI('/(api)/productos?page=1&pageSize=20');

// POST request
const newProduct = await fetchAPI('/(api)/productos', {
  method: 'POST',
  body: JSON.stringify({
    master_sku: 'SKU-001',
    nombre_producto: 'Product Name',
    precio: 99.99
  })
});

// PUT request
await fetchAPI('/(api)/productos?id=1', {
  method: 'PUT',
  body: JSON.stringify({ precio: 149.99 })
});

// DELETE request
await fetchAPI('/(api)/productos?id=1', { method: 'DELETE' });
```

### Using the React Hook

For components that need loading and error states:

```typescript
import { useFetch } from './lib/fetch';

function MyComponent() {
  const { data, loading, error } = useFetch<Product[]>('/(api)/productos');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* render data */}</div>;
}
```

## API Endpoints

All endpoints from `API.txt` are available:

### Users API
- `POST /(api)/user` - Login
- `GET /(api)/user` - List users
- `GET /(api)/user?id=1` - Get user
- `PUT /(api)/user` - Create user
- `PATCH /(api)/user` - Update user
- `DELETE /(api)/user?id=1` - Delete user

### Products API
- `GET /(api)/productos` - List products (with pagination, search)
- `GET /(api)/productos?id=1` - Get product
- `POST /(api)/productos` - Create product
- `PUT /(api)/productos?id=1` - Update product
- `DELETE /(api)/productos?id=1` - Delete product

### Suppliers API
- `GET /(api)/proveedores` - List suppliers
- `GET /(api)/proveedores?id=1` - Get supplier
- `POST /(api)/proveedores` - Create supplier
- `PUT /(api)/proveedores?id=1` - Update supplier
- `DELETE /(api)/proveedores?id=1` - Delete supplier

### Inventory API
- `GET /(api)/inventario?id_articulo=1` - Get inventory
- `POST /(api)/inventario` - Create inventory
- `PUT /(api)/inventario?id=1` - Update inventory
- `DELETE /(api)/inventario?id=1` - Delete inventory

### Receipts API
- `GET /(api)/recibos` - List receipts
- `GET /(api)/recibos?stats=true` - Get statistics
- `POST /(api)/recibos` - Create receipt
- `GET /(api)/recibos/1` - Get receipt
- `PUT /(api)/recibos/1` - Update receipt
- `PATCH /(api)/recibos/1` - Toggle status
- `DELETE /(api)/recibos/1` - Delete receipt

### Orders API
- `GET /(api)/ordenes` - List orders
- `GET /(api)/ordenes?orden=12345` - Get order
- `POST /(api)/ordenes` - Create order
- `PUT /(api)/ordenes?orden=12345` - Update order
- `DELETE /(api)/ordenes?orden=12345` - Delete order

### Sales API
- `GET /(api)/ventas?type=ventas` - List sales
- `GET /(api)/ventas?type=recibos` - List receipts

### Misc API
- `GET /(api)/misc?type=notificaciones` - Get notifications
- `GET /(api)/misc?type=movimientos` - Get movements

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console, ensure your backend has CORS configured:

```javascript
// Backend Express.js example
app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true
}));
```

### Network Errors

If API calls fail with network errors:
1. Check that the backend is running
2. Verify `VITE_API_BASE_URL` in `.env` matches your backend URL
3. Check browser Network tab for request details

### TypeScript Errors

If you get TypeScript errors about `fetchAPI`:
- Make sure `src/vite-env.d.ts` exists
- Restart your TypeScript server in VS Code (Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server")

## Next Steps

Your frontend pages (Productos, Proveedores, Recibos, Ventas, etc.) are already configured to use these API endpoints. They will automatically start working once the backend is running and environment variables are configured.

Refer to `API.txt` for detailed endpoint specifications, request/response formats, and error codes.
