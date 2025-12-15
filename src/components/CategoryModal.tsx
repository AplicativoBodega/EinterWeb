import { useState, useEffect } from "react";

interface CategoryModalProps {
  visible: boolean;
  category: { id: number; name: string } | null;
  onClose: () => void;
  onSave: (category: { id?: number; name: string }) => Promise<void>;
  mode: "create" | "edit";
}

export function CategoryModal({
  visible,
  category,
  onClose,
  onSave,
  mode,
}: CategoryModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category && mode === "edit") {
      setName(category.name);
    } else {
      setName("");
    }
    setError(null);
  }, [category, mode, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave({
        ...(mode === "edit" && category ? { id: category.id } : {}),
        name,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
        <div className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-robotoMedium text-gray-800 dark:text-white">
            {mode === "create" ? "Crear Categoría" : "Editar Categoría"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <span className="text-gray-500 dark:text-gray-400 text-xl">✕</span>
          </button>
        </div>

        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
              <p className="text-red-700 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="text-sm font-robotoMedium text-gray-700 dark:text-gray-300 mb-2 block">
              Nombre de Categoría
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la categoría"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex flex-row items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span className="text-gray-700 dark:text-gray-300 font-robotoMedium">
              Cancelar
            </span>
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-blue-600 disabled:opacity-50 hover:bg-blue-700"
          >
            <span className="text-white font-robotoMedium">
              {loading ? "Guardando..." : mode === "create" ? "Crear" : "Guardar"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
