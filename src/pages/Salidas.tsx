import { useState, useEffect, useCallback } from "react";
import { VentaModal } from "../components/VentaModal";
import type { OrdenVenta } from "../components/VentaModal";
import { VentaDetailModal } from "../components/VentaDetailModal";
import type { VentaDetail } from "../components/VentaDetailModal";
import { useDarkMode } from "../context/DarkModeContext";
import { fetchAPI } from "../lib/fetch";
import { ColumnFilter, distinctValues } from "../components/ColumnFilter";

interface LineItem {
  master_sku: string | null;
  nombre_producto: string | null;
  cantidad: number;
  precio: number;
  costo: number;
}

interface Venta {
  id_venta: number;
  odoo_id: number | null;
  id_orden: string | number | null;
  cliente: string | null;
  total: number | string;
  fecha: string | Date;
  pdf_data: string | null;
  pdf_filename: string | null;
  lineItems: LineItem[];
}

interface VentasResponse {
  page: number;
  pageSize: number;
  total: number;
  items: Venta[];
}

const TABLE_GRID_COLUMNS =
  "3rem minmax(0,1.5fr) minmax(0,2fr) minmax(0,1.2fr) minmax(0,1.2fr)";

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

export function Salidas() {
  useDarkMode();
  // All sales are loaded once and filtered / paginated client-side so the
  // Excel-style column filters span the whole dataset.
  const [allVentas, setAllVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Filters
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [searchOrden, setSearchOrden] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<OrdenVenta | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [detailVenta, setDetailVenta] = useState<VentaDetail | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const fetchVentas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = (await fetchAPI(
        `/api/odoo/ventas?page=1&pageSize=99999`
      )) as VentasResponse;
      setAllVentas(response.items);
    } catch (err) {
      setError((err as Error).message);
      console.error("Error fetching ventas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [filterYear, filterMonth, searchOrden, filterCliente, colFilters]);

  const applyFilters = () => {
    setSearchOrden(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setFilterYear("");
    setFilterMonth("");
    setSearchInput("");
    setSearchOrden("");
    setFilterCliente("");
    setColFilters({});
    setPage(1);
  };

  const hasColFilters = Object.values(colFilters).some((v) => v.length > 0);
  const hasActiveFilters =
    filterYear !== "" ||
    filterMonth !== "" ||
    searchOrden !== "" ||
    filterCliente !== "" ||
    hasColFilters;

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

  const handleOpenPdf = (ventaId: number) => {
    window.open(`/api/ventas/${ventaId}/pdf`, "_blank");
  };

  const handleOpenDetail = (venta: Venta) => {
    setDetailVenta({
      id_venta: venta.id_venta,
      odoo_id: venta.odoo_id ?? null,
      id_orden: venta.id_orden,
      cliente: venta.cliente,
      fecha: venta.fecha,
      total: venta.total,
      lineItems: venta.lineItems ?? [],
    });
    setDetailVisible(true);
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
        return (
          sum +
          folio.productos.reduce((folioSum, producto) => {
            return folioSum + producto.cantidad * producto.precio;
          }, 0)
        );
      }, 0);

      const payload = {
        id_orden: ordenData.id_orden,
        cliente: ordenData.cliente,
        fecha: ordenData.fecha,
        total,
        items,
        pdf: ordenData.pdf || null,
      };

      await fetchAPI(`/(api)/ventas`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      fetchVentas();
    } catch (err) {
      console.error("❌ Error al guardar:", err);
      throw err;
    }
  };

  // Derived filter option lists
  const availableYears = Array.from(
    new Set(allVentas.map((v) => new Date(v.fecha).getFullYear()))
  )
    .filter((y) => !Number.isNaN(y))
    .sort((a, b) => b - a);
  const availableClientes = Array.from(
    new Set(allVentas.map((v) => v.cliente).filter((c): c is string => !!c))
  ).sort((a, b) => a.localeCompare(b, "es"));

  // Per-column value accessors for the Excel-style filters
  const COL_ACCESSORS: Record<string, (v: Venta) => string> = {
    id_orden: (v) => (v.id_orden == null ? "" : String(v.id_orden)),
    cliente: (v) => v.cliente ?? "",
    total: (v) => formatCurrency(v.total),
    fecha: (v) => formatDate(v.fecha),
  };

  const matched = allVentas.filter((v) => {
    const d = new Date(v.fecha);
    if (filterYear && d.getFullYear() !== filterYear) return false;
    if (filterMonth && d.getMonth() + 1 !== filterMonth) return false;
    if (
      searchOrden &&
      !String(v.id_orden ?? "")
        .toLowerCase()
        .includes(searchOrden.toLowerCase())
    )
      return false;
    if (filterCliente && v.cliente !== filterCliente) return false;
    for (const [k, vals] of Object.entries(colFilters)) {
      if (vals.length && !vals.includes(COL_ACCESSORS[k](v))) return false;
    }
    return true;
  });

  const total = matched.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filteredVentas = matched.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <div className="w-full bg-gray-50 dark:bg-gray-900 flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
          <div className="flex flex-row items-center justify-between">
            <h1 className="text-3xl font-bold tracking-wide text-gray-900 dark:text-white">
              Salidas
            </h1>
            <button
              onClick={handleOpenCreateModal}
              className="px-6 py-2 border border-black dark:border-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors text-sm font-medium text-gray-900 dark:text-white"
            >
              + Nueva Orden de Salida
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 mt-4">
            {/* Search by order */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Número de orden
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="Buscar orden..."
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm rounded w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={applyFilters}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Buscar
                </button>
              </div>
            </div>

            {/* Client filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Cliente
              </label>
              <select
                value={filterCliente}
                onChange={(e) => {
                  setFilterCliente(e.target.value);
                  setPage(1);
                }}
                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos los clientes</option>
                {availableClientes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Year filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Año
              </label>
              <select
                value={filterYear}
                onChange={(e) => {
                  setFilterYear(e.target.value === "" ? "" : Number(e.target.value));
                  setPage(1);
                }}
                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos los años</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Month filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Mes
              </label>
              <select
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(e.target.value === "" ? "" : Number(e.target.value));
                  setPage(1);
                }}
                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos los meses</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="self-end px-3 py-1.5 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white dark:bg-gray-800 mx-8 mt-4 border border-gray-400 dark:border-gray-700 overflow-hidden flex flex-col rounded-lg">
          {/* Table header */}
          <div
            className="grid [&>*]:min-w-0 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-400 dark:border-gray-600"
            style={{ gridTemplateColumns: TABLE_GRID_COLUMNS }}
          >
            <div className="w-12 py-4 px-2 border-r border-gray-400 dark:border-gray-600 flex items-center justify-center">
              <span className="text-gray-700 dark:text-gray-300 font-bold text-sm" title="PDF disponible">
                📄
              </span>
            </div>
            <div className="py-4 px-2 border-r border-gray-400 dark:border-gray-600 flex items-center justify-center">
              <ColumnFilter
                label="Numero Orden"
                textClass="text-lg"
                options={distinctValues(allVentas, COL_ACCESSORS.id_orden)}
                selected={colFilters.id_orden ?? []}
                onChange={(next) => setColFilters((p) => ({ ...p, id_orden: next }))}
              />
            </div>
            <div className="py-4 px-2 border-r border-gray-400 dark:border-gray-600 flex items-center justify-center">
              <ColumnFilter
                label="Cliente"
                textClass="text-lg"
                options={distinctValues(allVentas, COL_ACCESSORS.cliente)}
                selected={colFilters.cliente ?? []}
                onChange={(next) => setColFilters((p) => ({ ...p, cliente: next }))}
              />
            </div>
            <div className="py-4 px-2 border-r border-gray-400 dark:border-gray-600 flex items-center justify-center">
              <ColumnFilter
                label="Total"
                textClass="text-lg"
                options={distinctValues(allVentas, COL_ACCESSORS.total)}
                selected={colFilters.total ?? []}
                onChange={(next) => setColFilters((p) => ({ ...p, total: next }))}
              />
            </div>
            <div className="py-4 px-2 flex items-center justify-center">
              <ColumnFilter
                label="Fecha"
                textClass="text-lg"
                options={distinctValues(allVentas, COL_ACCESSORS.fecha)}
                selected={colFilters.fecha ?? []}
                onChange={(next) => setColFilters((p) => ({ ...p, fecha: next }))}
              />
            </div>
          </div>

          {/* Table body */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-500 font-robotoRegular">Cargando ventas...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-red-500 font-robotoMedium">Error al cargar ventas</p>
                <p className="text-gray-400 font-robotoRegular text-sm mt-2">{error}</p>
              </div>
            ) : filteredVentas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-gray-500 font-robotoRegular">
                  {hasActiveFilters ? "No se encontraron resultados con los filtros aplicados" : "No hay ventas disponibles"}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              filteredVentas.map((venta, index) => (
                <div
                  key={venta.id_venta}
                  className={`grid [&>*]:min-w-0 border-b border-gray-300 dark:border-gray-700 ${
                    index % 2 === 0
                      ? "bg-white dark:bg-gray-900"
                      : "bg-gray-50 dark:bg-gray-800"
                  } hover:bg-blue-50 dark:hover:bg-blue-900/20`}
                  style={{ gridTemplateColumns: TABLE_GRID_COLUMNS }}
                >
                  <div className="w-12 py-4 px-2 border-r border-gray-300 dark:border-gray-700 flex items-center justify-center">
                    {venta.pdf_data ? (
                      <button
                        onClick={() => handleOpenPdf(venta.id_venta)}
                        className="text-blue-600 hover:text-blue-800 hover:scale-110 text-lg cursor-pointer transition-all font-bold"
                        title="Descargar PDF"
                      >
                        📄
                      </button>
                    ) : (
                      <span className="text-gray-300 text-lg">📄</span>
                    )}
                  </div>

                  <div className="flex-[1.5] py-4 px-3 border-r border-gray-300 dark:border-gray-700 flex items-center justify-center">
                    <button
                      onClick={() => handleOpenDetail(venta)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:underline font-robotoRegular text-base text-center cursor-pointer transition-colors"
                      title="Ver productos de esta orden"
                    >
                      {venta.id_orden ?? "—"}
                    </button>
                  </div>

                  <div className="flex-2 py-4 px-3 border-r border-gray-300 dark:border-gray-700 flex items-center justify-center">
                    <span
                      className="text-gray-900 dark:text-gray-100 font-robotoRegular text-base text-center truncate"
                      title={venta.cliente || ""}
                    >
                      {venta.cliente ?? "—"}
                    </span>
                  </div>

                  <div className="flex-[1.2] py-4 px-3 border-r border-gray-300 dark:border-gray-700 flex items-center justify-center">
                    <span className="text-gray-900 dark:text-gray-100 font-robotoRegular text-base text-center">
                      {formatCurrency(venta.total)}
                    </span>
                  </div>

                  <div className="flex-[1.2] py-4 px-3 flex items-center justify-center">
                    <span className="text-gray-900 dark:text-gray-100 font-robotoRegular text-base text-center">
                      {formatDate(venta.fecha)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && !error && total > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400 font-robotoRegular text-sm">
                Mostrando {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, total)} de {total} ventas
                {hasActiveFilters && " (filtradas)"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-4 py-2 rounded-lg text-sm font-robotoMedium transition-colors ${
                    page === 1
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  Anterior
                </button>
                <span className="px-4 py-2 font-robotoMedium text-gray-700 dark:text-gray-300 text-sm">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={`px-4 py-2 rounded-lg text-sm font-robotoMedium transition-colors ${
                    page >= totalPages
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <VentaModal
        visible={modalVisible}
        orden={selectedOrden}
        onClose={handleCloseModal}
        onSave={handleSaveOrden}
        mode={modalMode}
      />

      <VentaDetailModal
        visible={detailVisible}
        venta={detailVenta}
        onClose={() => setDetailVisible(false)}
      />
    </>
  );
}
