import { useState, useEffect, useRef } from "react";
import { useDarkMode } from "../context/DarkModeContext";
import { fetchAPI } from "../lib/fetch";
import { auth } from "../lib/firebase";

// ── Types ──────────────────────────────────────────────────────────────────────

type ComparativoStatus = "completo" | "parcial" | "sin_entrega" | "sin_pedido";

interface ComparativoRow {
  master_sku: string;
  sku_thd: string;
  descripcion: string;
  total_pedido: number;
  total_salida: number;
  diferencia: number;
  pct_cumplimiento: number;
  status: ComparativoStatus;
}

interface ComparativoSummary {
  total_productos: number;
  total_pedido: number;
  total_salida: number;
  pct_cumplimiento_general: number;
}

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  ComparativoStatus,
  { label: string; rowBg: string; badgeBg: string; badgeText: string }
> = {
  completo: {
    label: "Completo",
    rowBg: "bg-green-50 dark:bg-green-950/30",
    badgeBg: "bg-green-100 dark:bg-green-900/50",
    badgeText: "text-green-700 dark:text-green-300",
  },
  parcial: {
    label: "Parcial",
    rowBg: "bg-amber-50 dark:bg-amber-950/20",
    badgeBg: "bg-amber-100 dark:bg-amber-900/40",
    badgeText: "text-amber-700 dark:text-amber-300",
  },
  sin_entrega: {
    label: "Sin Entrega",
    rowBg: "bg-red-50 dark:bg-red-950/30",
    badgeBg: "bg-red-100 dark:bg-red-900/50",
    badgeText: "text-red-700 dark:text-red-300",
  },
  sin_pedido: {
    label: "Sin Pedido",
    rowBg: "",
    badgeBg: "bg-gray-100 dark:bg-gray-700",
    badgeText: "text-gray-600 dark:text-gray-400",
  },
};

const MESES = [
  { value: 0, label: "Todos los meses" },
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

const CATEGORIAS = [{ value: "baños", label: "Baños" }];

const TABLE_GRID = "6rem 7rem minmax(0,3fr) 7rem 7rem 7rem 9rem 7rem";

// ── Helpers ────────────────────────────────────────────────────────────────────

type SortCol = keyof ComparativoRow;
type SortDir = "asc" | "desc";

function pctTextColor(pct: number) {
  if (pct >= 100) return "text-green-600 dark:text-green-400";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function pctBarColor(pct: number) {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function summaryPctClasses(pct: number) {
  if (pct >= 90)
    return "bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300";
  if (pct >= 50)
    return "bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300";
  return "bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300";
}

// ── Component ──────────────────────────────────────────────────────────────────

export function THDComparativo() {
  useDarkMode();

  const [anio, setAnio] = useState(2026);
  const [mes, setMes] = useState(0);
  const [categoria, setCategoria] = useState("baños");
  const [search, setSearch] = useState("");

  const [data, setData] = useState<ComparativoRow[]>([]);
  const [summary, setSummary] = useState<ComparativoSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [sortCol, setSortCol] = useState<SortCol>("total_pedido");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async (a: number, m: number, c: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ anio: String(a), categoria: c });
      if (m !== 0) params.set("mes", String(m));
      const raw = (await fetchAPI(`/api/thd/comparativo?${params}`)) as Record<string, unknown>;
      const rows = (raw.data ?? raw.rows ?? raw.items ?? []) as ComparativoRow[];
      setData(Array.isArray(rows) ? rows : []);
      setSummary((raw.summary ?? null) as ComparativoSummary | null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(2026, 0, "baños");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBuscar = () => fetchData(anio, mes, categoria);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadMsg(null);
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : "";
      const apiBase =
        import.meta.env.VITE_API_BASE_URL ||
        (import.meta.env.DEV ? "" : "http://localhost:3000");

      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${apiBase}/api/thd/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as Record<string, string>;
        throw new Error(body.error || body.message || `HTTP ${res.status}`);
      }

      setUploadMsg({ ok: true, text: "Archivo subido correctamente. Actualizando datos..." });
      await fetchData(anio, mes, categoria);
    } catch (err) {
      setUploadMsg({
        ok: false,
        text: `Error al subir archivo: ${(err as Error).message}`,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const av = a[sortCol];
    const bv = b[sortCol];
    if (typeof av === "number" && typeof bv === "number") {
      return sortDir === "asc" ? av - bv : bv - av;
    }
    return sortDir === "asc"
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const searchLower = search.toLowerCase();
  const filteredData = searchLower
    ? sortedData.filter(
        (row) =>
          row.master_sku.toLowerCase().includes(searchLower) ||
          row.sku_thd.toLowerCase().includes(searchLower) ||
          row.descripcion.toLowerCase().includes(searchLower)
      )
    : sortedData;

  const sortIcon = (col: SortCol) => {
    if (sortCol !== col) return " ⬍";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  const SortHeader = ({
    col,
    label,
    align = "center",
    last = false,
  }: {
    col: SortCol;
    label: string;
    align?: "left" | "center";
    last?: boolean;
  }) => (
    <button
      onClick={() => handleSort(col)}
      className={`w-full py-4 px-3 ${
        !last ? "border-r border-gray-400 dark:border-gray-600" : ""
      } flex items-center ${
        align === "left" ? "justify-start" : "justify-center"
      } font-robotoMedium text-gray-900 dark:text-white text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors`}
    >
      {label}
      {sortIcon(col)}
    </button>
  );

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 flex flex-col min-h-screen">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <h1 className="text-3xl font-bold tracking-wide text-gray-900 dark:text-white mb-5">
          THD Comparativo
        </h1>

        {/* Filters bar */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>

          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
          >
            {MESES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Buscar MOD, SKU THD o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm w-72"
          />

          <button
            onClick={handleBuscar}
            disabled={loading}
            className="px-6 py-2 border border-blue-600 text-blue-700 dark:text-blue-400 dark:border-blue-500 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-6 py-2 border border-green-600 text-green-700 dark:text-green-400 dark:border-green-500 hover:bg-green-600 hover:text-white dark:hover:bg-green-600 dark:hover:text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                Subiendo...
              </>
            ) : (
              "⬆ Subir Excel"
            )}
          </button>
        </div>

        {/* Upload feedback */}
        {uploadMsg && (
          <div
            className={`mt-4 p-3 border rounded-lg text-sm ${
              uploadMsg.ok
                ? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                : "bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
            }`}
          >
            {uploadMsg.text}
          </div>
        )}

        {/* Summary cards */}
        {summary && !loading && (
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Total Productos
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.total_productos.toLocaleString("es-MX")}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Total Pedido
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.total_pedido.toLocaleString("es-MX")}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Total Salida
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {summary.total_salida.toLocaleString("es-MX")}
              </p>
            </div>
            <div
              className={`border rounded-lg p-4 ${summaryPctClasses(summary.pct_cumplimiento_general)}`}
            >
              <p className="text-xs font-medium uppercase tracking-wide mb-1 opacity-75">
                % Cumplimiento General
              </p>
              <p className="text-2xl font-bold">
                {summary.pct_cumplimiento_general.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="flex-1 bg-white dark:bg-gray-800 mx-8 mt-4 mb-8 border border-gray-400 dark:border-gray-700 overflow-hidden flex flex-col rounded-lg">
        {/* Column headers */}
        <div
          className="grid [&>*]:min-w-0 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-400 dark:border-gray-600"
          style={{ gridTemplateColumns: TABLE_GRID }}
        >
          <SortHeader col="master_sku" label="MOD" />
          <SortHeader col="sku_thd" label="SKU THD" />
          <SortHeader col="descripcion" label="Descripción" align="left" />
          <SortHeader col="total_pedido" label="Pedido" />
          <SortHeader col="total_salida" label="Salida" />
          <SortHeader col="diferencia" label="Diferencia" />
          <SortHeader col="pct_cumplimiento" label="% Cumplimiento" />
          <div className="py-4 px-3 flex items-center justify-center">
            <span className="font-robotoMedium text-gray-900 dark:text-white text-sm">
              Status
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 dark:text-gray-400 font-robotoRegular mt-4">
                Cargando comparativo...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-red-500 font-robotoMedium">Error al cargar datos</p>
              <p className="text-gray-400 dark:text-gray-500 font-robotoRegular text-sm mt-2">
                {error}
              </p>
              <button
                onClick={handleBuscar}
                className="mt-4 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors text-sm"
              >
                Reintentar
              </button>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <span className="text-5xl">📋</span>
              <p className="text-gray-500 dark:text-gray-400 font-robotoMedium text-lg mt-2">
                {data.length === 0
                  ? "Sin datos para mostrar"
                  : "Sin resultados para la búsqueda"}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                {data.length === 0
                  ? "Sube un archivo Excel para comenzar o ajusta los filtros"
                  : "Intenta con otros términos de búsqueda"}
              </p>
            </div>
          ) : (
            filteredData.map((row) => {
              const cfg = STATUS_CFG[row.status] ?? STATUS_CFG.sin_pedido;
              const isNegDiff = row.diferencia < 0;
              return (
                <div
                  key={`${row.master_sku}-${row.sku_thd}`}
                  className={`grid [&>*]:min-w-0 border-b border-gray-200 dark:border-gray-700 ${cfg.rowBg} hover:opacity-90 transition-opacity`}
                  style={{ gridTemplateColumns: TABLE_GRID }}
                >
                  {/* MOD */}
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <span className="text-gray-700 dark:text-gray-300 text-sm font-mono">
                      {row.master_sku}
                    </span>
                  </div>
                  {/* SKU THD */}
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <span className="text-gray-700 dark:text-gray-300 text-sm font-mono">
                      {row.sku_thd}
                    </span>
                  </div>
                  {/* Descripción */}
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center">
                    <span
                      className="text-gray-900 dark:text-gray-100 text-sm truncate"
                      title={row.descripcion}
                    >
                      {row.descripcion}
                    </span>
                  </div>
                  {/* Pedido */}
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <span className="text-gray-900 dark:text-gray-100 text-sm">
                      {row.total_pedido.toLocaleString("es-MX")}
                    </span>
                  </div>
                  {/* Salida */}
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <span className="text-gray-900 dark:text-gray-100 text-sm">
                      {row.total_salida.toLocaleString("es-MX")}
                    </span>
                  </div>
                  {/* Diferencia */}
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <span
                      className={`text-sm font-medium ${
                        isNegDiff
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {row.diferencia.toLocaleString("es-MX")}
                    </span>
                  </div>
                  {/* % Cumplimiento */}
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1 w-full px-1">
                      <span
                        className={`text-sm font-bold ${pctTextColor(row.pct_cumplimiento)}`}
                      >
                        {row.pct_cumplimiento.toFixed(1)}%
                      </span>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pctBarColor(row.pct_cumplimiento)}`}
                          style={{ width: `${Math.min(100, row.pct_cumplimiento)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Status */}
                  <div className="py-3 px-3 flex items-center justify-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badgeBg} ${cfg.badgeText}`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
