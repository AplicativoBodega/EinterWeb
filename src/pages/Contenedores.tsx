import { useState, useEffect } from "react";
import { useDarkMode } from "../context/DarkModeContext";
import { fetchAPI } from "../lib/fetch";
import { ColumnFilter, distinctValues } from "../components/ColumnFilter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContenedorRow {
  id_movimiento: number;
  id_articulo: number;
  cantidad: number;
  folio_orden: string;
  fecha_movimiento: string;
  master_sku: string;
  nombre_producto: string;
}

interface ContenedoresResponse {
  data: ContenedorRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ContenedorDetail {
  folio: string;
  fecha: string;
  items: {
    id_movimiento: number;
    master_sku: string;
    nombre_producto: string;
    cantidad: number;
  }[];
  total_piezas: number;
}

interface NuevoItem {
  master_sku: string;
  cantidad: string;
}

type SortColumn = keyof ContenedorRow | null;
type SortDir = "asc" | "desc";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABLE_GRID = "minmax(0,2fr) minmax(0,1.5fr) minmax(0,3fr) 6rem 8rem";
const DETAIL_GRID = "minmax(0,1.5fr) minmax(0,3fr) 6rem";
const LIMIT = 25;

const MONTHS = [
  { value: "0", label: "Todos" },
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const YEARS = ["2025", "2026"];

const COLUMNS: { key: SortColumn; label: string; align: string }[] = [
  { key: "folio_orden", label: "Folio / Orden", align: "justify-start" },
  { key: "master_sku", label: "Modelo", align: "justify-center" },
  { key: "nombre_producto", label: "Descripción", align: "justify-start" },
  { key: "cantidad", label: "Cantidad", align: "justify-center" },
  { key: "fecha_movimiento", label: "Fecha", align: "justify-center" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function sortRows(
  rows: ContenedorRow[],
  col: SortColumn,
  dir: SortDir
): ContenedorRow[] {
  if (!col) return rows;
  return [...rows].sort((a, b) => {
    const av = a[col];
    const bv = b[col];
    if (av === bv) return 0;
    let cmp: number;
    if (typeof av === "number" && typeof bv === "number") {
      cmp = av - bv;
    } else {
      cmp = String(av).localeCompare(String(bv), "es");
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Contenedores() {
  useDarkMode();
  const currentYear = String(new Date().getFullYear());

  // Table state — all rows for the selected year/month are loaded at once and
  // filtered / sorted / paginated client-side so the Excel-style column filters
  // span the whole dataset.
  const [data, setData] = useState<ContenedorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Filter state
  const [anio, setAnio] = useState(currentYear);
  const [mes, setMes] = useState("0");
  const [searchText, setSearchText] = useState("");
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});

  // Sort state
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [retryCount, setRetryCount] = useState(0);

  // Detail modal state
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<ContenedorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Create modal state
  const [createVisible, setCreateVisible] = useState(false);
  const [createFolio, setCreateFolio] = useState("");
  const [createFecha, setCreateFecha] = useState(todayISO());
  const [createItems, setCreateItems] = useState<NuevoItem[]>([
    { master_sku: "", cantidad: "1" },
  ]);
  const [createLoading, setCreateLoading] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  // Auto-dismiss toast after 3.5 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Reset to first page whenever a client-side filter changes
  useEffect(() => {
    setPage(1);
  }, [searchText, colFilters]);

  // Main data fetch — load every row for the selected year/month
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "100000",
          anio,
        });
        if (mes !== "0") params.set("mes", mes);

        const raw = (await fetchAPI(
          `/api/contenedores?${params.toString()}`
        )) as ContenedoresResponse;

        if (!cancelled) {
          setData(Array.isArray(raw.data) ? raw.data : []);
          setPage(1);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [anio, mes, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter handlers ──────────────────────────────────────────────────────

  const handleAnioChange = (value: string) => {
    setAnio(value);
    setPage(1);
  };

  const handleMesChange = (value: string) => {
    setMes(value);
    setPage(1);
  };

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // ── Detail modal ─────────────────────────────────────────────────────────

  const handleRowClick = async (folio: string) => {
    setDetail(null);
    setDetailError(null);
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const raw = (await fetchAPI(
        `/api/contenedores/${encodeURIComponent(folio)}`
      )) as ContenedorDetail;
      setDetail(raw);
    } catch (err) {
      setDetailError((err as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailVisible(false);
    setDetail(null);
    setDetailError(null);
  };

  // ── Create modal ─────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setCreateFolio("");
    setCreateFecha(todayISO());
    setCreateItems([{ master_sku: "", cantidad: "1" }]);
    setCreateVisible(true);
  };

  const addItem = () =>
    setCreateItems((prev) => [...prev, { master_sku: "", cantidad: "1" }]);

  const removeItem = (index: number) =>
    setCreateItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (
    index: number,
    field: keyof NuevoItem,
    value: string
  ) =>
    setCreateItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );

  const handleCreateSubmit = async () => {
    if (!createFolio.trim() || !createFecha) return;
    setCreateLoading(true);
    try {
      const validItems = createItems
        .filter((i) => i.master_sku.trim())
        .map((i) => ({
          master_sku: i.master_sku.trim(),
          cantidad: Math.max(1, Number(i.cantidad) || 1),
        }));

      await fetchAPI("/api/contenedores", {
        method: "POST",
        body: JSON.stringify({
          folio_orden: createFolio.trim(),
          fecha_movimiento: createFecha,
          items: validItems,
        }),
      });

      setCreateVisible(false);
      setToast({
        ok: true,
        text: `Entrada "${createFolio.trim()}" creada exitosamente.`,
      });
      setRetryCount((c) => c + 1);
    } catch (err) {
      setToast({ ok: false, text: (err as Error).message });
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const COL_ACCESSORS: Record<string, (r: ContenedorRow) => string> = {
    folio_orden: (r) => r.folio_orden || "",
    master_sku: (r) => r.master_sku || "",
    nombre_producto: (r) => r.nombre_producto || "",
    cantidad: (r) => String(r.cantidad ?? ""),
    fecha_movimiento: (r) => formatDate(r.fecha_movimiento),
  };

  const search = searchText.trim().toLowerCase();
  const matched = data.filter((r) => {
    if (search) {
      const hay = `${r.folio_orden} ${r.master_sku} ${r.nombre_producto}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    for (const [k, vals] of Object.entries(colFilters)) {
      if (vals.length && !vals.includes(COL_ACCESSORS[k](r))) return false;
    }
    return true;
  });
  const sorted = sortRows(matched, sortColumn, sortDir);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const displayedRows = sorted.slice((page - 1) * LIMIT, page * LIMIT);

  return (
    <>
      <div className="w-full bg-gray-50 dark:bg-gray-900 flex flex-col min-h-screen">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold tracking-wide text-gray-900 dark:text-white">
                Entradas
              </h1>
              {!loading && total > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  {total.toLocaleString("es-MX")} registros
                </span>
              )}
            </div>
            <button
              onClick={handleOpenCreate}
              className="px-6 py-2 border border-black dark:border-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-colors text-sm font-medium text-gray-900 dark:text-white"
            >
              + Nueva Entrada
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {/* Year selector */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => handleAnioChange(y)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    anio === y
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>

            {/* Month selector */}
            <select
              value={mes}
              onChange={(e) => handleMesChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Text search */}
            <div className="relative">
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por folio, modelo o descripción..."
                className="pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm w-72"
              />
              <span className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500 text-sm pointer-events-none">
                🔍
              </span>
              {searchText && (
                <button
                  onClick={() => setSearchText("")}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs leading-none"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Table card ──────────────────────────────────────────────────── */}
        <div className="flex-1 bg-white dark:bg-gray-800 mx-8 mt-4 mb-8 border border-gray-400 dark:border-gray-700 overflow-hidden flex flex-col rounded-lg">
          {/* Column headers */}
          <div
            className="grid [&>*]:min-w-0 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-400 dark:border-gray-600"
            style={{ gridTemplateColumns: TABLE_GRID }}
          >
            {COLUMNS.map((col, i) => (
              <div
                key={String(col.key)}
                className={`py-4 px-2 flex items-center ${
                  i < COLUMNS.length - 1
                    ? "border-r border-gray-400 dark:border-gray-600"
                    : ""
                }`}
              >
                <ColumnFilter
                  label={col.label}
                  align={col.align.includes("start") ? "left" : "center"}
                  options={distinctValues(data, COL_ACCESSORS[String(col.key)])}
                  selected={colFilters[String(col.key)] ?? []}
                  onChange={(next) =>
                    setColFilters((prev) => ({ ...prev, [String(col.key)]: next }))
                  }
                  sortDir={sortColumn === col.key ? sortDir : null}
                  onSort={(dir) => {
                    setSortColumn(col.key);
                    setSortDir(dir);
                  }}
                />
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <p className="text-gray-500 dark:text-gray-400 font-robotoRegular mt-4">
                  Cargando entradas...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-red-500 font-robotoMedium">
                  Error al cargar datos
                </p>
                <p className="text-gray-400 dark:text-gray-500 font-robotoRegular text-sm mt-2">
                  {error}
                </p>
                <button
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="mt-4 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors text-sm"
                >
                  Reintentar
                </button>
              </div>
            ) : displayedRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <p className="text-gray-400 dark:text-gray-500 text-4xl">📦</p>
                <p className="text-gray-500 dark:text-gray-400 font-robotoMedium text-lg mt-1">
                  Sin entradas para mostrar
                </p>
                <p className="text-gray-400 dark:text-gray-500 font-robotoRegular text-sm">
                  Intenta ajustar los filtros
                </p>
              </div>
            ) : (
              displayedRows.map((row, index) => (
                <div
                  key={row.id_movimiento}
                  onClick={() => handleRowClick(row.folio_orden)}
                  className={`grid [&>*]:min-w-0 border-b border-gray-200 dark:border-gray-700 cursor-pointer ${
                    index % 2 === 0
                      ? "bg-white dark:bg-gray-800"
                      : "bg-gray-50 dark:bg-gray-700/40"
                  } hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}
                  style={{ gridTemplateColumns: TABLE_GRID }}
                >
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center">
                    <span
                      className="text-gray-900 dark:text-gray-100 text-sm font-mono truncate"
                      title={row.folio_orden}
                    >
                      {row.folio_orden || "—"}
                    </span>
                  </div>
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <span className="text-gray-700 dark:text-gray-300 text-sm font-mono">
                      {row.master_sku || "—"}
                    </span>
                  </div>
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center">
                    <span
                      className="text-gray-900 dark:text-gray-100 text-sm truncate"
                      title={row.nombre_producto}
                    >
                      {row.nombre_producto || "—"}
                    </span>
                  </div>
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <span className="text-gray-900 dark:text-gray-100 text-sm font-medium">
                      {row.cantidad.toLocaleString("es-MX")}
                    </span>
                  </div>
                  <div className="py-3 px-3 flex items-center justify-center">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      {formatDate(row.fecha_movimiento)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400 font-robotoRegular text-sm">
                Mostrando {(page - 1) * LIMIT + 1}–
                {Math.min(page * LIMIT, total)} de{" "}
                {total.toLocaleString("es-MX")} registros
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-4 py-2 rounded-lg text-sm font-robotoMedium transition-colors ${
                    page === 1
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
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
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Toast notification ──────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm w-full p-4 rounded-lg shadow-lg border animate-fade-in ${
            toast.ok
              ? "bg-green-50 dark:bg-green-900/80 border-green-300 dark:border-green-600 text-green-800 dark:text-green-200"
              : "bg-red-50 dark:bg-red-900/80 border-red-300 dark:border-red-600 text-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-robotoRegular text-sm">{toast.text}</span>
            <button
              onClick={() => setToast(null)}
              className="text-current opacity-60 hover:opacity-100 text-xs leading-none shrink-0 mt-0.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Detail modal ────────────────────────────────────────────────────── */}
      {detailVisible && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl flex flex-col max-h-[80vh] shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-robotoMedium text-gray-900 dark:text-white">
                  {detail?.folio ?? "Cargando…"}
                </h2>
                {detail && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-robotoRegular mt-0.5">
                    {formatDate(detail.fecha)}
                  </p>
                )}
              </div>
              <button
                onClick={closeDetail}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none ml-4 mt-0.5"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  <p className="text-gray-500 dark:text-gray-400 font-robotoRegular mt-4 text-sm">
                    Cargando detalle…
                  </p>
                </div>
              ) : detailError ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-red-500 font-robotoMedium text-sm">
                    Error al cargar el detalle
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                    {detailError}
                  </p>
                </div>
              ) : detail && detail.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <p className="text-gray-400 dark:text-gray-500 font-robotoRegular text-sm">
                    Sin productos en esta entrada
                  </p>
                </div>
              ) : detail ? (
                <>
                  {/* Inner table header */}
                  <div
                    className="grid [&>*]:min-w-0 bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 sticky top-0"
                    style={{ gridTemplateColumns: DETAIL_GRID }}
                  >
                    {(["Modelo", "Descripción", "Cantidad"] as const).map(
                      (label, i, arr) => (
                        <div
                          key={label}
                          className={`py-3 px-4 flex items-center ${
                            label === "Descripción"
                              ? "justify-start"
                              : "justify-center"
                          } ${
                            i < arr.length - 1
                              ? "border-r border-gray-300 dark:border-gray-600"
                              : ""
                          }`}
                        >
                          <span className="font-robotoMedium text-gray-700 dark:text-gray-300 text-sm">
                            {label}
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Inner table rows */}
                  {detail.items.map((item, index) => (
                    <div
                      key={item.id_movimiento}
                      className={`grid [&>*]:min-w-0 border-b border-gray-200 dark:border-gray-700 ${
                        index % 2 === 0
                          ? "bg-white dark:bg-gray-800"
                          : "bg-gray-50 dark:bg-gray-700/40"
                      }`}
                      style={{ gridTemplateColumns: DETAIL_GRID }}
                    >
                      <div className="py-2.5 px-4 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
                        <span className="text-gray-700 dark:text-gray-300 text-sm font-mono">
                          {item.master_sku || "—"}
                        </span>
                      </div>
                      <div className="py-2.5 px-4 border-r border-gray-200 dark:border-gray-600 flex items-center">
                        <span
                          className="text-gray-900 dark:text-gray-100 text-sm truncate"
                          title={item.nombre_producto}
                        >
                          {item.nombre_producto || "—"}
                        </span>
                      </div>
                      <div className="py-2.5 px-4 flex items-center justify-center">
                        <span className="text-gray-900 dark:text-gray-100 text-sm font-medium">
                          {item.cantidad.toLocaleString("es-MX")}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              ) : null}
            </div>

            {/* Footer */}
            {detail && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <span className="font-robotoMedium text-gray-700 dark:text-gray-300 text-sm">
                  Total piezas:{" "}
                  <span className="text-gray-900 dark:text-white font-bold">
                    {detail.total_piezas.toLocaleString("es-MX")}
                  </span>
                </span>
                <button
                  onClick={closeDetail}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-robotoMedium"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create modal ────────────────────────────────────────────────────── */}
      {createVisible && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-xl flex flex-col max-h-[90vh] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-robotoMedium text-gray-900 dark:text-white">
                Nueva Entrada
              </h2>
              <button
                onClick={() => setCreateVisible(false)}
                disabled={createLoading}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
              {/* Folio */}
              <div>
                <label className="block text-sm font-robotoMedium text-gray-700 dark:text-gray-300 mb-1.5">
                  Folio / Nombre de la entrada{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createFolio}
                  onChange={(e) => setCreateFolio(e.target.value)}
                  placeholder="Ej. CONT-2026-001"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-sm font-robotoMedium text-gray-700 dark:text-gray-300 mb-1.5">
                  Fecha de llegada <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={createFecha}
                  onChange={(e) => setCreateFecha(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              {/* Items */}
              <div>
                <label className="block text-sm font-robotoMedium text-gray-700 dark:text-gray-300 mb-2">
                  Productos
                </label>

                <div className="space-y-2">
                  {/* Items header */}
                  <div className="grid grid-cols-[1fr_6rem_2rem] gap-2 px-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-robotoMedium">
                      Modelo / SKU
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-robotoMedium text-center">
                      Cantidad
                    </span>
                    <span />
                  </div>

                  {createItems.map((item, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_6rem_2rem] gap-2 items-center"
                    >
                      <input
                        type="text"
                        value={item.master_sku}
                        onChange={(e) =>
                          updateItem(i, "master_sku", e.target.value)
                        }
                        placeholder="Ej. MOD-001"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                      <input
                        type="number"
                        min={1}
                        value={item.cantidad}
                        onChange={(e) =>
                          updateItem(i, "cantidad", e.target.value)
                        }
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                      <button
                        onClick={() => removeItem(i)}
                        disabled={createItems.length === 1}
                        className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-0 disabled:pointer-events-none"
                        title="Eliminar fila"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addItem}
                  className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-robotoMedium transition-colors"
                >
                  + Agregar producto
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setCreateVisible(false)}
                disabled={createLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-robotoMedium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={
                  createLoading || !createFolio.trim() || !createFecha
                }
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-robotoMedium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {createLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Guardando…
                  </>
                ) : (
                  "Guardar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
