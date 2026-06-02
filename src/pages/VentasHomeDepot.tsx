import { useState, useEffect } from "react";
import { useDarkMode } from "../context/DarkModeContext";
import { fetchAPI } from "../lib/fetch";

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

const TABLE_GRID = "6rem 7rem minmax(0,3fr) 7rem 7rem 7rem 9rem 7rem";

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

export function VentasHomeDepot() {
  useDarkMode();
  const [data, setData] = useState<ComparativoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = (await fetchAPI(
        `/api/thd/comparativo?anio=2026&categoria=baños`
      )) as Record<string, unknown>;
      const rows = (raw.data ?? raw.rows ?? raw.items ?? []) as ComparativoRow[];
      setData(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 flex flex-col min-h-screen">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <h1 className="text-3xl font-bold tracking-wide text-gray-900 dark:text-white">
          Ventas Home Depot
        </h1>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 mx-8 mt-4 mb-8 border border-gray-400 dark:border-gray-700 overflow-hidden flex flex-col rounded-lg">
        {/* Column headers */}
        <div
          className="grid [&>*]:min-w-0 bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-400 dark:border-gray-600"
          style={{ gridTemplateColumns: TABLE_GRID }}
        >
          {(
            [
              "MOD",
              "SKU THD",
              "Descripción",
              "Pedido",
              "Salida",
              "Diferencia",
              "% Cumplimiento",
              "Status",
            ] as const
          ).map((label, i, arr) => (
            <div
              key={label}
              className={`py-4 px-3 flex items-center ${
                label === "Descripción" ? "justify-start" : "justify-center"
              } ${i < arr.length - 1 ? "border-r border-gray-400 dark:border-gray-600" : ""}`}
            >
              <span className="font-robotoMedium text-gray-900 dark:text-white text-sm">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="text-gray-500 dark:text-gray-400 font-robotoRegular mt-4">
                Cargando ventas Home Depot...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-red-500 font-robotoMedium">Error al cargar datos</p>
              <p className="text-gray-400 dark:text-gray-500 font-robotoRegular text-sm mt-2">
                {error}
              </p>
              <button
                onClick={fetchData}
                className="mt-4 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors text-sm"
              >
                Reintentar
              </button>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <p className="text-gray-500 dark:text-gray-400 font-robotoMedium text-lg mt-2">
                Sin datos para mostrar
              </p>
            </div>
          ) : (
            data.map((row) => {
              const cfg = STATUS_CFG[row.status] ?? STATUS_CFG.sin_pedido;
              const isNegDiff = row.diferencia < 0;
              return (
                <div
                  key={`${row.master_sku}-${row.sku_thd}`}
                  className={`grid [&>*]:min-w-0 border-b border-gray-200 dark:border-gray-700 ${cfg.rowBg} hover:opacity-90 transition-opacity`}
                  style={{ gridTemplateColumns: TABLE_GRID }}
                >
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <span className="text-gray-700 dark:text-gray-300 text-sm font-mono">
                      {row.master_sku}
                    </span>
                  </div>
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <span className="text-gray-700 dark:text-gray-300 text-sm font-mono">
                      {row.sku_thd}
                    </span>
                  </div>
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center">
                    <span
                      className="text-gray-900 dark:text-gray-100 text-sm truncate"
                      title={row.descripcion}
                    >
                      {row.descripcion}
                    </span>
                  </div>
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <span className="text-gray-900 dark:text-gray-100 text-sm">
                      {row.total_pedido.toLocaleString("es-MX")}
                    </span>
                  </div>
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <span className="text-gray-900 dark:text-gray-100 text-sm">
                      {row.total_salida.toLocaleString("es-MX")}
                    </span>
                  </div>
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
                  <div className="py-3 px-3 border-r border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1 w-full px-1">
                      <span className={`text-sm font-bold ${pctTextColor(row.pct_cumplimiento)}`}>
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
