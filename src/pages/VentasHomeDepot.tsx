import { useState, useEffect, useRef } from "react";
import { useDarkMode } from "../context/DarkModeContext";
import { fetchAPI } from "../lib/fetch";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Semana {
  semana_num: number;
  semana_label: string;
}

interface VentaSemana {
  id: number;
  cantidad: number;
  importe: number;
}

interface Producto {
  mod: number;
  sku: string;
  descripcion: string;
  ventas: Record<number, VentaSemana>;
}

interface MatrizResponse {
  anio: number;
  semanas: Semana[];
  productos: Producto[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatImporte(v: number): string {
  return v.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
}

// ─── Edit modal ──────────────────────────────────────────────────────────────

interface CeldaEditada {
  id: number | null;
  anio: number;
  semana_num: number;
  semana_label: string;
  mod: number;
  sku: string;
  descripcion: string;
  cantidad: number;
  importe: number;
}

interface EditModalProps {
  celda: CeldaEditada;
  onClose: () => void;
  onSave: (celda: CeldaEditada) => Promise<void>;
}

function EditModal({ celda, onClose, onSave }: EditModalProps) {
  const [cantidad, setCantidad] = useState(String(celda.cantidad));
  const [importe, setImporte] = useState(String(celda.importe));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const c = Number(cantidad);
    const i = Number(importe);
    if (isNaN(c) || c < 0) { setError("Cantidad inválida"); return; }
    if (isNaN(i) || i < 0) { setError("Importe inválido"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...celda, cantidad: c, importe: i });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Editar semana {celda.semana_label}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 truncate">
          {celda.descripcion}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cantidad (piezas)
            </label>
            <input
              type="number"
              min="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Importe (MXN)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={importe}
              onChange={(e) => setImporte(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-500">{error}</p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add-product modal ────────────────────────────────────────────────────────

interface AddProductModalProps {
  anio: number;
  onClose: () => void;
  onSave: (data: { mod: number; sku: string; descripcion: string }) => Promise<void>;
}

function AddProductModal({ anio, onClose, onSave }: AddProductModalProps) {
  const [mod, setMod] = useState("");
  const [sku, setSku] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const modNum = Number(mod);
    if (!mod || isNaN(modNum) || modNum <= 0) { setError("MOD inválido"); return; }
    if (!sku.trim()) { setError("SKU requerido"); return; }
    if (!descripcion.trim()) { setError("Descripción requerida"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ mod: modNum, sku: sku.trim(), descripcion: descripcion.trim() });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Nuevo producto — {anio}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Se añadirá con 0 piezas y $0 en todas las semanas registradas.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">MOD</label>
            <input type="number" min="1" value={mod} onChange={(e) => setMod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
            <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {saving ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const ANIOS_DISPONIBLES = [2025, 2026];

export function VentasHomeDepot() {
  useDarkMode();

  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [matriz, setMatriz] = useState<MatrizResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editCelda, setEditCelda] = useState<CeldaEditada | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashMsg = (msg: string) => {
    setActionMsg(msg);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setActionMsg(null), 3000);
  };

  const fetchMatriz = async (a = anio) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAPI(`/api/ventas-hd?anio=${a}`) as MatrizResponse;
      setMatriz(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatriz(anio); }, [anio]);

  // ── Edit cell ──────────────────────────────────────────────────────────────

  const handleCellClick = (producto: Producto, semana: Semana) => {
    const venta = producto.ventas[semana.semana_num];
    setEditCelda({
      id: venta?.id ?? null,
      anio,
      semana_num: semana.semana_num,
      semana_label: semana.semana_label,
      mod: producto.mod,
      sku: producto.sku,
      descripcion: producto.descripcion,
      cantidad: venta?.cantidad ?? 0,
      importe: venta?.importe ?? 0,
    });
  };

  const handleSaveEdit = async (celda: CeldaEditada) => {
    if (celda.id) {
      await fetchAPI(`/api/ventas-hd/${celda.id}`, {
        method: "PUT",
        body: JSON.stringify({ cantidad: celda.cantidad, importe: celda.importe }),
      });
    } else {
      await fetchAPI("/api/ventas-hd", {
        method: "POST",
        body: JSON.stringify({
          anio: celda.anio,
          semana_num: celda.semana_num,
          semana_label: celda.semana_label,
          mod: celda.mod,
          sku: celda.sku,
          descripcion: celda.descripcion,
          cantidad: celda.cantidad,
          importe: celda.importe,
        }),
      });
    }
    flashMsg("Guardado correctamente");
    await fetchMatriz(anio);
  };

  // ── Add product ────────────────────────────────────────────────────────────

  const handleAddProduct = async (data: { mod: number; sku: string; descripcion: string }) => {
    const semanas = matriz?.semanas ?? [];
    // Insert a zero-row for the first available semana so the product appears in the matrix
    const firstSemana = semanas[0];
    if (!firstSemana) throw new Error("No hay semanas registradas aún para este año");
    await fetchAPI("/api/ventas-hd", {
      method: "POST",
      body: JSON.stringify({
        anio,
        semana_num: firstSemana.semana_num,
        semana_label: firstSemana.semana_label,
        ...data,
        cantidad: 0,
        importe: 0,
      }),
    });
    flashMsg("Producto agregado");
    await fetchMatriz(anio);
  };

  // ── Totals ─────────────────────────────────────────────────────────────────

  const semanas = matriz?.semanas ?? [];
  const productos = matriz?.productos ?? [];

  const totalPorSemana = (semana_num: number) =>
    productos.reduce((s, p) => s + (p.ventas[semana_num]?.cantidad ?? 0), 0);

  const importePorSemana = (semana_num: number) =>
    productos.reduce((s, p) => s + (p.ventas[semana_num]?.importe ?? 0), 0);

  const totalPorProducto = (p: Producto) =>
    semanas.reduce((s, sem) => s + (p.ventas[sem.semana_num]?.cantidad ?? 0), 0);

  const importePorProducto = (p: Producto) =>
    semanas.reduce((s, sem) => s + (p.ventas[sem.semana_num]?.importe ?? 0), 0);

  const granTotal = productos.reduce(
    (s, p) => s + semanas.reduce((ss, sem) => ss + (p.ventas[sem.semana_num]?.cantidad ?? 0), 0),
    0
  );
  const granImporte = productos.reduce(
    (s, p) => s + semanas.reduce((ss, sem) => ss + (p.ventas[sem.semana_num]?.importe ?? 0), 0),
    0
  );

  // ── Cell style ─────────────────────────────────────────────────────────────

  const cellBg = (cantidad: number) => {
    if (cantidad === 0) return "bg-gray-50 dark:bg-gray-800/50";
    if (cantidad >= 200) return "bg-green-50 dark:bg-green-900/20";
    if (cantidad >= 100) return "bg-blue-50 dark:bg-blue-900/20";
    return "";
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900" style={{ minHeight: 0 }}>

      {/* ── Header ── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ventas Home Depot</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Ventas semanales por producto — vista matricial
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {actionMsg && (
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">{actionMsg}</span>
          )}

          {/* Year selector */}
          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            {ANIOS_DISPONIBLES.map((a) => (
              <button
                key={a}
                onClick={() => setAnio(a)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  anio === a
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddProduct(true)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            + Producto
          </button>

          <button
            onClick={() => fetchMatriz(anio)}
            disabled={loading}
            className="px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Cargando…" : "↻ Actualizar"}
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      {matriz && !loading && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex gap-8 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">{productos.length}</span> productos
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">{semanas.length}</span> semanas
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            Total piezas:{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {granTotal.toLocaleString("es-MX")}
            </span>
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            Total importe:{" "}
            <span className="font-semibold text-green-600 dark:text-green-400">
              {formatImporte(granImporte)}
            </span>
          </span>
        </div>
      )}

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="ml-4 text-gray-500 dark:text-gray-400">Cargando datos…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-red-500 font-semibold">Error al cargar datos</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && matriz && semanas.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No hay datos para {anio}</p>
          <p className="text-gray-400 text-sm">Importa datos desde el Excel o agrega un producto para comenzar.</p>
        </div>
      )}

      {/* ── Matrix Table ── */}
      {!loading && !error && matriz && semanas.length > 0 && (
        <div className="flex-1 overflow-auto mx-4 my-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm" style={{ minHeight: 0 }}>
          <table className="border-collapse min-w-max text-sm">
            <thead>
              {/* ── Row 1: week numbers ── */}
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="sticky left-0 z-20 bg-gray-100 dark:bg-gray-700 border-b-2 border-r-2 border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400 min-w-[3rem]">
                  MOD
                </th>
                <th className="sticky left-12 z-20 bg-gray-100 dark:bg-gray-700 border-b-2 border-r border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400 min-w-[6rem]">
                  SKU
                </th>
                <th className="sticky left-36 z-20 bg-gray-100 dark:bg-gray-700 border-b-2 border-r-2 border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400 min-w-[14rem] max-w-[16rem]">
                  Descripción
                </th>
                {semanas.map((s) => (
                  <th
                    key={s.semana_num}
                    colSpan={1}
                    className="border-b-2 border-r border-gray-300 dark:border-gray-600 px-2 py-1 text-center text-xs font-normal text-gray-400 dark:text-gray-500 min-w-[6rem]"
                  >
                    Sem {s.semana_num}
                  </th>
                ))}
                <th className="border-b-2 border-l-2 border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-xs text-gray-500 dark:text-gray-400 min-w-[7rem] bg-yellow-50 dark:bg-yellow-900/20">
                  Total
                </th>
              </tr>

              {/* ── Row 2: week labels ── */}
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="sticky left-0 z-20 bg-gray-100 dark:bg-gray-700 border-b border-r-2 border-gray-300 dark:border-gray-600 px-3 py-1" />
                <th className="sticky left-12 z-20 bg-gray-100 dark:bg-gray-700 border-b border-r border-gray-300 dark:border-gray-600 px-3 py-1" />
                <th className="sticky left-36 z-20 bg-gray-100 dark:bg-gray-700 border-b border-r-2 border-gray-300 dark:border-gray-600 px-3 py-1" />
                {semanas.map((s) => (
                  <th
                    key={s.semana_num}
                    className="border-b border-r border-gray-300 dark:border-gray-600 px-2 py-1 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap"
                  >
                    {s.semana_label}
                  </th>
                ))}
                <th className="border-b border-l-2 border-gray-300 dark:border-gray-600 px-3 py-1 bg-yellow-50 dark:bg-yellow-900/20" />
              </tr>
            </thead>

            <tbody>
              {productos.map((producto, idx) => (
                <tr
                  key={producto.mod}
                  className={idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}
                >
                  {/* Sticky: MOD */}
                  <td className={`sticky left-0 z-10 border-b border-r-2 border-gray-200 dark:border-gray-700 px-3 py-2 text-center font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 ${idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}`}>
                    {producto.mod}
                  </td>
                  {/* Sticky: SKU */}
                  <td className={`sticky left-12 z-10 border-b border-r border-gray-200 dark:border-gray-700 px-3 py-2 font-mono text-xs text-gray-500 dark:text-gray-400 ${idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}`}>
                    {producto.sku}
                  </td>
                  {/* Sticky: Descripción */}
                  <td className={`sticky left-36 z-10 border-b border-r-2 border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-800 dark:text-gray-200 max-w-[16rem] ${idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}`}>
                    <span className="line-clamp-2" title={producto.descripcion}>
                      {producto.descripcion}
                    </span>
                  </td>

                  {/* Week cells */}
                  {semanas.map((s) => {
                    const v = producto.ventas[s.semana_num];
                    const cant = v?.cantidad ?? 0;
                    const imp = v?.importe ?? 0;
                    return (
                      <td
                        key={s.semana_num}
                        onClick={() => handleCellClick(producto, s)}
                        className={`border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center cursor-pointer hover:ring-2 hover:ring-blue-400 hover:z-10 hover:relative transition-all ${cellBg(cant)}`}
                      >
                        <div className="font-semibold text-gray-800 dark:text-gray-200 text-xs leading-none">
                          {cant.toLocaleString("es-MX")}
                        </div>
                        <div className="text-[10px] text-green-600 dark:text-green-400 leading-none mt-0.5 whitespace-nowrap">
                          {imp > 0 ? formatImporte(imp) : "—"}
                        </div>
                      </td>
                    );
                  })}

                  {/* Row total */}
                  <td className="border-b border-l-2 border-gray-200 dark:border-gray-700 px-3 py-1.5 text-center bg-yellow-50 dark:bg-yellow-900/20">
                    <div className="font-bold text-gray-900 dark:text-white text-xs">
                      {totalPorProducto(producto).toLocaleString("es-MX")}
                    </div>
                    <div className="text-[10px] text-green-700 dark:text-green-400 whitespace-nowrap">
                      {formatImporte(importePorProducto(producto))}
                    </div>
                  </td>
                </tr>
              ))}

              {/* ── Totals row ── */}
              <tr className="bg-yellow-50 dark:bg-yellow-900/20 font-bold">
                <td className="sticky left-0 z-10 bg-yellow-50 dark:bg-yellow-900/20 border-t-2 border-r-2 border-gray-300 dark:border-gray-600 px-3 py-2 text-xs text-gray-700 dark:text-gray-300" />
                <td className="sticky left-12 z-10 bg-yellow-50 dark:bg-yellow-900/20 border-t-2 border-r border-gray-300 dark:border-gray-600 px-3 py-2" />
                <td className="sticky left-36 z-10 bg-yellow-50 dark:bg-yellow-900/20 border-t-2 border-r-2 border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200">
                  TOTALES
                </td>
                {semanas.map((s) => (
                  <td
                    key={s.semana_num}
                    className="border-t-2 border-r border-gray-300 dark:border-gray-600 px-2 py-1.5 text-center"
                  >
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      {totalPorSemana(s.semana_num).toLocaleString("es-MX")}
                    </div>
                    <div className="text-[10px] text-green-700 dark:text-green-400 whitespace-nowrap">
                      {formatImporte(importePorSemana(s.semana_num))}
                    </div>
                  </td>
                ))}
                <td className="border-t-2 border-l-2 border-gray-300 dark:border-gray-600 px-3 py-1.5 text-center">
                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                    {granTotal.toLocaleString("es-MX")}
                  </div>
                  <div className="text-[10px] text-green-700 dark:text-green-400 whitespace-nowrap">
                    {formatImporte(granImporte)}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}
      {editCelda && (
        <EditModal
          celda={editCelda}
          onClose={() => setEditCelda(null)}
          onSave={handleSaveEdit}
        />
      )}

      {showAddProduct && (
        <AddProductModal
          anio={anio}
          onClose={() => setShowAddProduct(false)}
          onSave={handleAddProduct}
        />
      )}
    </div>
  );
}
