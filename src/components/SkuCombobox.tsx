// Searchable SKU/model dropdown input, rendered via portal so it isn't
// clipped by scrollable ancestors.
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface SkuOption {
  sku: string;
  name: string;
}

export function SkuCombobox({
  value,
  onChange,
  options,
  loading,
  invalid,
}: {
  value: string;
  onChange: (sku: string) => void;
  options: SkuOption[];
  loading: boolean;
  invalid: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateRect = () => {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
  };

  useEffect(() => {
    if (!open) return;
    updateRect();
    const onScrollOrResize = () => updateRect();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  const q = value.trim().toLowerCase();
  const filtered = (
    q
      ? options.filter(
          (o) => o.sku.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)
        )
      : options
  ).slice(0, 50);

  const menuWidth = rect
    ? Math.min(Math.max(rect.width, 360), window.innerWidth - 24)
    : undefined;

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={loading ? "Cargando MODs…" : "Buscar modelo / MOD…"}
        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
          invalid
            ? "border-red-500 dark:border-red-500"
            : "border-gray-300 dark:border-gray-600"
        }`}
      />
      {open &&
        rect &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, width: menuWidth }}
            className="z-[60]"
          >
            {filtered.length > 0 ? (
              <ul className="max-h-80 overflow-auto rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-2xl">
                {filtered.map((o) => (
                  <li key={o.sku}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onChange(o.sku);
                        setOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex flex-col gap-0.5"
                    >
                      <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                        {o.sku}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {o.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : !loading && q ? (
              <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-2xl px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                Sin coincidencias
              </div>
            ) : null}
          </div>,
          document.body
        )}
    </div>
  );
}
