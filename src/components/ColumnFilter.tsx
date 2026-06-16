import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type SortDir = "asc" | "desc" | null;

interface ColumnFilterProps {
  label: string;
  /** Distinct values available for this column (display strings). */
  options: string[];
  /** Currently selected values. Empty array = no filter (all values shown). */
  selected: string[];
  onChange: (next: string[]) => void;
  /** Current sort direction for this column, or null if not the active sort. */
  sortDir?: SortDir;
  onSort?: (dir: "asc" | "desc") => void;
  align?: "left" | "center";
  /** Tailwind text size class for the header label (defaults to text-sm). */
  textClass?: string;
}

/**
 * Excel-style column header with an auto-filter dropdown:
 * sort asc/desc + searchable multi-select checklist of distinct values.
 *
 * The dropdown is rendered with fixed positioning anchored to the header
 * button so it is never clipped by the table card's `overflow-hidden`.
 */
export function ColumnFilter({
  label,
  options,
  selected,
  onChange,
  sortDir = null,
  onSort,
  align = "center",
  textClass = "text-sm",
}: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const active = selected.length > 0;

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const width = 256;
    let left = r.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    setPos({ top: r.bottom + 4, left: Math.max(8, left) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        popRef.current?.contains(e.target as Node) ||
        btnRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const visibleOptions = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const allVisibleSelected =
    visibleOptions.length > 0 &&
    visibleOptions.every((o) => selected.includes(o));

  const toggleValue = (value: string) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      onChange(selected.filter((v) => !visibleOptions.includes(v)));
    } else {
      const set = new Set(selected);
      visibleOptions.forEach((o) => set.add(o));
      onChange([...set]);
    }
  };

  return (
    <div
      className={`w-full h-full flex items-center ${
        align === "left" ? "justify-start" : "justify-center"
      } gap-1`}
    >
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors max-w-full"
        title="Filtrar / ordenar"
      >
        <span
          className={`font-robotoMedium text-gray-900 dark:text-white ${textClass} truncate`}
        >
          {label}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : ""}
        </span>
        <span
          className={`text-xs ${
            active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          ref={popRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: 256 }}
          className="z-[60] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl text-left"
        >
          {onSort && (
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  onSort("asc");
                  setOpen(false);
                }}
                className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ▲ Ordenar A→Z
              </button>
              <button
                onClick={() => {
                  onSort("desc");
                  setOpen(false);
                }}
                className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-l border-gray-200 dark:border-gray-700"
              >
                ▼ Ordenar Z→A
              </button>
            </div>
          )}

          <div className="p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-2 py-1.5 mb-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <label className="flex items-center gap-2 px-1 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
                className="accent-blue-600"
              />
              (Seleccionar todo)
            </label>

            <div className="max-h-56 overflow-y-auto mt-1">
              {visibleOptions.length === 0 ? (
                <p className="text-xs text-gray-400 px-1 py-2">Sin valores</p>
              ) : (
                visibleOptions.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 px-1 py-1 text-xs text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(opt)}
                      onChange={() => toggleValue(opt)}
                      className="accent-blue-600"
                    />
                    <span className="truncate" title={opt}>
                      {opt || "(vacío)"}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-2 py-1.5">
            <button
              onClick={() => onChange([])}
              className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-40"
              disabled={!active}
            >
              Limpiar
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Distinct, sorted display values for a column across a row set.
 */
export function distinctValues<T>(rows: T[], accessor: (row: T) => string): string[] {
  const set = new Set<string>();
  for (const r of rows) set.add(accessor(r));
  return [...set].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}
