import { useState, useEffect, useRef } from "react";
import { VentaModal } from "../components/VentaModal";
import type { OrdenVenta } from "../components/VentaModal";
import { useDarkMode } from "../context/DarkModeContext";
import { fetchAPI } from "../lib/fetch";

const SYNC_STALE_MS = 15 * 60 * 1000; // 15 minutes
const VENTAS_SYNC_KEY = "einter_ventas_homedepot_last_sync";

interface Venta {
  id_venta: number;
  id_orden: string | number | null;
  cliente: string | null;
  fecha: string | Date;
}

interface VentasResponse {
  page: number;
  pageSize: number;
  total: number;
  items: Venta[];
}

const TABLE_GRID_COLUMNS =
  "minmax(0,1.5fr) minmax(0,2fr) minmax(0,1.2fr)";

export function VentasHomeDepot() {
  useDarkMode();
  const [, setVentas] = useState<Venta[]>([]);
  const [filteredVentas, setFilteredVentas] = useState<Venta[]>([]);
  const [searchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<OrdenVenta | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const isFirstRender = useRef(true);

  const fetchVentas = async (p = page, ps = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const response = (await fetchAPI(
        `/api/odoo/ventas-homedepot?page=${p}&pageSize=${ps}`
      )) as VentasResponse;
      setVentas(response.items);
      setFilteredVentas(response.items);
      setTotal(response.total);
    } catch (err) {
      setError((err as Error).message);
      console.error("Error fetching ventas Home Depot:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (isAuto = false) => {
    setSyncing(true);
    if (isAuto) setAutoSyncing(true);
    setSyncMsg(null);
    try {
      const result = (await fetchAPI(`/api/odoo/pull/ventas`, { method: "POST" })) as { ok: boolean; upserted: number };
      localStorage.setItem(VENTAS_SYNC_KEY, Date.now().toString());
      if (!isAuto) setSyncMsg(`Sincronizado: ${result.upserted} ventas actualizadas`);
      await fetchVentas();
    } catch (err) {
      setSyncMsg(`Error al sincronizar: ${(err as Error).message}`);
    } finally {
      setSyncing(false);
      setAutoSyncing(false);
    }
  };

  // Auto-sync on mount if data is stale; otherwise just fetch local data
  useEffect(() => {
    const lastSync = localStorage.getItem(VENTAS_SYNC_KEY);
    const isStale = !lastSync || Date.now() - Number(lastSync) > SYNC_STALE_MS;
    if (isStale) {
      handleSync(true);
    } else {
      fetchVentas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when page/pageSize changes, skipping the initial mount
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchVentas(page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const formatDate = (dateValue: string | Date) => {
    const date = new Date(dateValue);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleOpenCreateModal = () => {
    setSelectedOrden(null);
    setModalMode("create");
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedOrden(null);
  };

  const handleSaveOrden = async (ordenData: OrdenVenta) => {
    try {
      const items = [];
      for (const folio of ordenData.folios) {
        for (const producto of folio.productos) {
          items.push({
            id_articulo: parseInt(producto.id),
            cantidad: producto.cantidad,
            numero_folio: folio.numero_folio,
          });
        }
      }

      const total = ordenData.folios.reduce((sum, folio) => {
        return sum + folio.productos.reduce((folioSum, producto) => {
          return folioSum + (producto.cantidad * producto.precio);
        }, 0);
      }, 0);

      const payload = {
        id_orden: ordenData.id_orden,
        cliente: ordenData.cliente,
        fecha: ordenData.fecha,
        total: total,
        items: items,
        pdf: ordenData.pdf || null,
      };

      await fetchAPI(`/api/ventas`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const response = (await fetchAPI(
        `/api/odoo/ventas-homedepot?page=${page}&pageSize=${pageSize}`
      )) as VentasResponse;

      setVentas(response.items);
      setFilteredVentas(response.items);
      setTotal(response.total);
    } catch (err) {
      console.error("❌ Error al guardar:", err);
      throw err;
    }
  };

  const WebView = (
    <div className="w-full bg-gray-50 dark:bg-gray-900 flex flex-col min-h-screen">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="flex flex-row items-center justify-between">
          <h1 className="text-3xl font-bold tracking-wide text-gray-900 dark:text-white">
            Ventas Home Depot
          </h1>
          <div className="flex gap-3 items-center">
            {syncMsg && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{syncMsg}</span>
            )}
            <button
              onClick={() => handleSync()}
              disabled={syncing}
              className="px-6 py-2 border border-blue-600 hover:bg-blue-600 hover:text-white transition-colors text-sm font-medium text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Sincronizando...
                </>
              ) : "↻ Sincronizar Odoo"}
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-6 py-2 border border-black dark:border-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors text-sm font-medium text-gray-900 dark:text-white"
            >
              + Agregar Venta
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 mx-8 mt-4 border border-gray-400 dark:border-gray-700 overflow-hidden flex flex-col rounded-lg">
        <div
          className="grid [&>*]:min-w-0 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-400 dark:border-gray-600"
          style={{ gridTemplateColumns: TABLE_GRID_COLUMNS }}
        >
          <div className="flex-[1.5] py-4 px-3 border-r border-gray-400 dark:border-gray-600 flex items-center justify-center">
            <span className="font-robotoMedium text-gray-900 dark:text-white text-xl text-center">
              Numero Orden
            </span>
          </div>
          <div className="flex-2 py-4 px-3 border-r border-gray-400 flex items-center justify-center">
            <span className="font-robotoMedium text-gray-900 text-xl text-center">
              Cliente
            </span>
          </div>
          <div className="flex-[1.2] py-4 px-3 flex items-center justify-center">
            <span className="font-robotoMedium text-gray-900 text-xl text-center">
              Fecha
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading || autoSyncing ? (
            <div className="flex flex-col flex-1 items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 font-robotoRegular mt-4">
                {autoSyncing ? "Sincronizando con Odoo..." : "Cargando ventas Home Depot..."}
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center py-20">
              <p className="text-red-500 font-robotoMedium">
                Error al cargar ventas Home Depot
              </p>
              <p className="text-gray-400 font-robotoRegular text-sm mt-2">
                {error}
              </p>
            </div>
          ) : filteredVentas.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-20">
              <p className="text-gray-500 font-robotoRegular">
                No hay ventas de Home Depot disponibles
              </p>
              {searchText && (
                <p className="text-gray-400 font-robotoRegular text-sm mt-2">
                  No se encontraron resultados para "{searchText}"
                </p>
              )}
            </div>
          ) : (
            filteredVentas.map((venta, index) => (
              <div
                key={venta.id_venta}
                className={`grid [&>*]:min-w-0 border-b border-gray-300 ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-blue-50`}
                style={{ gridTemplateColumns: TABLE_GRID_COLUMNS }}
              >
                <div className="flex-[1.5] py-4 px-3 border-r border-gray-300 flex items-center justify-center">
                  <span className="text-gray-900 font-robotoRegular text-base text-center">
                    {venta.id_orden || "—"}
                  </span>
                </div>

                <div className="flex-2 py-4 px-3 border-r border-gray-300 flex items-center justify-center">
                  <span
                    className="text-gray-900 font-robotoRegular text-base text-center truncate"
                    title={venta.cliente || ""}
                  >
                    {venta.cliente || "—"}
                  </span>
                </div>

                <div className="flex-[1.2] py-4 px-3 flex items-center justify-center">
                  <span className="text-gray-900 font-robotoRegular text-base text-center">
                    {formatDate(venta.fecha)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {!loading && !error && total > 0 && (
          <div className="flex-row items-center justify-between px-6 py-4 border-t border-gray-200">
            <span className="text-gray-600 font-robotoRegular">
              Mostrando {(page - 1) * pageSize + 1} -{" "}
              {Math.min(page * pageSize, total)} de {total} ventas
            </span>
            <div className="flex-row gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-4 py-2 rounded-lg ${page === 1 ? "bg-gray-200" : "bg-blue-600"}`}
              >
                <span
                  className={`font-robotoMedium ${page === 1 ? "text-gray-400" : "text-white"}`}
                >
                  Anterior
                </span>
              </button>
              <span className="px-4 py-2 font-robotoMedium text-gray-700">
                Página {page} de {Math.ceil(total / pageSize)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
                className={`px-4 py-2 rounded-lg ${page >= Math.ceil(total / pageSize) ? "bg-gray-200" : "bg-blue-600"}`}
              >
                <span
                  className={`font-robotoMedium ${page >= Math.ceil(total / pageSize) ? "text-gray-400" : "text-white"}`}
                >
                  Siguiente
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {WebView}
      <VentaModal
        visible={modalVisible}
        orden={selectedOrden}
        onClose={handleCloseModal}
        onSave={handleSaveOrden}
        mode={modalMode}
      />
    </>
  );
}
