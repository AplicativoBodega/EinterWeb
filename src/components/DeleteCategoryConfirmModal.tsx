import { useState } from "react";

interface DeleteConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
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
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <span className="text-gray-500 dark:text-gray-400 text-xl">✕</span>
          </button>
        </div>

        <div className="px-6 py-4">
          <p className="text-gray-700 dark:text-gray-300">{message}</p>
        </div>

        <div className="flex flex-row items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span className="text-gray-700 dark:text-gray-300 font-robotoMedium">
              Cancelar
            </span>
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-red-600 disabled:opacity-50 hover:bg-red-700"
          >
            <span className="text-white font-robotoMedium">
              {loading ? "Eliminando..." : "Eliminar"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
