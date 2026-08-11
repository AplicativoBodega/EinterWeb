// Motor de cubicaje: FFD para anchors, greedy knapsack para relleno,
// scoring, recomendador de contenedor, top-off y recorte (Escenario A).
// ─── Constantes ───────────────────────────────────────────────────────────────

export const CONTAINER_SPECS = {
  '20ft': { maxWeightKg: 21_700, maxVolM3: 33.0 },
  '40ft': { maxWeightKg: 26_500, maxVolM3: 67.0 },
  '40HC': { maxWeightKg: 26_500, maxVolM3: 76.0 },
} as const;

export type ContainerName = keyof typeof CONTAINER_SPECS;

const WINDOW_WEIGHT_MIN = 0.50;
const WINDOW_WEIGHT_MAX = 0.95;
const WINDOW_VOL_MIN  = 0.75;
const WINDOW_VOL_MAX  = 0.90;
const MIN_PIECES_SKU_FILL = 1_000;
const MIN_PIECES_TOP_OFF     = 500;
const LEAD_TIME_DAYS          = 60;
const TARGET_COVERAGE_DAYS = 150;
const OVERSTOCK_THRESHOLD = 300;
const RED_ALERT       = 60;
const YELLOW_ALERT   = 80;

// ─── Tipos básicos ────────────────────────────────────────────────────────────

export interface ContainerType {
  name: ContainerName;
  maxWeightKg: number;
  maxVolM3:  number;
}

export function getContainerType(name: ContainerName): ContainerType {
  const s = CONTAINER_SPECS[name];
  return { name, maxWeightKg: s.maxWeightKg, maxVolM3: s.maxVolM3 };
}

export const ALL_CONTAINER_TYPES: ContainerType[] = (
  ['20ft', '40ft', '40HC'] as ContainerName[]
).map(getContainerType);

export interface Assignment {
  sku:      number;
  boxes:    number;
  boxWeightKg: number; // kg/caja
  boxVolM3:  number; // m³/caja
  piecesPerBox:  number;
  role:     'anchor' | 'relleno';
  description:     string;
}

export interface BinState {
  containerType: ContainerType;
  assignments:   Assignment[];
}

export interface Anchor {
  sku:             number;
  boxes:           number;
  boxWeightKg:        number;
  boxVolM3:         number;
  piecesPerBox:         number;
  description:            string;
  maxFallbackBoxes?: number; // para top-off fallback
}

export interface FillCandidate {
  sku:      number;
  dailyDemand:       number; // demanda piezas/día
  coverageDays:  number;
  status:   string; // CRITICO | ALERTA | OK | SOBRESTOCK
  boxWeightKg: number;
  boxVolM3:  number;
  piecesPerBox:  number;
  maxBoxes: number;
  description:     string;
}

export type FillStatus = 'CRITICO' | 'ALERTA' | 'OK' | 'SOBRESTOCK';

// ─── Semáforo ─────────────────────────────────────────────────────────────────

export function classifyStatus(coverageDays: number): FillStatus {
  if (coverageDays > OVERSTOCK_THRESHOLD) return 'SOBRESTOCK';
  if (coverageDays < RED_ALERT)       return 'CRITICO';
  if (coverageDays < YELLOW_ALERT)   return 'ALERTA';
  return 'OK';
}

export function calculateMaxFillBoxes(
  effectiveInventory: number,
  dailyDemand:          number,
  piecesPerBox:     number,
): number {
  if (piecesPerBox <= 0 || dailyDemand <= 0) return 0;
  const inventoryAtReceipt  = Math.max(0, effectiveInventory - dailyDemand * LEAD_TIME_DAYS);
  const piecesNeeded = Math.max(0, dailyDemand * TARGET_COVERAGE_DAYS - inventoryAtReceipt);
  return Math.floor(piecesNeeded / piecesPerBox);
}

// ─── Helpers de Bin ───────────────────────────────────────────────────────────

function loadedWeight(b: BinState): number {
  return b.assignments.reduce((s, a) => s + a.boxes * a.boxWeightKg, 0);
}
function loadedVol(b: BinState): number {
  return b.assignments.reduce((s, a) => s + a.boxes * a.boxVolM3, 0);
}
function weightPct(b: BinState): number {
  return 100 * loadedWeight(b) / b.containerType.maxWeightKg;
}
function volPct(b: BinState): number {
  return 100 * loadedVol(b) / b.containerType.maxVolM3;
}
function physicalWeightSpace(b: BinState): number {
  return b.containerType.maxWeightKg - loadedWeight(b);
}
function physicalVolSpace(b: BinState): number {
  return b.containerType.maxVolM3 - loadedVol(b);
}
function windowWeightSpace(b: BinState): number {
  return Math.max(0, b.containerType.maxWeightKg * WINDOW_WEIGHT_MAX - loadedWeight(b));
}
function windowVolSpace(b: BinState): number {
  return Math.max(0, b.containerType.maxVolM3 * WINDOW_VOL_MAX - loadedVol(b));
}
function fitsPhysically(b: BinState, peso: number, vol: number): boolean {
  return (
    loadedWeight(b) + peso <= b.containerType.maxWeightKg + 1e-6 &&
    loadedVol(b)  + vol  <= b.containerType.maxVolM3  + 1e-6
  );
}
function isInWindow(b: BinState): boolean {
  const p = loadedWeight(b);
  const v = loadedVol(b);
  const c = b.containerType;
  if (p < c.maxWeightKg * WINDOW_WEIGHT_MIN - 1e-6) return false;
  if (v < c.maxVolM3  * WINDOW_VOL_MIN  - 1e-6) return false;
  if (p > c.maxWeightKg + 1e-6) return false;
  if (v > c.maxVolM3  + 1e-6) return false;
  return true;
}
function gapPctOutsideWindow(b: BinState): number {
  const gapP = Math.max(0, WINDOW_WEIGHT_MIN * 100 - weightPct(b));
  const gapV = Math.max(0, WINDOW_VOL_MIN  * 100 - volPct(b));
  return Math.max(gapP, gapV);
}
function pctImbalance(b: BinState): number {
  return Math.abs(weightPct(b) - volPct(b));
}
function isOptimalByAnchors(b: BinState): boolean {
  const c = b.containerType;
  const p = loadedWeight(b);
  const v = loadedVol(b);
  const excedeOp = p > c.maxWeightKg * WINDOW_WEIGHT_MAX + 1e-6 || v > c.maxVolM3 * WINDOW_VOL_MAX + 1e-6;
  const dentroFisico = p <= c.maxWeightKg + 1e-6 && v <= c.maxVolM3 + 1e-6;
  return excedeOp && dentroFisico;
}

function addAssignment(b: BinState, a: Assignment): void {
  const existing = b.assignments.find(e => e.sku === a.sku && e.role === a.role);
  if (existing) { existing.boxes += a.boxes; }
  else          { b.assignments.push({ ...a }); }
}

function copyBin(b: BinState): BinState {
  return { containerType: b.containerType, assignments: b.assignments.map(a => ({ ...a })) };
}

export function getBinStats(b: BinState) {
  return {
    loadedWeight:  loadedWeight(b),
    loadedVol:   loadedVol(b),
    weightPct:      weightPct(b),
    volPct:       volPct(b),
    inWindow:    isInWindow(b),
    gapPct:        gapPctOutsideWindow(b),
    optimal:       isOptimalByAnchors(b),
    degraded:     !isInWindow(b) && gapPctOutsideWindow(b) <= 5.0,
  };
}

// ─── FFD ──────────────────────────────────────────────────────────────────────

function anchorFootprint(a: Anchor): number {
  return (a.boxes * a.boxWeightKg / 26_500) + (a.boxes * a.boxVolM3 / 76);
}

export function calculateMinContainers(anchors: Anchor[], ctype: ContainerType): number {
  const totalWeight = anchors.reduce((s, a) => s + a.boxes * a.boxWeightKg, 0);
  const totalVol  = anchors.reduce((s, a) => s + a.boxes * a.boxVolM3,  0);
  const byWeight  = totalWeight > 0 ? Math.ceil(totalWeight / ctype.maxWeightKg) : 0;
  const byVol   = totalVol  > 0 ? Math.ceil(totalVol  / ctype.maxVolM3)  : 0;
  return Math.max(1, byWeight, byVol);
}

function distributeFFD(
  anchors: Anchor[],
  ctype:  ContainerType,
  nBins:  number,
): { bins: BinState[]; fragmentCount: number } {
  const bins: BinState[] = Array.from({ length: nBins }, () => ({
    containerType: ctype,
    assignments:   [],
  }));
  let fragmentCount = 0;

  const sorted = [...anchors].sort((a, b) => anchorFootprint(b) - anchorFootprint(a));

  for (const a of sorted) {
    const pesoTotal = a.boxes * a.boxWeightKg;
    const volTotal  = a.boxes * a.boxVolM3;

    // Intento 1: colocar completa en best bin
    let bestBin: BinState | null = null;
    let bestSpace = -Infinity;
    for (const b of bins) {
      if (fitsPhysically(b, pesoTotal, volTotal)) {
        const freeAfter =
          (b.containerType.maxWeightKg - loadedWeight(b) - pesoTotal) / b.containerType.maxWeightKg +
          (b.containerType.maxVolM3  - loadedVol(b)  - volTotal)  / b.containerType.maxVolM3;
        if (freeAfter > bestSpace) { bestSpace = freeAfter; bestBin = b; }
      }
    }
    if (bestBin) {
      addAssignment(bestBin, { sku: a.sku, boxes: a.boxes, boxWeightKg: a.boxWeightKg, boxVolM3: a.boxVolM3, piecesPerBox: a.piecesPerBox, role: 'anchor', description: a.description });
      continue;
    }

    // Intento 2: fragmentar caja por caja
    let pendingBoxes = a.boxes;
    while (pendingBoxes > 0) {
      let targetBin: BinState | null = null;
      let maxBoxesFit = 0;
      for (const b of bins) {
        const espP = physicalWeightSpace(b);
        const espV = physicalVolSpace(b);
        const cP = a.boxWeightKg > 0 ? Math.floor(espP / a.boxWeightKg) : pendingBoxes;
        const cV = a.boxVolM3  > 0 ? Math.floor(espV / a.boxVolM3)  : pendingBoxes;
        const caben = Math.min(cP, cV, pendingBoxes);
        if (caben > maxBoxesFit) { maxBoxesFit = caben; targetBin = b; }
      }
      if (!targetBin || maxBoxesFit === 0) {
        throw new Error(`No se puede distribuir SKU ${a.sku}: faltan ${pendingBoxes} cajas`);
      }
      addAssignment(targetBin, { sku: a.sku, boxes: maxBoxesFit, boxWeightKg: a.boxWeightKg, boxVolM3: a.boxVolM3, piecesPerBox: a.piecesPerBox, role: 'anchor', description: a.description });
      pendingBoxes -= maxBoxesFit;
    }
    const binsWithSku = bins.filter(b => b.assignments.some(ag => ag.sku === a.sku)).length;
    if (binsWithSku > 1) fragmentCount += binsWithSku - 1;
  }

  return { bins, fragmentCount };
}

// ─── Scoring SKU candidato ────────────────────────────────────────────────────

const STATUS_FACTOR: Record<string, number> = {
  CRITICO: 3.0, ALERTA: 2.0, OK: 1.0, SOBRESTOCK: 0.0,
};

function scoreCandidateSku(
  c: FillCandidate,
  weightSpace: number,
  volSpace:  number,
): number {
  if (c.status === 'SOBRESTOCK') return 0;
  const urgency   = c.dailyDemand / Math.max(c.coverageDays, 1);
  const statusUrgency = STATUS_FACTOR[c.status] ?? 1.0;
  const skuDensity = c.boxVolM3 > 0 ? c.boxWeightKg / c.boxVolM3 : 0;
  const gapDensity = volSpace    > 0 ? weightSpace    / volSpace    : 0;
  let densityFactor = 0;
  if (skuDensity > 0 && gapDensity > 0) {
    densityFactor = Math.exp(-Math.abs(Math.log(skuDensity / gapDensity)) * 1.5);
  }
  return urgency * densityFactor * statusUrgency + c.dailyDemand * 0.001;
}

// ─── Greedy Knapsack ──────────────────────────────────────────────────────────

function minFillBoxes(piecesPerBox: number): number {
  return piecesPerBox <= 0 ? 1 : Math.ceil(MIN_PIECES_SKU_FILL / piecesPerBox);
}

function fillBinGreedy(
  bin:            BinState,
  candidates:     FillCandidate[],
  excludedSkus:  Set<number>,
): void {
  const eligible = candidates.filter(c => {
    if (excludedSkus.has(c.sku)) return false;
    if (c.status === 'SOBRESTOCK') return false;
    if (c.maxBoxes <= 0) return false;
    const cmin = minFillBoxes(c.piecesPerBox);
    if (cmin > c.maxBoxes) return false;
    const espP = windowWeightSpace(bin);
    const espV = windowVolSpace(bin);
    if (cmin * c.boxWeightKg > espP + 1e-6) return false;
    if (cmin * c.boxVolM3  > espV + 1e-6) return false;
    return true;
  });

  const scored = eligible
    .map(c => ({ c, score: scoreCandidateSku(c, windowWeightSpace(bin), windowVolSpace(bin)) }))
    .sort((a, b) => b.score - a.score);

  for (const { c } of scored) {
    const espP = windowWeightSpace(bin);
    const espV = windowVolSpace(bin);
    if (espP <= 0 || espV <= 0) break;

    const cmin = minFillBoxes(c.piecesPerBox);
    const cP   = c.boxWeightKg > 0 ? Math.floor(espP / c.boxWeightKg) : c.maxBoxes;
    const cV   = c.boxVolM3  > 0 ? Math.floor(espV / c.boxVolM3)  : c.maxBoxes;
    const boxes = Math.min(c.maxBoxes, cP, cV);
    if (boxes < cmin) continue;

    addAssignment(bin, { sku: c.sku, boxes, boxWeightKg: c.boxWeightKg, boxVolM3: c.boxVolM3, piecesPerBox: c.piecesPerBox, role: 'relleno', description: c.description });
  }
}

// ─── Scoring de configuración ─────────────────────────────────────────────────

const SCORE_FULL_VALIDITY   = 100_000;
const SCORE_DEGRADED       =  50_000;
const SCORE_INVALID_BIN_PENALTY =  -5_000;
const SCORE_UTIL_PER_PCT    =      50;
const SCORE_PER_CONTAINER  =    -500;
const SCORE_PER_FRAGMENT   =     -50;
const SCORE_IMBALANCE_PCT   =     -10;

export interface PackingConfig {
  bins:         BinState[];
  score:        number;
  fragmentCount:  number;
  valid:        boolean;
  degraded:     boolean;
}

function scoreConfig(config: PackingConfig): { score: number; breakdown: Record<string, number> } {
  const { bins, fragmentCount } = config;
  const valid  = bins.every(isInWindow);
  const maxGap = bins.length > 0 ? Math.max(...bins.map(gapPctOutsideWindow)) : 0;

  let validityScore: number;
  if (valid)          validityScore = SCORE_FULL_VALIDITY;
  else if (maxGap <= 5.0) validityScore = SCORE_DEGRADED;
  else validityScore = SCORE_INVALID_BIN_PENALTY * bins.filter(b => !isInWindow(b)).length;

  const utilizationScore  = (
    bins.reduce((s, b) => s + weightPct(b), 0) / (bins.length || 1) +
    bins.reduce((s, b) => s + volPct(b),  0) / (bins.length || 1)
  ) * SCORE_UTIL_PER_PCT;
  const containerCountScore  = bins.length * SCORE_PER_CONTAINER;
  const fragmentScore   = fragmentCount * SCORE_PER_FRAGMENT;
  const imbalanceScore = (bins.length > 0 ? Math.max(...bins.map(pctImbalance)) : 0) * SCORE_IMBALANCE_PCT;
  const total   = validityScore + utilizationScore + containerCountScore + fragmentScore + imbalanceScore;

  return {
    score: total,
    breakdown: { S_validez: validityScore, S_aprov: +utilizationScore.toFixed(1), S_nbins: containerCountScore, S_frag: fragmentScore, S_desbal: +imbalanceScore.toFixed(1), TOTAL: +total.toFixed(1) },
  };
}

// ─── Motor principal ──────────────────────────────────────────────────────────

function buildConfig(
  anchors:     Anchor[],
  candidates: FillCandidate[],
  ctype:      ContainerType,
  nBins:      number,
): PackingConfig {
  const { bins, fragmentCount } = distributeFFD(anchors, ctype, nBins);
  for (const b of bins) {
    const anchorSkus = new Set(b.assignments.filter(a => a.role === 'anchor').map(a => a.sku));
    fillBinGreedy(b, candidates, anchorSkus);
  }
  return { bins, score: 0, fragmentCount, valid: false, degraded: false };
}

export interface PackingResult {
  config:         PackingConfig;
  scoreBreakdown: Record<string, number>;
  nMin:           number;
  exceedsNMax:     boolean;
}

export function resolveOrder(
  anchors:     Anchor[],
  candidates: FillCandidate[],
  ctype:      ContainerType,
  nMax:       number | null,
): PackingResult {
  const nMin = calculateMinContainers(anchors, ctype);

  if (nMax !== null && nMin > nMax) {
    return { config: { bins: [], score: -Infinity, fragmentCount: 0, valid: false, degraded: false }, scoreBreakdown: {}, nMin, exceedsNMax: true };
  }

  const maxRange = nMax !== null ? Math.min(nMin + 2, nMax) : nMin + 2;
  let best:          PackingConfig | null = null;
  let bestScore      = -Infinity;
  let bestBreakdown: Record<string, number> = {};

  for (let n = nMin; n <= maxRange; n++) {
    try {
      const cfg = buildConfig(anchors, candidates, ctype, n);
      const { score, breakdown } = scoreConfig(cfg);
      cfg.score    = score;
      cfg.valid    = cfg.bins.every(isInWindow);
      cfg.degraded = !cfg.valid && (cfg.bins.length > 0 ? Math.max(...cfg.bins.map(gapPctOutsideWindow)) : 0) <= 5.0;
      if (score > bestScore) { bestScore = score; best = cfg; bestBreakdown = breakdown; }
    } catch { /* skip n si FFD falla */ }
  }

  if (!best) best = { bins: [], score: -Infinity, fragmentCount: 0, valid: false, degraded: false };
  return { config: best, scoreBreakdown: bestBreakdown, nMin, exceedsNMax: false };
}

// ─── Recomendador de tipo ─────────────────────────────────────────────────────

export interface TypeEvaluation {
  ctype:    ContainerType;
  score:    number;
  nBins:    number;
  allValid: boolean;
  weightPct:  number;
  volPct:   number;
  degraded: boolean;
  breakdown: Record<string, number>;
}

export function recommendType(
  anchors:     Anchor[],
  candidates: FillCandidate[],
): { recommended: ContainerType | null; evaluations: TypeEvaluation[] } {
  const evaluations: TypeEvaluation[] = [];

  for (const ctype of ALL_CONTAINER_TYPES) {
    try {
      const result = resolveOrder(anchors, candidates, ctype, null);
      if (result.config.bins.length === 0) continue;
      const bins = result.config.bins;
      evaluations.push({
        ctype,
        score:    result.config.score,
        nBins:    bins.length,
        allValid: bins.every(isInWindow),
        weightPct:  bins.reduce((s, b) => s + weightPct(b), 0) / bins.length,
        volPct:   bins.reduce((s, b) => s + volPct(b),  0) / bins.length,
        degraded: result.config.degraded,
        breakdown: result.scoreBreakdown,
      });
    } catch { /* skip */ }
  }

  evaluations.sort((a, b) => {
    if (a.allValid !== b.allValid) return b.allValid ? 1 : -1;
    return b.score - a.score;
  });

  return { recommended: evaluations[0]?.ctype ?? null, evaluations };
}

// ─── Top-off ──────────────────────────────────────────────────────────────────

export interface SkuSuggestion {
  sku:    number;
  description:   string;
  boxes:  number;
  source: 'complemento' | 'fallback';
  boxWeightKg: number;
  boxVolM3:  number;
  piecesPerBox:  number;
}

export interface TopOffSuggestion {
  binIdx:         number;
  weightPctBefore:   number;
  volPctBefore:    number;
  weightPctAfter: number;
  volPctAfter:  number;
  suggestions:    SkuSuggestion[];
}

export function generateTopOff(
  bins:           BinState[],
  candidates:     FillCandidate[],
  userAnchors:  Anchor[],
): TopOffSuggestion[] {
  const result: TopOffSuggestion[] = [];

  for (let i = 0; i < bins.length; i++) {
    if (isInWindow(bins[i])) continue;

    const sim = copyBin(bins[i]);
    const weightPctBefore = weightPct(sim);
    const volPctBefore  = volPct(sim);
    const suggestions: SkuSuggestion[] = [];
    const skusInBin = new Set(sim.assignments.map(a => a.sku));

    // Pasada 1: complementos (no anchors)
    const comps = candidates.filter(c => {
      if (skusInBin.has(c.sku)) return false;
      if (c.status === 'SOBRESTOCK') return false;
      if (c.maxBoxes <= 0) return false;
      const cmin = Math.ceil(MIN_PIECES_TOP_OFF / c.piecesPerBox);
      if (cmin * c.boxWeightKg > physicalWeightSpace(sim) + 1e-6) return false;
      if (cmin * c.boxVolM3  > physicalVolSpace(sim)  + 1e-6) return false;
      return true;
    });

    const scored = comps
      .map(c => ({ c, score: scoreCandidateSku(c, physicalWeightSpace(sim), physicalVolSpace(sim)) }))
      .sort((a, b) => b.score - a.score);

    for (const { c } of scored) {
      if (isInWindow(sim)) break;
      const espP = physicalWeightSpace(sim);
      const espV = physicalVolSpace(sim);
      const cmin  = Math.ceil(MIN_PIECES_TOP_OFF / c.piecesPerBox);
      const boxes = Math.min(c.maxBoxes, Math.floor(espP / c.boxWeightKg), Math.floor(espV / c.boxVolM3));
      if (boxes < cmin) continue;
      addAssignment(sim, { sku: c.sku, boxes, boxWeightKg: c.boxWeightKg, boxVolM3: c.boxVolM3, piecesPerBox: c.piecesPerBox, role: 'relleno', description: c.description });
      suggestions.push({ sku: c.sku, description: c.description, boxes, source: 'complemento', boxWeightKg: c.boxWeightKg, boxVolM3: c.boxVolM3, piecesPerBox: c.piecesPerBox });
    }

    // Pasada 2: fallback a anchors del usuario
    if (!isInWindow(sim)) {
      for (const anchor of userAnchors) {
        if (!anchor.maxFallbackBoxes || anchor.maxFallbackBoxes <= 0) continue;
        const espP = physicalWeightSpace(sim);
        const espV = physicalVolSpace(sim);
        const boxes = Math.min(anchor.maxFallbackBoxes, Math.floor(espP / anchor.boxWeightKg), Math.floor(espV / anchor.boxVolM3));
        if (boxes <= 0) continue;
        addAssignment(sim, { sku: anchor.sku, boxes, boxWeightKg: anchor.boxWeightKg, boxVolM3: anchor.boxVolM3, piecesPerBox: anchor.piecesPerBox, role: 'relleno', description: anchor.description });
        suggestions.push({ sku: anchor.sku, description: anchor.description, boxes, source: 'fallback', boxWeightKg: anchor.boxWeightKg, boxVolM3: anchor.boxVolM3, piecesPerBox: anchor.piecesPerBox });
        if (isInWindow(sim)) break;
      }
    }

    if (suggestions.length > 0) {
      result.push({
        binIdx: i,
        weightPctBefore,
        volPctBefore,
        weightPctAfter: weightPct(sim),
        volPctAfter:  volPct(sim),
        suggestions,
      });
    }
  }

  return result;
}

export function applyTopOff(bins: BinState[], suggestions: TopOffSuggestion[]): void {
  for (const s of suggestions) {
    const b = bins[s.binIdx];
    for (const sk of s.suggestions) {
      addAssignment(b, { sku: sk.sku, boxes: sk.boxes, boxWeightKg: sk.boxWeightKg, boxVolM3: sk.boxVolM3, piecesPerBox: sk.piecesPerBox, role: 'relleno', description: sk.description });
    }
  }
}

// ─── Escenario A (greedy de recorte) ─────────────────────────────────────────

export interface AnchorWithContext {
  anchor:   Anchor;
  dailyDemand:      number;
  coverageDays: number;
  status:  string;
}

export interface Trim {
  sku:              number;
  description:             string;
  originalBoxes:  number;
  finalBoxes:     number;
  removedBoxes:   number;
  reason:            string;
}

export interface ScenarioAResult {
  adjustedAnchors: Anchor[];
  trims:       Trim[];
  feasible:       boolean;
  totalWeight:      number;
  totalVol:       number;
}

function anchorContextValue(ctx: AnchorWithContext): number {
  const urg = STATUS_FACTOR[ctx.status] ?? 0.5;
  const urgAdj = urg === 0 ? 0.5 : urg;
  const originalPieces = ctx.anchor.boxes * ctx.anchor.piecesPerBox;
  return urgAdj * Math.max(ctx.dailyDemand, 0.01) * Math.sqrt(originalPieces);
}

export function resolveScenarioA(
  anchorsCtx: AnchorWithContext[],
  ctype:     ContainerType,
  nMax:      number,
): ScenarioAResult {
  const maxWeight = nMax * ctype.maxWeightKg;
  const maxVol  = nMax * ctype.maxVolM3;

  const anchors = anchorsCtx.map(ctx => ({ ...ctx.anchor }));
  const trims: Trim[] = [];

  let totalWeight = anchors.reduce((s, a) => s + a.boxes * a.boxWeightKg, 0);
  let totalVol  = anchors.reduce((s, a) => s + a.boxes * a.boxVolM3,  0);

  if (totalWeight <= maxWeight && totalVol <= maxVol) {
    return { adjustedAnchors: anchors, trims: [], feasible: true, totalWeight, totalVol };
  }

  // Cortar los menos valiosos primero
  const orderedCtx = [...anchorsCtx].sort((a, b) => anchorContextValue(a) - anchorContextValue(b));

  for (const ctx of orderedCtx) {
    if (totalWeight <= maxWeight && totalVol <= maxVol) break;
    const anchor = anchors.find(a => a.sku === ctx.anchor.sku);
    if (!anchor || anchor.boxes <= 0) continue;

    const originalBoxes = anchor.boxes;
    const weightExcess = Math.max(0, totalWeight - maxWeight);
    const volExcess  = Math.max(0, totalVol  - maxVol);
    const boxesByWeight  = anchor.boxWeightKg > 0 ? Math.ceil(weightExcess / anchor.boxWeightKg) : 0;
    const boxesByVol   = anchor.boxVolM3  > 0 ? Math.ceil(volExcess  / anchor.boxVolM3)  : 0;
    const boxesToRemove = Math.min(anchor.boxes, Math.max(boxesByWeight, boxesByVol));
    if (boxesToRemove <= 0) continue;

    totalWeight  -= boxesToRemove * anchor.boxWeightKg;
    totalVol   -= boxesToRemove * anchor.boxVolM3;
    anchor.boxes -= boxesToRemove;

    trims.push({
      sku: anchor.sku,
      description: anchor.description,
      originalBoxes,
      finalBoxes:   anchor.boxes,
      removedBoxes: boxesToRemove,
      reason: anchor.boxes === 0 ? 'Ancla eliminada' : 'Ancla reducida',
    });
  }

  const adjustedAnchors = anchors.filter(a => a.boxes > 0);
  const feasible = totalWeight <= maxWeight + 1 && totalVol <= maxVol + 1;
  return { adjustedAnchors, trims, feasible, totalWeight, totalVol };
}
