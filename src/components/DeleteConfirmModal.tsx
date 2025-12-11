interface DeleteConfirmModalProps {
  visible: boolean;
  productName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function DeleteConfirmModal({
  visible,
  productName,
  onConfirm,
  onCancel,
  loading = false,
}: DeleteConfirmModalProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-robotoMedium text-gray-800">
            Confirmar Eliminación
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-gray-700 font-robotoRegular mb-2">
            ¿Estás seguro de que deseas eliminar este producto?
          </p>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-2">
            <p className="text-red-800 font-robotoMedium">
              {productName}
            </p>
          </div>
          <p className="text-gray-600 font-robotoRegular text-sm mt-3">
            Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-row items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50"
          >
            <span className="text-gray-700 font-robotoMedium">Cancelar</span>
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-red-600 disabled:opacity-50"
          >
            {loading ? (
              <span className="text-white font-robotoMedium">Eliminando...</span>
            ) : (
              <span className="text-white font-robotoMedium">Eliminar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}