import { useState, useEffect } from "react";
import { useDarkMode } from "../context/DarkModeContext";
import { fetchAPI } from "../lib/fetch";

export interface LineItem {
  id_articulo?: number | null;
  master_sku: string | null;
  nombre_producto: string | null;
  cantidad: number;
  precio: number;
  subtotal?: number;
  costo?: number;
}

export interface VentaDetail {
  id_venta: number;
  odoo_id: number | null;
  id_orden: string | number | null;
  cliente: string | null;
  fecha: string | Date;
  total: number | string;
  lineItems: LineItem[];
}

interface VentaWebDetalleRow {
  id_articulo: number | null;
  master_sku: string | null;
  nombre_producto: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface VentaDetailModalProps {
  visible: boolean;
  venta: VentaDetail | null;
  onClose: () => void;
}

export function VentaDetailModal({ visible, venta, onClose }: VentaDetailModalProps) {
  useDarkMode();
  const [lines, setLines] = useState<LineItem[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [linesError, setLinesError] = useState<string | null>(null);
  const [noLinesCaptured, setNoLinesCaptured] = useState(false);

  useEffect(() => {
    if (!visible || !venta) return;

    // If there are local line items, use them directly
    if (venta.lineItems && venta.lineItems.length > 0) {
      setLines(venta.lineItems);
      setNoLinesCaptured(false);
      return;
    }

    if (venta.id_orden == null || venta.id_orden === "") {
      setLines([]);
      setNoLinesCaptured(true);
      return;
    }

    setLoadingLines(true);
    setLinesError(null);
    setNoLinesCaptured(false);
    setLines([]);

    fetchAPI(`/api/ventas-web/${venta.id_orden}/detalle`)
      .then((res: unknown) => {
        const rows = (Array.isArray(res) ? res : []) as VentaWebDetalleRow[];
        const mapped: LineItem[] = rows.map((row) => ({
          id_articulo: row.id_articulo,
          master_sku: row.master_sku,
          nombre_producto: row.nombre_producto,
          cantidad: row.cantidad,
          precio: row.precio_unitario,
          subtotal: row.subtotal,
        }));
        setLines(mapped);
        setNoLinesCaptured(mapped.length === 0);
      })
      .catch((err: Error) => {
        setLinesError(err.message);
      })
      .finally(() => setLoadingLines(false));
  }, [visible, venta]);

  if (!visible || !venta) return null;

  const formatDate = (dateValue: string | Date) => {
    const date = new Date(dateValue);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatCurrency = (value: number | string) =>
    `$${Number(value).toFixed(2)}`;

  const subtotal = lines.reduce(
    (sum, item) => sum + (item.subtotal ?? item.cantidad * item.precio),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Orden {venta.id_orden ?? "—"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {venta.cliente ?? "—"} · {formatDate(venta.fecha)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none px-1"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loadingLines ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Cargando productos...</p>
            </div>
          ) : linesError ? (
            <p className="text-center text-red-500 py-12 text-sm">
              Error al cargar productos: {linesError}
            </p>
          ) : noLinesCaptured || lines.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-12 text-sm">
              Esta orden aún no tiene productos capturados.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="text-left py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300 w-32">
                    SKU
                  </th>
                  <th className="text-left py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300">
                    Producto
                  </th>
                  <th className="text-right py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300 w-20">
                    Cant.
                  </th>
                  <th className="text-right py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300 w-28">
                    Precio Unit.
                  </th>
                  <th className="text-right py-2 font-semibold text-gray-700 dark:text-gray-300 w-28">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-gray-100 dark:border-gray-700 ${
                      idx % 2 === 0
                        ? "bg-white dark:bg-gray-800"
                        : "bg-gray-50 dark:bg-gray-750"
                    }`}
                  >
                    <td className="py-2 pr-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {item.master_sku ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">
                      {item.nombre_producto ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-900 dark:text-gray-100">
                      {item.cantidad}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.precio)}
                    </td>
                    <td className="py-2 text-right text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.subtotal ?? item.cantidad * item.precio)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {lines.length} producto{lines.length !== 1 ? "s" : ""}
          </span>
          <div className="text-right">
            {lines.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Subtotal líneas: {formatCurrency(subtotal)}
              </p>
            )}
            <p className="text-base font-bold text-gray-900 dark:text-white">
              Total: {formatCurrency(venta.total)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
