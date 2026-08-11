# AGENTS.md — EinterWeb

Frontend React + TypeScript + Vite. **Es la fuente de verdad del sistema**: sus llamadas a `EINTER_API` son las que el cliente ya usa y valida en producción. Si necesitas saber "cuál es el endpoint correcto" para algo, mira primero cómo lo llama esta app antes de confiar en `EinterBodegaApp` o en documentación vieja (Postman, etc.) — mobile tiene varias llamadas rotas por desincronización (ver [`../README.md`](../README.md)).

## Arrancar en local

```bash
npm install
npm run dev   # Vite, puerto 5173
```

`.env` necesita `VITE_API_BASE_URL` apuntando al backend (`http://localhost:3000` en dev).

## Dos clientes HTTP coexisten — usa `fetchAPI`, no `api.*`

- **`src/lib/fetch.ts`** (`fetchAPI`) — el que usa prácticamente toda la app. Firebase ID token se refresca (`forceRefresh: true`) en cada request.
- **`src/lib/api.ts`** (`api.*`) — implementación más vieja y parcial, con token cacheado manualmente vía `setAuthToken`. Solo sigue viva para `auth`/`users`/`dashboard` (`AuthContext.tsx`, `UserManagement.tsx`, `Home.tsx`). **Se depuraron sus funciones muertas el 2026-08-09** (`getProductos`, `createProducto`, `updateProducto`, `deleteProducto`, `getProveedores`, `createProveedor`, `updateUserRole` — ninguna tenía caller). Si vas a agregar una llamada nueva, usa `fetchAPI`, no extiendas `api.ts`.
- `fetchAPI` normaliza un prefijo `/(api)/` (sintaxis de route-group de Next.js, ya sin sentido aquí) a `/api/` — si haces `grep` de rutas literales en `Productos.tsx`/`Proveedores.tsx` verás `/(api)/...`, es cosmético, no un bug.

## Patrones de acceso a datos que conviene conocer

- **`productos`/`proveedores` se leen de dos formas distintas según la pantalla**: `/api/odoo/productos` (catálogo espejo de Odoo, paginado, usado en `Productos.tsx`/`InventarioInteligente.tsx`/`PedidoPersonalizado.tsx`/autocompletados) vs. `/api/productos?id=` (CRUD directo contra nuestra BD, usado solo en el flujo de edición de `Productos.tsx`). No son intercambiables — el primero es de solo lectura y viene de Odoo, el segundo es la fuente editable.
- Varias pantallas (`Productos.tsx`, `InventarioInteligente.tsx`, `PedidoPersonalizado.tsx`) reimplementan cada una su propio loop de paginación contra `/api/odoo/productos` — si tocas ese endpoint, revisa los tres sitios, no solo uno.
- Subida/descarga de PDF (`Entradas.tsx` líneas ~553/579, `THDComparativo.tsx` ~886) usa `fetch()` nativo en vez de `fetchAPI`, porque necesitan `FormData`/blob. Es intencional, no un descuido — no lo "arregles" migrándolo a `fetchAPI` sin más, tendrías que replicar el manejo de auth manualmente.

## Componentes eliminados 2026-08-10

`src/components/ReciboModal.tsx` y `src/components/VentaDetailModal.tsx` existían pero no se importaban en ninguna página — confirmado sin uso y borrados. Si el dominio `recibos` o el detalle de venta por `id_orden` se necesitan en el futuro, hay que reconstruirlos: el backend real para detalle de venta es `GET /api/ventas/:id` (por `id_venta`, no `id_orden`), que ya devuelve el detalle embebido — `VentaDetailModal.tsx` tenía esto mal (apuntaba a `/api/ventas-web/...`, ruta que no existe).

## Impresión de etiquetas — construida 2026-08-10

No existía nada de esto antes. `src/components/EtiquetaModal.tsx` es un modal invocado desde el botón "Etiqueta" en cada fila de `Productos.tsx`:
- Consulta `GET /api/odoo/barcode/:code` con el `master_sku` del producto — **Odoo en vivo, no `/api/odoo/productos` (que lee el cache local)**. Es el mismo endpoint que usa el escaneo de barcode en `EinterBodegaApp` (ver `EinterBodegaApp/AGENTS.md`).
- Renderiza el código de barras con `jsbarcode` (nueva dependencia, formato CODE128 sobre el `default_code`/SKU).
- Imprime con `window.print()` + CSS en `src/index.css` (`@media print`, oculta todo excepto `#etiqueta-print-area`) — no genera PDF, usa el diálogo de impresión nativo del navegador.

Si agregas impresión de etiquetas en otra pantalla, reusa `EtiquetaModal` en vez de duplicar la lógica de `jsbarcode`/`window.print()`.

## Antes de tocar algo, ten en cuenta

- `EinterBodegaApp` (Android) es un cliente separado del mismo backend, y hoy está desincronizado en varios endpoints. Un cambio aquí que además debería aplicar a mobile no se propaga solo — hay que replicarlo a mano (ver `../EinterBodegaApp/AGENTS.md`).
