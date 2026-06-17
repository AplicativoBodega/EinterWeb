import { useState, useEffect, useCallback, useMemo } from "react";
import { useDarkMode } from "../context/DarkModeContext";
import { fetchAPI } from "../lib/fetch";
import {
  calcularResultados,
  calcularResumenContenedores,
  sortResultados,
  DEFAULT_PARAMS,
  type ModelParams,
  type ProductoResultado,
  type ResumenContenedor,
  type SemaforoStatus,
} from "../lib/inventoryModel";

// ─── Helpers de estilo por estado ────────────────────────────────────────────
const STATUS_CFG: Record<
  SemaforoStatus,
  {
    label: string;
    dot: string;
    rowBg: string;
    badgeBg: string;
    badgeText: string;
    border: string;
  }
> = {
  rojo: {
    label: "Crítico",
    dot: "🔴",
    rowBg: "bg-red-50 dark:bg-red-950/30",
    badgeBg: "bg-red-100 dark:bg-red-900/50",
    badgeText: "text-red-700 dark:text-red-300",
    border: "border-l-4 border-l-red-500",
  },
  amarillo: {
    label: "Alerta",
    dot: "🟡",
    rowBg: "bg-yellow-50 dark:bg-yellow-950/20",
    badgeBg: "bg-yellow-100 dark:bg-yellow-900/40",
    badgeText: "text-yellow-700 dark:text-yellow-300",
    border: "border-l-4 border-l-yellow-400",
  },
  verde: {
    label: "OK",
    dot: "🟢",
    rowBg: "",
    badgeBg: "bg-green-100 dark:bg-green-900/40",
    badgeText: "text-green-700 dark:text-green-300",
    border: "border-l-4 border-l-green-400",
  },
  sin_datos: {
    label: "Sin datos",
    dot: "⚫",
    rowBg: "bg-gray-50 dark:bg-gray-800/30",
    badgeBg: "bg-gray-100 dark:bg-gray-700",
    badgeText: "text-gray-500 dark:text-gray-400",
    border: "border-l-4 border-l-gray-300",
  },
  sobrestock: {
    label: "Sobrestock",
    dot: "🔵",
    rowBg: "bg-blue-50 dark:bg-blue-950/20",
    badgeBg: "bg-blue-100 dark:bg-blue-900/40",
    badgeText: "text-blue-700 dark:text-blue-300",
    border: "border-l-4 border-l-blue-400",
  },
};

function fmt(n: number, dec = 0) {
  return n.toLocaleString("es-MX", { maximumFractionDigits: dec });
}

function fmtDias(d: number) {
  if (d >= 9999) return "—";
  if (d > 999) return "+999";
  return fmt(d, 1) + "d";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InventarioInteligente() {
  useDarkMode();

  // ── State ──────────────────────────────────────────────────────────────────
  const [rawItems, setRawItems] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demanda calculada automáticamente desde ventas Home Depot
  const [demandaHD, setDemandaHD] = useState<Record<string, number>>({});
  const [loadingHD, setLoadingHD] = useState(false);

  // Parámetros del modelo (solo configuración global, no edición por fila)
  const [params, setParams] = useState<ModelParams>(DEFAULT_PARAMS);
  const [showConfig, setShowConfig] = useState(false);

  // UI
  const [tab, setTab] = useState<"semaforo" | "contenedores">("semaforo");
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterStatus, setFilterStatus] = useState<SemaforoStatus | "">("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // ── Fetch productos desde Odoo ────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all: unknown[] = [];
      let pg = 1;
      while (true) {
        const res = (await fetchAPI(
          `/api/odoo/productos?page=${pg}&pageSize=100`,
        )) as { items?: unknown[]; total?: number };
        const items: unknown[] = res.items || [];
        all.push(...items);
        const total: number = res.total || 0;
        if (all.length >= total || items.length === 0) break;
        pg++;
        if (pg > 30) break;
      }
      setRawItems(all);
      setPage(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch demanda diaria desde ventas Home Depot ──────────────────────────
  // El cruce es por MOD (= master_sku en articulos = default_code en Odoo)
  const fetchDemandaHD = useCallback(async () => {
    setLoadingHD(true);
    try {
      const data = (await fetchAPI("/api/ventas-hd/demanda-diaria")) as {
        mod: string;
        demanda_diaria: number;
      }[];
      const map: Record<string, number> = {};
      for (const item of data) {
        if (item.demanda_diaria > 0) map[item.mod] = item.demanda_diaria;
      }
      setDemandaHD(map);
    } catch {
      // silencioso — el modelo muestra sin_datos para esos MODs
    } finally {
      setLoadingHD(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchDemandaHD();
  }, [fetchAll, fetchDemandaHD]);

  // ── Calcular resultados ────────────────────────────────────────────────────
  const resultados: ProductoResultado[] = useMemo(() => {
    const inputs = rawItems.map((item) => {
      const i = item as Record<string, unknown>;
      // master_sku en articulos = default_code en Odoo = MOD del producto
      const mod = String(i.master_sku ?? i.id_articulo ?? "");
      return {
        sku: mod,
        name: String(i.nombre_producto ?? ""),
        supplier: String(i.proveedor_nombre || "Sin proveedor"),
        supplierId:
          i.id_proveedor !== undefined ? Number(i.id_proveedor) : undefined,
        stock: Number(i.existencias) || 0,
        weightKg: Number(i.peso_kg) || 0,
        qtyPerCarton: i.cantidad_x_ctn != null ? Number(i.cantidad_x_ctn) : null,
        dimensionsCm:
          i.largo_cm || i.ancho_cm || i.alto_cm
            ? {
                largo: Number(i.largo_cm) || 0,
                ancho: Number(i.ancho_cm) || 0,
                alto: Number(i.alto_cm) || 0,
              }
            : undefined,
        pzsEnTransito: 0,
        // Cruce por MOD: demandaHD tiene keys = String(mod)
        demandaDiaria: demandaHD[mod] || 0,
      };
    });
    return sortResultados(calcularResultados(inputs, params));
  }, [rawItems, demandaHD, params]);

  // ── Conteos de semáforo ───────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { rojo: 0, amarillo: 0, verde: 0, sin_datos: 0, sobrestock: 0 };
    for (const r of resultados) c[r.semaforo]++;
    return c;
  }, [resultados]);

  // ── Proveedores únicos ────────────────────────────────────────────────────
  const suppliers = useMemo(
    () => [...new Set(resultados.map((r) => r.supplier))].sort(),
    [resultados],
  );

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = resultados;
    if (filterStatus) list = list.filter((r) => r.semaforo === filterStatus);
    if (filterSupplier)
      list = list.filter((r) => r.supplier === filterSupplier);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) || r.name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [resultados, filterStatus, filterSupplier, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filterStatus, filterSupplier, search]);

  // ── Contenedores ──────────────────────────────────────────────────────────
  const contenedores: ResumenContenedor[] = useMemo(
    () => calcularResumenContenedores(resultados),
    [resultados],
  );

  const updateParam = (key: keyof ModelParams, value: string) => {
    const num = parseFloat(value);
    setParams((prev) => ({ ...prev, [key]: isNaN(num) ? prev[key] : num }));
  };

  const isLoadingAny = loading || loadingHD;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 flex flex-col min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              🧠 Inventario Inteligente
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Demanda calculada de ventas Home Depot · {rawItems.length} productos
              {loadingHD && (
                <span className="ml-2 text-blue-500 animate-pulse">· cargando demanda HD…</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                showConfig
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              ⚙️ Parámetros
            </button>
            <button
              onClick={() => { fetchAll(); fetchDemandaHD(); }}
              disabled={isLoadingAny}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all disabled:opacity-60"
            >
              {isLoadingAny ? "⏳ Cargando…" : "🔄 Actualizar"}
            </button>
          </div>
        </div>

        {/* Config Panel */}
        {showConfig && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-850">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Parámetros del modelo
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {(
                [
                  { key: "leadTimeDias", label: "Lead time (días)" },
                  { key: "diasObjetivo", label: "Cobertura objetivo (días)" },
                  { key: "alertaRojo", label: "Umbral crítico (días)" },
                  { key: "alertaAmarillo", label: "Umbral alerta (días)" },
                  { key: "minPzsSku", label: "Mín. piezas / SKU" },
                ] as { key: keyof ModelParams; label: string }[]
              ).map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    value={params[key] as number}
                    onChange={(e) => updateParam(key, e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(
          [
            { key: "rojo", label: "Crítico" },
            { key: "amarillo", label: "Alerta" },
            { key: "verde", label: "OK" },
            { key: "sin_datos", label: "Sin datos HD" },
            { key: "sobrestock", label: "Sobrestock" },
          ] as { key: SemaforoStatus; label: string }[]
        ).map(({ key, label }) => {
          const cfg = STATUS_CFG[key];
          const active = filterStatus === key;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(active ? "" : key)}
              className={`rounded-xl p-4 text-left transition-all hover:scale-[1.02] border-2 ${
                active
                  ? `${cfg.badgeBg} border-current`
                  : "bg-white dark:bg-gray-800 border-transparent hover:border-gray-200 dark:hover:border-gray-600 shadow-sm"
              }`}
            >
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {fmt(counts[key])}
              </div>
              <div className={`text-sm font-medium mt-0.5 ${cfg.badgeText}`}>
                {cfg.dot} {label}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Banner sin datos HD ────────────────────────────────────────────── */}
      {counts.sin_datos > 0 && !loadingHD && (
        <div className="mx-6 mb-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
          <strong>ℹ️ {counts.sin_datos} productos sin ventas HD registradas.</strong>{" "}
          Estos SKUs no tienen historial en la tabla de ventas semanales de Home Depot
          y no pueden ser evaluados por el modelo.
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex gap-1">
          {(
            [
              { id: "semaforo", label: "📊 Semáforo" },
              { id: "contenedores", label: "🚢 Contenedores" },
            ] as { id: "semaforo" | "contenedores"; label: string }[]
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          ❌ {error}
        </div>
      )}

      {isLoadingAny && rawItems.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-bounce">🧠</div>
            <p className="text-gray-500 dark:text-gray-400">Cargando datos…</p>
          </div>
        </div>
      ) : (
        <>
          {tab === "semaforo" && (
            <SemaforoTab
              paginated={paginated}
              filtered={filtered}
              suppliers={suppliers}
              filterSupplier={filterSupplier}
              filterStatus={filterStatus}
              search={search}
              page={page}
              totalPages={totalPages}
              PAGE_SIZE={PAGE_SIZE}
              demandaHD={demandaHD}
              onSearchChange={setSearch}
              onSupplierChange={setFilterSupplier}
              onStatusChange={(v) => setFilterStatus(v as SemaforoStatus | "")}
              onPageChange={setPage}
            />
          )}
          {tab === "contenedores" && (
            <ContenedoresTab contenedores={contenedores} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Semáforo Tab ─────────────────────────────────────────────────────────────

interface SemaforoTabProps {
  paginated: ProductoResultado[];
  filtered: ProductoResultado[];
  suppliers: string[];
  filterSupplier: string;
  filterStatus: SemaforoStatus | "";
  search: string;
  page: number;
  totalPages: number;
  PAGE_SIZE: number;
  demandaHD: Record<string, number>;
  onSearchChange: (v: string) => void;
  onSupplierChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onPageChange: (p: number) => void;
}

function SemaforoTab({
  paginated,
  filtered,
  suppliers,
  filterSupplier,
  filterStatus,
  search,
  page,
  totalPages,
  PAGE_SIZE,
  demandaHD,
  onSearchChange,
  onSupplierChange,
  onStatusChange,
  onPageChange,
}: SemaforoTabProps) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="🔍 Buscar SKU o nombre…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 w-56"
        />
        <select
          value={filterSupplier}
          onChange={(e) => onSupplierChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        >
          <option value="">Todos los proveedores</option>
          {suppliers.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.dot} {v.label}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 self-center">
          {filtered.length} productos
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">
              <th className="px-3 py-2.5 text-left border-b border-r border-gray-300 dark:border-gray-600 w-8">#</th>
              <th className="px-3 py-2.5 text-left border-b border-r border-gray-300 dark:border-gray-600 min-w-[80px]">SKU</th>
              <th className="px-3 py-2.5 text-left border-b border-r border-gray-300 dark:border-gray-600 min-w-[200px]">Nombre</th>
              <th className="px-3 py-2.5 text-left border-b border-r border-gray-300 dark:border-gray-600 min-w-[100px]">Proveedor</th>
              <th className="px-3 py-2.5 text-right border-b border-r border-gray-300 dark:border-gray-600">Stock</th>
              <th className="px-3 py-2.5 text-right border-b border-r border-gray-300 dark:border-gray-600">Dem./día HD</th>
              <th className="px-3 py-2.5 text-right border-b border-r border-gray-300 dark:border-gray-600">Días cob.</th>
              <th className="px-3 py-2.5 text-center border-b border-gray-300 dark:border-gray-600 min-w-[100px]">Estado</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r, idx) => {
              const cfg = STATUS_CFG[r.semaforo];
              const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
              // r.sku contiene el MOD (master_sku del artículo)
              const hdDem = demandaHD[r.sku];
              return (
                <tr
                  key={r.sku}
                  className={`border-b border-gray-200 dark:border-gray-700 hover:brightness-95 transition-all ${cfg.rowBg} ${cfg.border}`}
                >
                  <td className="px-3 py-2 text-gray-400 dark:text-gray-500 border-r border-gray-200 dark:border-gray-700 text-center">
                    {globalIdx}
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap">
                    {r.sku}
                  </td>
                  <td className="px-3 py-2 text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700 max-w-xs truncate" title={r.name}>
                    {r.name}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap">
                    {r.supplier}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700">
                    {fmt(r.stock)}
                  </td>
                  {/* Demanda diaria — solo lectura, calculada de HD */}
                  <td className="px-3 py-2 text-right border-r border-gray-200 dark:border-gray-700">
                    {hdDem ? (
                      <span className="font-medium text-blue-700 dark:text-blue-400">
                        {hdDem.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 italic text-xs">sin datos</span>
                    )}
                  </td>
                  {/* Días cobertura */}
                  <td className={`px-3 py-2 text-right font-semibold border-r border-gray-200 dark:border-gray-700 ${cfg.badgeText}`}>
                    {fmtDias(r.diasInventario)}
                  </td>
                  {/* Estado badge */}
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badgeBg} ${cfg.badgeText}`}>
                      {cfg.dot} {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
            <div className="text-5xl mb-3">🔍</div>
            <p>Sin resultados para los filtros actuales.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Página {page} de {totalPages} · {filtered.length} productos
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
            >
              ‹ Ant.
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button
                  key={pg}
                  onClick={() => onPageChange(pg)}
                  className={`px-3 py-1 text-sm rounded border ${
                    pg === page
                      ? "bg-blue-500 text-white border-blue-500"
                      : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
            >
              Sig. ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contenedores Tab ─────────────────────────────────────────────────────────

function ContenedoresTab({ contenedores }: { contenedores: ResumenContenedor[] }) {
  const [selectedTipo, setSelectedTipo] = useState<Record<string, string>>({});

  if (contenedores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-20 text-gray-400 dark:text-gray-500">
        <div className="text-5xl mb-3">🚢</div>
        <p className="text-lg">Sin pedidos pendientes.</p>
        <p className="text-sm mt-1">
          Cuando haya productos en alerta con datos de ventas HD, aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Estimación de llenado por proveedor basada en demanda de ventas Home Depot.
        El modelo resalta su recomendación con{" "}
        <span className="text-green-600 dark:text-green-400 font-semibold">✦ Recomendado</span>.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {contenedores.map((c) => {
          const tipoActual = selectedTipo[c.supplier] ?? c.tipoRecomendado;
          const opcion = c.opciones.find((o) => o.tipo === tipoActual) ?? c.opciones[0];

          const barColor = (pct: number) =>
            pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-orange-400";

          return (
            <div key={c.supplier} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between mb-4 gap-2">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base leading-tight">
                  🏭 {c.supplier}
                </h3>
                <div className="text-xs text-gray-400 dark:text-gray-500 shrink-0 text-right">
                  <div>
                    {c.pesoTotalKg.toLocaleString("es-MX", { maximumFractionDigits: 1 })} kg ·{" "}
                    {c.volumenTotalM3.toLocaleString("es-MX", { maximumFractionDigits: 2 })} m³
                  </div>
                  {(() => {
                    const totalCtns = c.productos.reduce((sum, p) =>
                      sum + (p.qtyPerCarton && p.qtyPerCarton > 0 ? Math.ceil(p.pzsAPedir / p.qtyPerCarton) : 0), 0);
                    return totalCtns > 0 ? (
                      <div className="text-blue-500 dark:text-blue-400 font-medium">{totalCtns.toLocaleString("es-MX")} CTN total</div>
                    ) : null;
                  })()}
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                {c.opciones.map((o) => (
                  <button
                    key={o.tipo}
                    onClick={() => setSelectedTipo((prev) => ({ ...prev, [c.supplier]: o.tipo }))}
                    className={`relative flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                      o.tipo === tipoActual
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    {o.tipo}&apos;
                    {o.recomendado && (
                      <span className="absolute -top-2 -right-1 text-[10px] bg-green-500 text-white px-1 rounded-full leading-4">✦</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>⚖️ Peso</span>
                  <span>
                    {c.pesoTotalKg.toLocaleString("es-MX", { maximumFractionDigits: 1 })} / {opcion.pesoMaxKg.toLocaleString("es-MX")} kg{" "}
                    <strong className={opcion.pctPeso > 100 ? "text-red-500" : opcion.pctPeso >= 80 ? "text-green-600 dark:text-green-400" : "text-orange-500"}>
                      {opcion.pctPeso}%
                    </strong>
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div className={`h-3 rounded-full transition-all ${barColor(opcion.pctPeso)}`} style={{ width: `${Math.min(opcion.pctPeso, 100)}%` }} />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>📦 Volumen</span>
                  <span>
                    {c.volumenTotalM3.toLocaleString("es-MX", { maximumFractionDigits: 2 })} / {opcion.volMaxM3} m³{" "}
                    <strong className={opcion.pctVol > 100 ? "text-red-500" : opcion.pctVol >= 80 ? "text-green-600 dark:text-green-400" : "text-orange-500"}>
                      {opcion.pctVol}%
                    </strong>
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div className={`h-3 rounded-full transition-all ${barColor(opcion.pctVol)}`} style={{ width: `${Math.min(opcion.pctVol, 100)}%` }} />
                </div>
              </div>

              {opcion.pctMax > 100 && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                  🚨 El pedido supera la capacidad ({opcion.pctMax}%). Divide el envío en múltiples contenedores.
                </p>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {c.productos.length} SKUs incluidos
                </p>
                <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                  {c.productos.map((p) => {
                    const cfg = STATUS_CFG[p.semaforo];
                    return (
                      <div key={p.sku} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700/50 rounded px-2 py-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span>{cfg.dot}</span>
                          <span className="font-mono text-gray-600 dark:text-gray-400 shrink-0">{p.sku}</span>
                          <span className="text-gray-700 dark:text-gray-300 truncate">{p.name}</span>
                        </div>
                        <div className="flex gap-3 shrink-0 ml-2 text-gray-500 dark:text-gray-400">
                          {p.qtyPerCarton && p.qtyPerCarton > 0 && (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {Math.ceil(p.pzsAPedir / p.qtyPerCarton)} CTN
                            </span>
                          )}
                          <span>{p.pzsAPedir.toLocaleString("es-MX")} pzs</span>
                          {p.pesoKg > 0 && <span>{Math.round(p.pesoKg).toLocaleString("es-MX")} kg</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
