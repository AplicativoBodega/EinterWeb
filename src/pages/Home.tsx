import { useState, useEffect } from "react";
import { useDarkMode } from "../context/DarkModeContext";
import { api } from "../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardKpi = {
  ventasSemana: number;
  ventasMes: number;
  pedidosPendientes: number;
  productosEnAlerta: number;
};

type VentaMes = { mes: string; monto: number };
type TopProducto = { nombre: string; unidades: number };
type ProductoAlerta = { nombre: string; diasCobertura: number; semaforo: "CRITICO" | "ALERTA" };
type CatalogoProducto = { id: string; nombre: string; codigo: string; precio: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}

function fmtImporte(n: number) {
  return n.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}

const MESES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function getLast6Months(): { key: string; mes: string }[] {
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({ key, mes: MESES_ES[d.getMonth()] });
  }
  return result;
}

function currentMonthLabel(): string {
  const d = new Date();
  return `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
}

const impresoras = [
  "Zebra ZD420 (Oficina)",
  "HP LaserJet 1020 (Almacén)",
  "Brother QL-820NWB (Recepción)",
  "Zebra ZP450 (Embarque)",
];

// ─── SVG micro-components ─────────────────────────────────────────────────────

function FakeQR({ size = 140 }: { size?: number }) {
  const rows = [
    "1111111011010111111",
    "1000001000101000001",
    "1011101011101011101",
    "1011101001001011101",
    "1011101010001011101",
    "1000001001001000001",
    "1111111010101111111",
    "0000000011000000000",
    "1101011010101101011",
    "0110100101010110100",
    "1001011010110011011",
    "0010100111000010100",
    "1111111001011010111",
    "1000001010100010001",
    "1011101000010110001",
    "1011101010100011001",
    "1011101001010011011",
    "1000001011001010100",
    "1111111010101001101",
  ];
  const cell = size / rows.length;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" />
      {rows.map((row, r) =>
        row.split("").map((c, col) =>
          c === "1" ? (
            <rect
              key={`${r}-${col}`}
              x={col * cell}
              y={r * cell}
              width={cell + 0.5}
              height={cell + 0.5}
              fill="#111"
            />
          ) : null
        )
      )}
    </svg>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: { label: string; monto: number }[] }) {
  const maxMonto = Math.max(...data.map((v) => v.monto), 1);
  const niceMax = Math.ceil(maxMonto / 5000) * 5000 || 5000;
  const W = 400, H = 200;
  const padL = 60, padR = 10, padT = 10, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const spacing = chartW / Math.max(data.length, 1);
  const barW = spacing * 0.55;
  const yTicks = [0, 1, 2, 3, 4].map((i) => Math.round((niceMax / 4) * i));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {yTicks.map((tick) => {
        const y = padT + chartH - (tick / niceMax) * chartH;
        return (
          <g key={tick}>
            <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,3" />
            <text x={padL - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="sans-serif">
              {tick === 0 ? "0" : `$${(tick / 1000).toFixed(0)}k`}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = padL + i * spacing + (spacing - barW) / 2;
        const barH = (d.monto / niceMax) * chartH;
        const y = padT + chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="3" fill="#3b82f6" opacity="0.85" />
            <text x={x + barW / 2} y={H - padB + 16} textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="sans-serif">
              {d.label}
            </text>
          </g>
        );
      })}
      <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="#d1d5db" strokeWidth="1" />
      <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#d1d5db" strokeWidth="1" />
    </svg>
  );
}

function LineChart({ data }: { data: VentaMes[] }) {
  const maxMonto = Math.max(...data.map((d) => d.monto), 1);
  const niceMax = Math.ceil(maxMonto / 50000) * 50000 || 50000;
  const W = 400, H = 200;
  const padL = 65, padR = 15, padT = 10, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const yTicks = [0, 1, 2, 3, 4].map((i) => Math.round((niceMax / 4) * i));

  const pts = data.map((d, i) => ({
    x: padL + (data.length > 1 ? (i / (data.length - 1)) : 0) * chartW,
    y: padT + chartH - (d.monto / niceMax) * chartH,
    mes: d.mes,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = pts.length > 0
    ? `${linePath} L ${pts[pts.length - 1].x} ${padT + chartH} L ${pts[0].x} ${padT + chartH} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {yTicks.map((tick) => {
        const y = padT + chartH - (tick / niceMax) * chartH;
        return (
          <g key={tick}>
            <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,3" />
            <text x={padL - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="sans-serif">
              {tick === 0 ? "0" : `$${(tick / 1000).toFixed(0)}k`}
            </text>
          </g>
        );
      })}
      {areaPath && <path d={areaPath} fill="#3b82f6" opacity="0.07" />}
      {pts.length > 1 && (
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {pts.map((p) => (
        <circle key={p.mes} cx={p.x} cy={p.y} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
      ))}
      {pts.map((p) => (
        <text key={p.mes} x={p.x} y={H - padB + 16} textAnchor="middle" fontSize="10" fill="#9ca3af" fontFamily="sans-serif">
          {p.mes}
        </text>
      ))}
      <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="#d1d5db" strokeWidth="1" />
      <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#d1d5db" strokeWidth="1" />
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ title, value, icon, accent, delta }: {
  title: string; value: string; icon: string; accent: string; delta: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
        <span className={`text-base ${accent} p-1.5 rounded-lg`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{delta}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Home() {
  useDarkMode();

  const [kpi, setKpi] = useState<DashboardKpi>({
    ventasSemana: 0, ventasMes: 0, pedidosPendientes: 0, productosEnAlerta: 0,
  });
  const [ventasSemanas, setVentasSemanas] = useState<{ label: string; monto: number }[]>([]);
  const [ventasMeses, setVentasMeses] = useState<VentaMes[]>([]);
  const [topProductos, setTopProductos] = useState<TopProducto[]>([]);
  const [productosAlerta, setProductosAlerta] = useState<ProductoAlerta[]>([]);
  const [catalogoProductos, setCatalogoProductos] = useState<CatalogoProducto[]>([]);
  const [loading, setLoading] = useState(true);

  const [qrProductIdx, setQrProductIdx] = useState(0);
  const [qrPrinterIdx, setQrPrinterIdx] = useState(0);
  const [qrMsg, setQrMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [dashData, productosData] = await Promise.all([
          api.getDashboard() as Promise<any>,
          api.getProductosCatalogo(50) as Promise<any>,
        ]);

        setKpi(dashData.kpi);

        // Weekly chart — use semana_label as x-axis label
        setVentasSemanas(
          (dashData.ventasSemanas as any[]).map((v) => ({
            label: String(v.semana_label ?? `S${v.semana_num}`),
            monto: Number(v.monto),
          }))
        );

        // Monthly chart — fill in last 6 months, zeros for missing
        const last6 = getLast6Months();
        const mesMap = new Map<string, number>(
          (dashData.ventasMeses as any[]).map((v) => [
            `${v.anio_real}-${String(v.mes_num).padStart(2, "0")}`,
            Number(v.monto),
          ])
        );
        setVentasMeses(last6.map(({ key, mes }) => ({ mes, monto: mesMap.get(key) ?? 0 })));

        setTopProductos(
          (dashData.topProductos as any[]).map((p) => ({
            nombre: p.nombre as string,
            unidades: Number(p.unidades),
          }))
        );

        setProductosAlerta(
          (dashData.productosAlerta as any[]).map((p) => ({
            nombre: p.nombre as string,
            diasCobertura: Number(p.diasCobertura),
            semaforo: p.semaforo as "CRITICO" | "ALERTA",
          }))
        );

        const items: any[] = productosData.items ?? [];
        setCatalogoProductos(
          items.map((p) => ({
            id: String(p.id),
            nombre: p.name as string,
            codigo: p.sku as string,
            precio: fmt(Number(p.price)),
          }))
        );
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handlePrintQR = () => {
    if (catalogoProductos.length === 0) return;
    const prod = catalogoProductos[qrProductIdx];
    setQrMsg(`Enviando QR de "${prod.nombre}" a ${impresoras[qrPrinterIdx]}…`);
    setTimeout(() => setQrMsg(`✓ QR enviado correctamente a ${impresoras[qrPrinterIdx]}.`), 1500);
  };

  const currentQrProduct = catalogoProductos[qrProductIdx];

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen overflow-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <h1 className="text-3xl font-bold tracking-wide text-gray-900 dark:text-white">Inicio</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Resumen general — {currentMonthLabel()}
        </p>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            title="Ventas semana"
            value={loading ? "—" : fmtImporte(kpi.ventasSemana)}
            icon="💰"
            accent="text-blue-500 bg-blue-50 dark:bg-blue-900/20"
            delta="Semana más reciente (HD)"
          />
          <KpiCard
            title="Ventas del mes"
            value={loading ? "—" : fmtImporte(kpi.ventasMes)}
            icon="📈"
            accent="text-green-500 bg-green-50 dark:bg-green-900/20"
            delta={`${currentMonthLabel()} (HD)`}
          />
          <KpiCard
            title="Pedidos pendientes"
            value={loading ? "—" : String(kpi.pedidosPendientes)}
            icon="📦"
            accent="text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
            delta="Sin fecha de llegada"
          />
          <KpiCard
            title="Productos en alerta"
            value={loading ? "—" : String(kpi.productosEnAlerta)}
            icon="⚠️"
            accent="text-red-500 bg-red-50 dark:bg-red-900/20"
            delta="Crítico o alerta de cobertura"
          />
        </div>

        {/* ── Charts ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Ventas por semana (últimas 7 semanas)
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Home Depot — importe MXN</p>
            <div className="h-44">
              {loading ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">Cargando…</div>
              ) : (
                <BarChart data={ventasSemanas} />
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Ventas mensuales (últimos 6 meses)
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Home Depot — importe MXN</p>
            <div className="h-44">
              {loading ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">Cargando…</div>
              ) : (
                <LineChart data={ventasMeses} />
              )}
            </div>
          </div>
        </div>

        {/* ── Top productos & Alertas ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Top 5 productos más vendidos
            </h2>
            {loading ? (
              <div className="text-xs text-gray-400">Cargando…</div>
            ) : topProductos.length === 0 ? (
              <div className="text-xs text-gray-400">Sin ventas registradas este año</div>
            ) : (
              <div className="space-y-3">
                {topProductos.map((p, i) => {
                  const pct = (p.unidades / topProductos[0].unidades) * 100;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400 truncate max-w-[220px]">{p.nombre}</span>
                        <span className="text-gray-700 dark:text-gray-300 font-medium ml-2 shrink-0">
                          {p.unidades.toLocaleString()} uds
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Productos en alerta de cobertura
            </h2>
            {loading ? (
              <div className="text-xs text-gray-400">Cargando…</div>
            ) : productosAlerta.length === 0 ? (
              <div className="text-xs text-gray-400">No hay productos en alerta</div>
            ) : (
              <div className="space-y-3">
                {productosAlerta.map((item, i) => {
                  const umbral = item.semaforo === "CRITICO" ? 60 : 80;
                  const pct = Math.min(Math.round((item.diasCobertura / umbral) * 100), 100);
                  const color = item.semaforo === "CRITICO" ? "bg-red-400" : "bg-yellow-400";
                  const textColor = item.semaforo === "CRITICO" ? "text-red-500" : "text-yellow-500";
                  const badge = item.semaforo === "CRITICO"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{item.nombre}</p>
                          <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${badge}`}>
                            {item.semaforo === "CRITICO" ? "Crítico" : "Alerta"}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                          <div className={`h-1.5 ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className={`text-right shrink-0 text-xs font-semibold ${textColor}`}>
                        {item.diasCobertura}d
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Impresión QR ────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 max-w-lg">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Imprimir código QR de producto
          </h2>

          {loading || catalogoProductos.length === 0 ? (
            <div className="text-xs text-gray-400">
              {loading ? "Cargando productos…" : "No hay productos disponibles"}
            </div>
          ) : (
            <div className="flex gap-4 items-start">
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white shrink-0">
                <FakeQR size={118} />
                <p className="text-center text-[9px] text-gray-400 mt-1 font-mono">
                  {currentQrProduct?.codigo}
                </p>
              </div>

              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Producto</label>
                  <select
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={qrProductIdx}
                    onChange={(e) => { setQrProductIdx(Number(e.target.value)); setQrMsg(""); }}
                  >
                    {catalogoProductos.map((p, i) => (
                      <option key={p.id} value={i}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Impresora</label>
                  <select
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={qrPrinterIdx}
                    onChange={(e) => { setQrPrinterIdx(Number(e.target.value)); setQrMsg(""); }}
                  >
                    {impresoras.map((imp, i) => <option key={i} value={i}>{imp}</option>)}
                  </select>
                </div>

                <button
                  onClick={handlePrintQR}
                  className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Imprimir QR
                </button>

                {qrMsg && (
                  <p className={`text-xs ${qrMsg.startsWith("✓") ? "text-green-500" : "text-blue-500"}`}>
                    {qrMsg}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
