import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { fetchAPI } from "../lib/fetch";
import { useDarkMode } from "../context/DarkModeContext";

// Modal that looks up a product by SKU and renders a printable barcode label.
interface ProductoLocal {
  id: number;
  sku: string;
  name: string;
  price: number;
}

interface EtiquetaModalProps {
  visible: boolean;
  masterSku: string | null;
  onClose: () => void;
}

export function EtiquetaModal({ visible, masterSku, onClose }: EtiquetaModalProps) {
  useDarkMode();
  const [producto, setProducto] = useState<ProductoLocal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!visible || !masterSku) return;

    setProducto(null);
    setError(null);
    setLoading(true);

    fetchAPI(`/api/productos?search=${encodeURIComponent(masterSku)}&pageSize=5`)
      .then((res: unknown) => {
        const data = res as { items?: ProductoLocal[] };
        const match = (data.items ?? []).find((p) => p.sku === masterSku) ?? null;
        if (!match) {
          setError(`Producto no encontrado: ${masterSku}`);
        }
        setProducto(match);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [visible, masterSku]);

  useEffect(() => {
    if (!producto || !svgRef.current) return;
    const code = producto.sku || masterSku || "";
    if (!code) return;
    try {
      JsBarcode(svgRef.current, code, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
        margin: 8,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el código de barras");
    }
  }, [producto, masterSku]);

  if (!visible) return null;

  const handlePrint = () => window.print();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Etiqueta de producto</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none px-1"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Buscando producto...</p>
            </div>
          ) : error ? (
            <p className="text-center text-red-500 py-8 text-sm">{error}</p>
          ) : producto ? (
            <div id="etiqueta-print-area" className="flex flex-col items-center gap-2 border border-gray-300 dark:border-gray-600 rounded p-4">
              <p className="font-bold text-gray-900 dark:text-white text-center line-clamp-2">
                {producto.name ?? "-"}
              </p>
              <svg ref={svgRef} />
              {producto.price != null && (
                <p className="text-gray-700 dark:text-gray-300">
                  ${Number(producto.price).toFixed(2)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8 text-sm">Sin datos</p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            disabled={!producto}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
