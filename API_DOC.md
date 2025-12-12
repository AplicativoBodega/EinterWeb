# BodegaEinter API Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Configuration](#database-configuration)
3. [API Helpers & Utilities](#api-helpers--utilities)
4. [Endpoints](#endpoints)
   - [Productos (Products)](#productos-products)
   - [Proveedores (Suppliers)](#proveedores-suppliers)
   - [Inventario (Inventory)](#inventario-inventory)
   - [Recibos (Receipts)](#recibos-receipts)
   - [Ventas (Sales)](#ventas-sales)
   - [Órdenes (Orders)](#órdenes-orders)
   - [Misc (Notifications & Movements)](#misc-notifications--movements)
5. [Type Definitions](#type-definitions)
6. [Error Handling](#error-handling)

---

## Architecture Overview

### Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: File-based routing (Vite-style API routes)
- **Database**: MySQL 2 with Promise support (`mysql2/promise`)
- **Connection Pool**: Up to 50 concurrent connections
- **Response Format**: Standard Web API `Response.json()`

### Project Structure
```
BodegaEinterApp/
├── api/                           # Backend API routes
│   ├── lib/
│   │   ├── helpers.ts            # API utilities
│   │   └── types.ts              # API response interfaces
│   ├── inventario/
│   │   └── route.ts              # Inventory endpoints
│   ├── productos/
│   │   └── route.ts              # Products endpoints
│   ├── proveedores/
│   │   └── route.ts              # Suppliers endpoints
│   ├── recibos/
│   │   └── route.ts              # Receipts endpoints (stubs)
│   ├── ventas/
│   │   └── route.ts              # Sales endpoints (stubs)
│   ├── ordenes/
│   │   └── route.ts              # Orders endpoints (stubs)
│   └── misc/
│       └── route.ts              # Misc endpoints (stubs)
└── lib/
    ├── pool.ts                    # Database connection pool
    └── fetch.ts                   # Frontend fetch utilities
```

### Routing Pattern
Each resource uses a `route.ts` file that exports HTTP method handlers:
```typescript
export async function GET(request: Request) { ... }
export async function POST(request: Request) { ... }
export async function PUT(request: Request) { ... }
export async function DELETE(request: Request) { ... }
export async function PATCH(request: Request) { ... }
```

### Standard Response Format
```typescript
interface ApiResponse<T> {
  data?: T;                    // Single item response
  items?: T[];                 // List response
  pagination?: {               // Pagination metadata
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  ok?: boolean;                // Success flag
  id?: number;                 // Created/updated item ID
  message?: string;            // Success message
  error?: string;              // Error message
  status?: number;             // HTTP status code
}
```

---

## Database Configuration

### Location
`lib/pool.ts`

### Environment Variables
```bash
DB_HOST=<database_host>
DB_PORT=3306                              # Default: 3306
DB_USER=<database_user>
DB_PASSWORD=<database_password>
DB_DATABASE=<database_name>
DB_SSL=false                              # Optional: Enable SSL
DB_SSL_REJECT_UNAUTHORIZED=true           # Optional: Verify SSL cert
```

### Connection Pool Configuration
```typescript
{
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 50,                    // Max 50 connections
  maxIdle: 10,                            // Max 10 idle connections
  idleTimeout: 60000,                     // 60s idle timeout
  queueLimit: 0,                          // Unlimited queue
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 60000,                  // 60s connection timeout
  namedPlaceholders: true,                // Use :paramName style
  ssl: <conditional>                      // SSL based on env vars
}
```

### Database Tables Schema

#### articulos
```sql
CREATE TABLE articulos (
  id_articulo INT PRIMARY KEY AUTO_INCREMENT,
  master_sku VARCHAR(255) NOT NULL,
  nombre_producto VARCHAR(255) NOT NULL,
  foto VARCHAR(512),
  largo_cm DECIMAL(10,2) DEFAULT 0,
  ancho_cm DECIMAL(10,2) DEFAULT 0,
  alto_cm DECIMAL(10,2) DEFAULT 0,
  peso_kg DECIMAL(10,2) DEFAULT 0,
  existencias INT DEFAULT 0,
  precio DECIMAL(10,2) DEFAULT 0,
  costo DECIMAL(10,2) DEFAULT 0,
  id_proveedor INT,
  FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor)
);
```

#### proveedores
```sql
CREATE TABLE proveedores (
  id_proveedor INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(255) NOT NULL,
  ciudad VARCHAR(255),
  tiempo_envio INT DEFAULT 0
);
```

#### inventario
```sql
CREATE TABLE inventario (
  id_inventario INT PRIMARY KEY AUTO_INCREMENT,
  id_articulo INT NOT NULL,
  id_ubicacion INT NOT NULL,
  tarimas INT DEFAULT 0,
  std_inv_t INT DEFAULT 0,
  t_completas INT DEFAULT 0,
  t_distintas INT DEFAULT 0,
  escaneado BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_articulo) REFERENCES articulos(id_articulo),
  FOREIGN KEY (id_ubicacion) REFERENCES ubicaciones(id_ubicacion)
);
```

#### ubicaciones
```sql
CREATE TABLE ubicaciones (
  id_ubicacion INT PRIMARY KEY AUTO_INCREMENT,
  nombre_ubicacion VARCHAR(255) NOT NULL
);
```

---

## API Helpers & Utilities

### Location
`api/lib/helpers.ts`

### Functions

#### `httpError(status: number, message: string)`
Creates an error object with a custom status code.

```typescript
const error = httpError(404, "Resource not found");
throw error;
```

#### `parsePagination(pageIn?: number | string, pageSizeIn?: number | string)`
Parses and validates pagination parameters.

**Parameters:**
- `pageIn` - Page number (default: 1)
- `pageSizeIn` - Items per page (default: 20)

**Returns:**
```typescript
{
  page: number;        // Validated page number (min: 1)
  pageSize: number;    // Validated page size (min: 1)
  offset: number;      // SQL OFFSET value
  limit: number;       // SQL LIMIT value
}
```

#### `handleApiError(error: any): Response`
Formats errors into standardized API responses.

**Returns:**
```typescript
Response.json(
  { error: message },
  { status: statusCode }
)
```

#### `safeParseJSON(request: Request)`
Safely parses JSON request bodies with error handling.

**Throws:** 400 error if JSON is invalid

#### `isZeroOneString(v: any): v is "0" | "1"`
Type guard for binary string values.

#### `normalizeOrden(orden: string | number | bigint): string`
Normalizes order numbers to strings.

---

## Endpoints

### Productos (Products)

**Base URL:** `/api/productos`

**Status:** ✅ Fully Implemented

#### GET `/api/productos`
List all products with optional search and pagination.

**Query Parameters:**
```typescript
{
  search?: string;           // Search by name or SKU
  withStock?: string;        // "1" to filter items with stock > 0
  page?: number;             // Page number (default: 1)
  pageSize?: number;         // Items per page (default: 20)
}
```

**Response (200):**
```typescript
{
  page: number;
  pageSize: number;
  total: number;
  items: ArticuloResponse[];
}
```

**Example:**
```bash
GET /api/productos?search=laptop&page=1&pageSize=20
```

#### GET `/api/productos?id={id}`
Get a single product by ID with location details.

**Query Parameters:**
```typescript
{
  id: number;                // Product ID (required)
}
```

**Response (200):**
```typescript
{
  id: number;
  sku: string;
  name: string;
  photo: string | null;
  dimensions_cm: {
    largo: number;
    ancho: number;
    alto: number;
  };
  weight_kg: number;
  stock: number;
  price: number;
  cost: number;
  supplier: {
    id: number;
    name: string;
  } | null;
  locations: Array<{
    id_ubicacion: number;
    nombre: string;
    tarimas: number;
    completas: number;
    distintas: number;
    escaneado: boolean;
  }>;
}
```

**Response (404):**
```typescript
{
  error: "Artículo no encontrado"
}
```

**Example:**
```bash
GET /api/productos?id=123
```

#### POST `/api/productos`
Create a new product.

**Request Body:**
```typescript
{
  master_sku: string;              // Required
  nombre_producto: string;         // Required
  foto?: string | null;
  largo_cm?: number;               // Default: 0
  ancho_cm?: number;               // Default: 0
  alto_cm?: number;                // Default: 0
  peso_kg?: number;                // Default: 0
  existencias?: number;            // Default: 0
  precio?: number;                 // Default: 0
  costo?: number;                  // Default: 0
  id_proveedor?: number | null;
}
```

**Response (201):**
```typescript
{
  ok: true;
  id: number;                      // New product ID
  message: "Artículo creado exitosamente";
}
```

**Response (400):**
```typescript
{
  error: "master_sku y nombre_producto son requeridos"
}
```

**Example:**
```bash
POST /api/productos
Content-Type: application/json

{
  "master_sku": "LAP-001",
  "nombre_producto": "Laptop Dell XPS 15",
  "precio": 1500.00,
  "costo": 1200.00,
  "existencias": 10,
  "id_proveedor": 5
}
```

#### PUT `/api/productos?id={id}`
Update an existing product.

**Query Parameters:**
```typescript
{
  id: number;                      // Product ID (required)
}
```

**Request Body (all fields optional):**
```typescript
{
  master_sku?: string;
  nombre_producto?: string;
  foto?: string | null;
  largo_cm?: number;
  ancho_cm?: number;
  alto_cm?: number;
  peso_kg?: number;
  existencias?: number;
  precio?: number;
  costo?: number;
  id_proveedor?: number | null;
}
```

**Response (200):**
```typescript
{
  ok: true;
  id: number;
  message: "Artículo actualizado exitosamente";
}
```

**Response (400):**
```typescript
{
  error: "ID es requerido"
}
// or
{
  error: "No hay campos para actualizar"
}
```

**Response (404):**
```typescript
{
  error: "Artículo no encontrado"
}
```

**Example:**
```bash
PUT /api/productos?id=123
Content-Type: application/json

{
  "precio": 1600.00,
  "existencias": 8
}
```

#### DELETE `/api/productos?id={id}`
Delete a product.

**Query Parameters:**
```typescript
{
  id: number;                      // Product ID (required)
}
```

**Response (200):**
```typescript
{
  ok: true;
  message: "Artículo eliminado exitosamente";
}
```

**Response (400):**
```typescript
{
  error: "ID es requerido"
}
```

**Response (404):**
```typescript
{
  error: "Artículo no encontrado"
}
```

**Example:**
```bash
DELETE /api/productos?id=123
```

---

### Proveedores (Suppliers)

**Base URL:** `/api/proveedores`

**Status:** ✅ Fully Implemented

#### GET `/api/proveedores`
List all suppliers.

**Query Parameters:** None

**Response (200):**
```typescript
{
  items: Array<{
    id: number;
    name: string;
    city: string | null;
    lead_time: number | null;      // Delivery time in days
  }>;
}
```

**Example:**
```bash
GET /api/proveedores
```

#### GET `/api/proveedores?id={id}`
Get a single supplier by ID.

**Query Parameters:**
```typescript
{
  id: number;                      // Supplier ID (required)
}
```

**Response (200):**
```typescript
{
  id: number;
  name: string;
  city: string | null;
  lead_time: number | null;
}
```

**Response (404):**
```typescript
{
  error: "Proveedor no encontrado"
}
```

**Example:**
```bash
GET /api/proveedores?id=5
```

#### POST `/api/proveedores`
Create a new supplier.

**Request Body:**
```typescript
{
  nombre: string;                  // Required
  ciudad?: string | null;
  tiempo_envio?: number;           // Default: 0 (days)
}
```

**Response (201):**
```typescript
{
  ok: true;
  id: number;                      // New supplier ID
  message: "Proveedor creado exitosamente";
}
```

**Response (400):**
```typescript
{
  error: "nombre es requerido"
}
```

**Example:**
```bash
POST /api/proveedores
Content-Type: application/json

{
  "nombre": "Tech Supplies Inc",
  "ciudad": "Ciudad de México",
  "tiempo_envio": 5
}
```

#### PUT `/api/proveedores?id={id}`
Update an existing supplier.

**Query Parameters:**
```typescript
{
  id: number;                      // Supplier ID (required)
}
```

**Request Body (all fields optional):**
```typescript
{
  nombre?: string;
  ciudad?: string | null;
  tiempo_envio?: number;
}
```

**Response (200):**
```typescript
{
  ok: true;
  id: number;
  message: "Proveedor actualizado exitosamente";
}
```

**Response (400):**
```typescript
{
  error: "ID es requerido"
}
// or
{
  error: "No hay campos para actualizar"
}
```

**Response (404):**
```typescript
{
  error: "Proveedor no encontrado"
}
```

**Example:**
```bash
PUT /api/proveedores?id=5
Content-Type: application/json

{
  "tiempo_envio": 7
}
```

#### DELETE `/api/proveedores?id={id}`
Delete a supplier.

**Query Parameters:**
```typescript
{
  id: number;                      // Supplier ID (required)
}
```

**Response (200):**
```typescript
{
  ok: true;
  message: "Proveedor eliminado exitosamente";
}
```

**Response (400):**
```typescript
{
  error: "ID es requerido"
}
```

**Response (404):**
```typescript
{
  error: "Proveedor no encontrado"
}
```

**Example:**
```bash
DELETE /api/proveedores?id=5
```

---

### Inventario (Inventory)

**Base URL:** `/api/inventario`

**Status:** ✅ Fully Implemented

#### GET `/api/inventario?id_articulo={id}`
Get inventory locations for a specific product.

**Query Parameters:**
```typescript
{
  id_articulo: number;             // Product ID (required)
}
```

**Response (200):**
```typescript
{
  id_articulo: number;
  ubicaciones: Array<{
    id_inventario: number;
    id_ubicacion: number;
    nombre: string;
    tarimas: number;
    std_tarimas: number;
    completas: number;
    distintas: number;
    escaneado: boolean;
    updated_at: string;            // ISO timestamp
  }>;
}
```

**Response (400):**
```typescript
{
  error: "id_articulo es requerido"
}
```

**Example:**
```bash
GET /api/inventario?id_articulo=123
```

#### POST `/api/inventario`
Create a new inventory entry.

**Request Body:**
```typescript
{
  id_articulo: number;             // Required
  id_ubicacion: number;            // Required
  tarimas?: number;                // Default: 0
  std_inv_t?: number;              // Default: 0
  t_completas?: number;            // Default: 0
  t_distintas?: number;            // Default: 0
  escaneado?: boolean | 0 | 1;    // Default: false
}
```

**Response (201):**
```typescript
{
  ok: true;
  id: number;                      // New inventory ID
  message: "Inventario creado exitosamente";
}
```

**Response (400):**
```typescript
{
  error: "id_articulo e id_ubicacion son requeridos"
}
```

**Example:**
```bash
POST /api/inventario
Content-Type: application/json

{
  "id_articulo": 123,
  "id_ubicacion": 5,
  "tarimas": 10,
  "t_completas": 8,
  "t_distintas": 2,
  "escaneado": true
}
```

#### PUT `/api/inventario?id={id}`
Update an existing inventory entry.

**Query Parameters:**
```typescript
{
  id: number;                      // Inventory ID (required)
}
```

**Request Body (all fields optional):**
```typescript
{
  tarimas?: number;
  std_inv_t?: number;
  t_completas?: number;
  t_distintas?: number;
  escaneado?: boolean | 0 | 1;
}
```

**Response (200):**
```typescript
{
  ok: true;
  id: number;
  message: "Inventario actualizado exitosamente";
}
```

**Response (400):**
```typescript
{
  error: "ID es requerido"
}
// or
{
  error: "No hay campos para actualizar"
}
```

**Response (404):**
```typescript
{
  error: "Inventario no encontrado"
}
```

**Note:** The `updated_at` field is automatically updated to NOW() on every update.

**Example:**
```bash
PUT /api/inventario?id=456
Content-Type: application/json

{
  "tarimas": 12,
  "escaneado": true
}
```

#### DELETE `/api/inventario?id={id}`
Delete an inventory entry.

**Query Parameters:**
```typescript
{
  id: number;                      // Inventory ID (required)
}
```

**Response (200):**
```typescript
{
  ok: true;
  message: "Inventario eliminado exitosamente";
}
```

**Response (400):**
```typescript
{
  error: "ID es requerido"
}
```

**Response (404):**
```typescript
{
  error: "Inventario no encontrado"
}
```

**Example:**
```bash
DELETE /api/inventario?id=456
```

---

### Recibos (Receipts)

**Base URL:** `/api/recibos`

**Status:** ⚠️ Not Implemented (Stubs Only)

#### GET `/api/recibos`
List receipts with optional pagination.

**Query Parameters:**
```typescript
{
  stats?: "true";                  // Get receipt statistics
  page?: number;
  pageSize?: number;
}
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

**Planned Response (200):**
```typescript
{
  page: number;
  pageSize: number;
  total: number;
  items: Array<{
    id: number;
    proveedor: string;
    id_orden: number;
    precio: number;
    fecha_compra: string;
    fecha_llegada: string;
    recibido: boolean;
  }>;
}
```

#### GET `/api/recibos?stats=true`
Get receipt statistics.

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

**Planned Response (200):**
```typescript
{
  total: number;
  pendientes: number;
  recibidos: number;
  valor_total: number;
}
```

#### POST `/api/recibos`
Create a new receipt.

**Request Body:**
```typescript
{
  proveedor?: string;
  id_orden?: number;
  precio?: number;
  fecha_compra?: string;           // ISO date
  fecha_llegada?: string;          // ISO date
  recibido?: boolean;
}
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

**Planned Response (201):**
```typescript
{
  ok: true;
  id: number;
  message: "Recibo creado exitosamente";
}
```

#### PUT `/api/recibos?id={id}`
Update an existing receipt.

**Query Parameters:**
```typescript
{
  id: number;                      // Receipt ID (required)
}
```

**Request Body:**
```typescript
{
  proveedor?: string;
  id_orden?: number;
  precio?: number;
  fecha_compra?: string;
  fecha_llegada?: string;
  recibido?: boolean;
}
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

#### PATCH `/api/recibos?id={id}`
Toggle receipt status (received/not received).

**Query Parameters:**
```typescript
{
  id: number;                      // Receipt ID (required)
}
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

**Planned Response (200):**
```typescript
{
  ok: true;
  id: number;
  recibido: boolean;
}
```

#### DELETE `/api/recibos?id={id}`
Delete a receipt.

**Query Parameters:**
```typescript
{
  id: number;                      // Receipt ID (required)
}
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

---

### Ventas (Sales)

**Base URL:** `/api/ventas`

**Status:** ⚠️ Not Implemented (Stubs Only)

**Note:** This endpoint also handles receipts via a `type` parameter.

#### GET `/api/ventas`
List sales or receipts with pagination.

**Query Parameters:**
```typescript
{
  type?: "ventas" | "recibos";     // Default: "ventas"
  page?: number;
  pageSize?: number;
}
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

**Planned Response (200):**
```typescript
{
  page: number;
  pageSize: number;
  total: number;
  items: Array<SaleOrReceiptObject>;
}
```

#### POST `/api/ventas`
Create a new sale or receipt.

**Query Parameters:**
```typescript
{
  type?: "ventas" | "recibos";     // Default: "ventas"
}
```

**Request Body:**
```typescript
// Depends on type parameter
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

#### PUT `/api/ventas?id={id}`
Update a sale or receipt.

**Query Parameters:**
```typescript
{
  id: number;                      // Sale/Receipt ID (required)
  type?: "ventas" | "recibos";     // Default: "ventas"
}
```

**Request Body:**
```typescript
// Depends on type parameter
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

#### PATCH `/api/ventas?id={id}`
Toggle receipt status (only for type=recibos).

**Query Parameters:**
```typescript
{
  id: number;                      // Receipt ID (required)
  type: "recibos";                 // Required for PATCH
}
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

#### DELETE `/api/ventas?id={id}`
Delete a sale or receipt.

**Query Parameters:**
```typescript
{
  id: number;                      // Sale/Receipt ID (required)
  type?: "ventas" | "recibos";     // Default: "ventas"
}
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

---

### Órdenes (Orders)

**Base URL:** `/api/ordenes`

**Status:** ⚠️ Not Implemented (Stubs Only)

#### GET `/api/ordenes`
List all orders with pagination.

**Query Parameters:**
```typescript
{
  page?: number;
  pageSize?: number;
  tipo?: number;                   // Order type filter
}
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

**Planned Response (200):**
```typescript
{
  page: number;
  pageSize: number;
  total: number;
  items: Array<{
    orden: string;
    tipo: number;
    fecha_estimada: string | null;
    detalle: Array<{
      id_articulo: number;
      cantidad: number;
      fecha_estimada: string | null;
    }>;
  }>;
}
```

#### GET `/api/ordenes?orden={orden}`
Get a single order by order number.

**Query Parameters:**
```typescript
{
  orden: string | number;          // Order number (required)
}
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

#### POST `/api/ordenes`
Create a new order.

**Request Body:**
```typescript
{
  orden: string | number | bigint; // Required
  tipo: number | string;           // Required
  fecha_estimada?: string | null;  // ISO date
  detalle: Array<{                 // Required, order items
    id_articulo: number;
    cantidad?: number;
    fecha_estimada?: string | null;
  }>;
}
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

**Planned Response (201):**
```typescript
{
  ok: true;
  orden: string;
  message: "Orden creada exitosamente";
}
```

#### PUT `/api/ordenes?orden={orden}`
Update an existing order.

**Query Parameters:**
```typescript
{
  orden: string | number;          // Order number (required)
}
```

**Request Body:**
```typescript
{
  tipo?: number | string;
  fecha_estimada?: string | null;
  detalle?: Array<{
    id_articulo: number;
    cantidad?: number;
    fecha_estimada?: string | null;
  }>;
}
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

#### DELETE `/api/ordenes?orden={orden}`
Delete an order.

**Query Parameters:**
```typescript
{
  orden: string | number;          // Order number (required)
}
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

---

### Misc (Notifications & Movements)

**Base URL:** `/api/misc`

**Status:** ⚠️ Not Implemented (Stubs Only)

#### GET `/api/misc`
Get notifications or movement history.

**Query Parameters:**
```typescript
{
  type?: "notificaciones" | "movimientos";  // Default: "notificaciones"
  page?: number;
  pageSize?: number;
  leido?: string | number | boolean;        // Filter by read status (notificaciones)
  tipo?: string | number;                   // Filter by movement type (movimientos)
}
```

**Response (501):**
```typescript
{
  error: "Not implemented"
}
```

**Planned Response (200) for notificaciones:**
```typescript
{
  page: number;
  pageSize: number;
  total: number;
  items: Array<{
    id: number;
    mensaje: string;
    fecha: string;
    leido: boolean;
  }>;
}
```

**Planned Response (200) for movimientos:**
```typescript
{
  page: number;
  pageSize: number;
  total: number;
  items: Array<{
    id: number;
    tipo: number;
    descripcion: string;
    fecha: string;
    usuario: string;
  }>;
}
```

---

## Type Definitions

### API Response Types

**Location:** `api/lib/types.ts`

```typescript
export interface ApiPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data?: T;
  items?: T[];
  pagination?: ApiPaginationMeta;
  ok?: boolean;
  id?: number;
  message?: string;
  error?: string;
  status?: number;
}

export type PageQuery = {
  page?: number | string;
  pageSize?: number | string;
};
```

### Productos Types

**Location:** `api/productos/route.ts`

```typescript
export type ListQuery = {
  search?: string;
  withStock?: string | number | boolean;
  page?: number | string;
  pageSize?: number | string;
};

export type ArticuloCreate = {
  master_sku: string;
  nombre_producto: string;
  foto?: string | null;
  largo_cm?: number;
  ancho_cm?: number;
  alto_cm?: number;
  peso_kg?: number;
  existencias?: number;
  precio?: number;
  costo?: number;
  id_proveedor?: number | null;
};

export type ArticuloUpdate = Partial<ArticuloCreate>;

export type ArticuloResponse = {
  id: number;
  sku: string;
  name: string;
  photo: string | null;
  dimensions_cm: {
    largo: number;
    ancho: number;
    alto: number;
  };
  weight_kg: number;
  stock: number;
  price: number;
  cost: number;
  supplier: { id: number; name: string } | null;
  locations?: Array<{
    id_ubicacion: number;
    nombre: string;
    tarimas: number;
    completas: number;
    distintas: number;
    escaneado: boolean;
  }>;
};
```

### Proveedores Types

**Location:** `api/proveedores/route.ts`

```typescript
export type ProveedorCreate = {
  nombre: string;
  ciudad?: string | null;
  tiempo_envio?: number;
};

export type ProveedorUpdate = Partial<ProveedorCreate>;

export type ProveedorResponse = {
  id: number;
  name: string;
  city: string | null;
  lead_time: number | null;
};
```

### Inventario Types

**Location:** `api/inventario/route.ts`

```typescript
export type InventarioCreate = {
  id_articulo: number;
  id_ubicacion: number;
  tarimas?: number;
  std_inv_t?: number;
  t_completas?: number;
  t_distintas?: number;
  escaneado?: boolean | 0 | 1;
};

export type InventarioUpdate = Partial<
  Pick<
    InventarioCreate,
    "tarimas" | "std_inv_t" | "t_completas" | "t_distintas" | "escaneado"
  >
>;
```

### Recibos Types

**Location:** `api/recibos/route.ts`

```typescript
export type ReciboCreateInput = {
  proveedor?: string;
  id_orden?: number;
  precio?: number;
  fecha_compra?: string;
  fecha_llegada?: string;
  recibido?: boolean;
};

export type ReciboUpdateInput = {
  proveedor?: string;
  id_orden?: number;
  precio?: number;
  fecha_compra?: string;
  fecha_llegada?: string;
  recibido?: boolean;
};
```

### Órdenes Types

**Location:** `api/ordenes/route.ts`

```typescript
export type OrdenCreateInput = {
  orden: string | number | bigint;
  tipo: number | string;
  fecha_estimada?: string | null;
  detalle: Array<{
    id_articulo: number;
    cantidad?: number;
    fecha_estimada?: string | null;
  }>;
};

export type OrdenUpdateInput = {
  tipo?: number | string;
  fecha_estimada?: string | null;
  detalle?: Array<{
    id_articulo: number;
    cantidad?: number;
    fecha_estimada?: string | null;
  }>;
};

export type ListOrdenesQuery = {
  page?: number | string;
  pageSize?: number | string;
  tipo?: number | string;
};
```

### Misc Types

**Location:** `api/misc/route.ts`

```typescript
export type PageQuery = {
  page?: number | string;
  pageSize?: number | string;
};

export type NotifsQuery = PageQuery & {
  leido?: string | number | boolean;
};

export type MovsQuery = PageQuery & {
  tipo?: string | number;
};
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```typescript
{
  error: string;       // Error message
  status?: number;     // HTTP status code (optional)
}
```

### HTTP Status Codes

- **200** - Success
- **201** - Resource created
- **400** - Bad request (invalid input, missing required fields)
- **404** - Resource not found
- **500** - Internal server error
- **501** - Not implemented (stub endpoints)

### Common Error Messages

#### 400 Bad Request
```typescript
{ error: "Invalid JSON in request body" }
{ error: "ID es requerido" }
{ error: "master_sku y nombre_producto son requeridos" }
{ error: "nombre es requerido" }
{ error: "id_articulo e id_ubicacion son requeridos" }
{ error: "No hay campos para actualizar" }
{ error: "orden es requerido" }
```

#### 404 Not Found
```typescript
{ error: "Artículo no encontrado" }
{ error: "Proveedor no encontrado" }
{ error: "Inventario no encontrado" }
```

#### 500 Internal Server Error
```typescript
{ error: "Error processing request" }
{ error: <specific_error_message> }
```

#### 501 Not Implemented
```typescript
{ error: "Not implemented" }
```

### Error Handling Flow

1. **Request Validation**
   - Validate required query parameters
   - Parse and validate JSON body
   - Check for required fields

2. **Business Logic Validation**
   - Check if resources exist
   - Validate field values
   - Check for updates (at least one field)

3. **Database Operations**
   - Execute queries with named placeholders
   - Handle connection errors
   - Handle constraint violations

4. **Response Formatting**
   - Use `handleApiError()` for consistent error responses
   - Log errors to console
   - Return appropriate HTTP status codes

### Example Error Handling Pattern

```typescript
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      throw httpError(400, "ID es requerido");
    }

    const result = await getResourceById(Number(id));
    return Response.json(result);
  } catch (error: any) {
    return handleApiError(error);
  }
}
```

---

## Frontend Integration

### Fetch Utility

**Location:** `lib/fetch.ts`

```typescript
export const fetchAPI = async (url: string, options?: RequestInit) => {
  // Handles full URLs, relative URLs, and API base URL
  // Validates JSON responses
  // Throws on HTTP errors
  // Returns parsed JSON
};

export const useFetch = <T>(url: string, options?: RequestInit) => {
  // React hook for data fetching
  // Returns: { data, loading, error, refetch }
};
```

### API Base URL Pattern

The API uses file-based routing where endpoints are automatically mapped:

```
/api/productos   → api/productos/route.ts
/api/proveedores → api/proveedores/route.ts
/api/inventario  → api/inventario/route.ts
/api/recibos     → api/recibos/route.ts
/api/ventas      → api/ventas/route.ts
/api/ordenes     → api/ordenes/route.ts
/api/misc        → api/misc/route.ts
```

### Example Frontend Usage

```typescript
// List products
const response = await fetchAPI('/api/productos?page=1&pageSize=20');

// Get single product
const product = await fetchAPI('/api/productos?id=123');

// Create product
const newProduct = await fetchAPI('/api/productos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    master_sku: 'LAP-001',
    nombre_producto: 'Laptop Dell XPS 15',
    precio: 1500.00
  })
});

// Update product
const updated = await fetchAPI('/api/productos?id=123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    precio: 1600.00
  })
});

// Delete product
await fetchAPI('/api/productos?id=123', { method: 'DELETE' });
```

---

## Running the API

### Development

```bash
npm run dev
```

Starts Vite dev server with API routes enabled.

### Build

```bash
npm run build
```

Compiles TypeScript and builds production bundle.

### Preview

```bash
npm run preview
```

Preview production build locally.

---

## Dependencies

### Runtime Dependencies

```json
{
  "mysql2": "^3.15.3",
  "react": "^19.2.0",
  "react-dom": "^19.2.0"
}
```

### Development Dependencies

```json
{
  "@types/node": "^24.10.2",
  "@vitejs/plugin-react": "^5.1.1",
  "typescript": "~5.9.3",
  "vite": "^7.2.4",
  "vite-tsconfig-paths": "^5.1.4"
}
```

---

## Notes

1. **Named Placeholders**: All SQL queries use named placeholders (`:paramName`) for security
2. **Connection Pool**: Shared pool across all endpoints with 50 max connections
3. **Automatic Timestamps**: Inventory table updates `updated_at` automatically
4. **Stub Endpoints**: Recibos, Ventas, Órdenes, and Misc endpoints return 501 (Not Implemented)
5. **Type Safety**: Full TypeScript support throughout
6. **Error Logging**: All errors logged to console before response
7. **No Middleware**: Error handling done inline in route handlers
8. **File-Based Routing**: Follows Vite/Vercel-style API routes pattern

---

## Migration Checklist

When moving this API to a separate project:

- [ ] Copy entire `api/` directory
- [ ] Copy `lib/pool.ts` (database connection)
- [ ] Set up `.env` file with database credentials
- [ ] Install dependencies: `mysql2`
- [ ] Configure API routing in new framework
- [ ] Implement stub endpoints (Recibos, Ventas, Órdenes, Misc)
- [ ] Set up database schema (tables listed above)
- [ ] Test all endpoints
- [ ] Update frontend fetch URLs to point to new API host
- [ ] Set up CORS if API is on different domain
- [ ] Configure production environment variables

---

## API Testing Examples

### cURL Examples

```bash
# List products
curl -X GET "http://localhost:5173/api/productos?page=1&pageSize=20"

# Get product by ID
curl -X GET "http://localhost:5173/api/productos?id=123"

# Create product
curl -X POST "http://localhost:5173/api/productos" \
  -H "Content-Type: application/json" \
  -d '{
    "master_sku": "LAP-001",
    "nombre_producto": "Laptop Dell XPS 15",
    "precio": 1500.00,
    "costo": 1200.00,
    "existencias": 10
  }'

# Update product
curl -X PUT "http://localhost:5173/api/productos?id=123" \
  -H "Content-Type: application/json" \
  -d '{
    "precio": 1600.00,
    "existencias": 8
  }'

# Delete product
curl -X DELETE "http://localhost:5173/api/productos?id=123"

# List suppliers
curl -X GET "http://localhost:5173/api/proveedores"

# Get inventory by product
curl -X GET "http://localhost:5173/api/inventario?id_articulo=123"
```

---

**Documentation Version:** 1.0
**Last Updated:** 2025-12-09
**API Status:** Partially Implemented (Productos, Proveedores, Inventario fully functional)
