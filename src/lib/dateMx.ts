// Utilidades de fecha centralizadas en la zona horaria de Monterrey.
// Úsalas en vez de new Date().toISOString() para evitar desfases por la
// zona horaria del navegador del usuario.
export const MX_TIME_ZONE = "America/Monterrey";

function getMonterreyParts(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MX_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Fecha actual en Monterrey como string "YYYY-MM-DD". */
export function getMonterreyDateISO(date: Date = new Date()): string {
  const { year, month, day } = getMonterreyParts(date);
  return `${year}-${month}-${day}`;
}

/** Año actual en Monterrey. */
export function getMonterreyYear(date: Date = new Date()): number {
  return Number(getMonterreyParts(date).year);
}

/** Mes actual en Monterrey (1-12). */
export function getMonterreyMonth(date: Date = new Date()): number {
  return Number(getMonterreyParts(date).month);
}

export function getMonterreyNow(): Date {
  const { year, month, day } = getMonterreyParts(new Date());
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}
