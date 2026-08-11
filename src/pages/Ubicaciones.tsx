// Warehouse locations page: master-detail view plus a tarima barcode
// lookup tool.
import React, { useState } from "react";
import { useDarkMode } from "../context/DarkModeContext";
import { fetchAPI } from "../lib/fetch";
import { TarimaEtiquetaModal, type TarimaEtiquetaCarton } from "../components/TarimaEtiquetaModal";
import { FilaEtiquetaModal } from "../components/FilaEtiquetaModal";

type Product = {
  id: string;
  name: string;
  sku: string;
  existencia: number;
  children?: Product[];
};

type Ubicacion = {
  id: string;
  name: string;
  products: Product[];
};

const sampleData: Ubicacion[] = [
  {
    id: "b1",
    name: "Bodega 1",
    products: [
      {
        id: "m1",
        name: "Master QR 1",
        sku: "XXXX",
        existencia: 120,
        children: [
          { id: "s1", name: "Sub-QR 1", sku: "XXXX", existencia: 10 },
          { id: "s2", name: "Sub-QR 2", sku: "XXXX", existencia: 20 },
          { id: "s3", name: "Sub-QR 3", sku: "XXXX", existencia: 15 },
          { id: "s4", name: "Sub-QR 4", sku: "XXXX", existencia: 5 },
        ],
      },
      { id: "m2", name: "Master QR 2", sku: "XXXX", existencia: 80 },
      { id: "m3", name: "Master QR 3", sku: "XXXX", existencia: 60 },
      { id: "m4", name: "Master QR 4", sku: "XXXX", existencia: 40 },
    ],
  },
  { id: "b2", name: "Bodega 2", products: [] },
  { id: "b3", name: "Bodega 3", products: [] },
  { id: "b4", name: "Bodega 4", products: [] },
];

interface UbicacionModalProps {
  visible: boolean;
  ubicacion: { id: string; name: string } | null;
  mode: "create" | "edit";
  onClose: () => void;
  onSave: (data: { id?: string; name: string }) => void;
}

const UbicacionModal: React.FC<UbicacionModalProps> = ({
  visible,
  ubicacion,
  mode,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(ubicacion?.name ?? "");
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setName(ubicacion?.name ?? "");
    setError(null);
  }, [ubicacion, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    onSave({ ...(mode === "edit" && ubicacion ? { id: ubicacion.id } : {}), name: name.trim() });
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
        <div className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-robotoMedium text-gray-800 dark:text-white">
            {mode === "create" ? "Nueva Ubicación" : "Editar Ubicación"}
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
              Nombre de Ubicación
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Nombre de la ubicación"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-row items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span className="text-gray-700 dark:text-gray-300 font-robotoMedium">Cancelar</span>
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700"
          >
            <span className="text-white font-robotoMedium">
              {mode === "create" ? "Crear" : "Guardar"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface DeleteConfirmModalProps {
  visible: boolean;
  ubicacion: { id: string; name: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  ubicacion,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
        <div className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-robotoMedium text-gray-800 dark:text-white">
            Eliminar Ubicación
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <span className="text-gray-500 dark:text-gray-400 text-xl">✕</span>
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-gray-700 dark:text-gray-300">
            ¿Estás seguro de que deseas eliminar la ubicación "{ubicacion?.name}"?
          </p>
        </div>
        <div className="flex flex-row items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span className="text-gray-700 dark:text-gray-300 font-robotoMedium">Cancelar</span>
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700"
          >
            <span className="text-white font-robotoMedium">Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailPanel: React.FC<{ ubicacion: Ubicacion }> = ({ ubicacion }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white">{ubicacion.name}</h3>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          {ubicacion.products.length > 0 ? (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="text-left px-4 py-3 font-semibold text-black dark:text-white text-sm">Producto</th>
                  <th className="text-left px-4 py-3 font-semibold text-black dark:text-white text-sm">SKU</th>
                  <th className="text-left px-4 py-3 font-semibold text-black dark:text-white text-sm">Stock</th>
                  <th className="text-right px-4 py-3 font-semibold text-black dark:text-white text-sm">Acción</th>
                </tr>
              </thead>
              <tbody>
                {ubicacion.products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-4 text-black dark:text-white">
                      <p className="font-medium">{p.name}</p>
                      {p.children && (
                        <div className="ml-4 mt-1 space-y-0.5">
                          {p.children.map((c) => (
                            <p key={c.id} className="text-sm text-gray-500 dark:text-gray-400">
                              ↳ {c.name}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{p.sku}</td>
                    <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">{p.existencia}</td>
                    <td className="px-4 py-4 text-right">
                      <button className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <span className="text-sm">🖨️</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 italic">
                No hay productos en esta ubicación
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Barcode lookup for a tarima, backed by the real API.
function TarimaBarcodeSearch() {
  const [skuInput, setSkuInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [etiquetaVisible, setEtiquetaVisible] = useState(false);
  const [etiquetaData, setEtiquetaData] = useState<{
    sku: string;
    isla_master_sku?: string | null;
    cartones: TarimaEtiquetaCarton[];
  } | null>(null);

  const handleSearch = async () => {
    const sku = skuInput.trim();
    if (!sku) return;
    setLoading(true);
    setError(null);
    try {
      const tarima = (await fetchAPI(
        `/api/tarimas?sku=${encodeURIComponent(sku)}`
      )) as { id_tarima: number; sku: string; isla_master_sku?: string | null };
      const cartonesRes = (await fetchAPI(
        `/api/tarimas/${tarima.id_tarima}/cartones`
      )) as { items: TarimaEtiquetaCarton[] };
      setEtiquetaData({
        sku: tarima.sku,
        isla_master_sku: tarima.isla_master_sku,
        cartones: cartonesRes.items,
      });
      setEtiquetaVisible(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4">
      <div className="flex items-center gap-2 max-w-lg">
        <input
          type="text"
          value={skuInput}
          onChange={(e) => setSkuInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Buscar tarima por SKU para imprimir su barcode..."
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !skuInput.trim()}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-robotoMedium disabled:opacity-50"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      <TarimaEtiquetaModal
        visible={etiquetaVisible}
        data={etiquetaData}
        onClose={() => setEtiquetaVisible(false)}
      />
    </div>
  );
}

// Real (non-mock) row (isla) barcode lookup — one label per row with a table
// of every tarima position it contains, via GET /api/islas?sku= +
// GET /api/islas/:id/tarimas + GET /api/tarimas/:id/cartones.
function FilaBarcodeSearch() {
  const [skuInput, setSkuInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [etiquetaVisible, setEtiquetaVisible] = useState(false);
  const [isla, setIsla] = useState<{
    id_isla: number;
    master_sku: string;
    nombre_isla?: string | null;
  } | null>(null);

  const handleSearch = async () => {
    const sku = skuInput.trim();
    if (!sku) return;
    setLoading(true);
    setError(null);
    try {
      const islaRes = (await fetchAPI(
        `/api/islas?sku=${encodeURIComponent(sku)}`
      )) as { id_isla: number; master_sku: string; nombre_isla?: string | null };
      setIsla(islaRes);
      setEtiquetaVisible(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4">
      <div className="flex items-center gap-2 max-w-lg">
        <input
          type="text"
          value={skuInput}
          onChange={(e) => setSkuInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Buscar fila (isla) por SKU para imprimir su etiqueta..."
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !skuInput.trim()}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-robotoMedium disabled:opacity-50"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      <FilaEtiquetaModal
        visible={etiquetaVisible}
        isla={isla}
        onClose={() => setEtiquetaVisible(false)}
      />
    </div>
  );
}

export function Ubicaciones() {
  useDarkMode();
  const [data, setData] = useState<Ubicacion[]>(sampleData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUbicacion, setEditingUbicacion] = useState<{ id: string; name: string } | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [ubicacionToDelete, setUbicacionToDelete] = useState<{ id: string; name: string } | null>(null);

  const openCreateModal = () => {
    setEditingUbicacion(null);
    setModalVisible(true);
  };

  const openEditModal = (ubicacion: { id: string; name: string }) => {
    setEditingUbicacion(ubicacion);
    setModalVisible(true);
  };

  const handleSave = (saveData: { id?: string; name: string }) => {
    if (saveData.id) {
      setData((prev) =>
        prev.map((u) => (u.id === saveData.id ? { ...u, name: saveData.name } : u))
      );
    } else {
      const newItem: Ubicacion = { id: `u-${Date.now()}`, name: saveData.name, products: [] };
      setData((prev) => [newItem, ...prev]);
    }
  };

  const openDeleteModal = (ubicacion: { id: string; name: string }) => {
    setUbicacionToDelete(ubicacion);
    setDeleteModalVisible(true);
  };

  const handleDelete = () => {
    if (!ubicacionToDelete) return;
    setData((prev) => prev.filter((u) => u.id !== ubicacionToDelete.id));
    if (selectedId === ubicacionToDelete.id) setSelectedId(null);
    setDeleteModalVisible(false);
    setUbicacionToDelete(null);
  };

  const filtered = data.filter((u) =>
    u.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const selectedUbicacion = data.find((u) => u.id === selectedId) ?? null;

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="flex flex-row justify-between items-center">
          <h1 className="text-3xl font-bold tracking-wide text-gray-900 dark:text-white">
            Ubicaciones
          </h1>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-robotoMedium transition-colors"
          >
            + Nueva Ubicación
          </button>
        </div>
      </div>

      <TarimaBarcodeSearch />
      <FilaBarcodeSearch />

      {/* Layout maestro-detalle */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 px-8 py-6 overflow-hidden">
        {/* Panel izquierdo: lista de ubicaciones */}
        <aside className="md:w-80 shrink-0 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ubicación..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-3 top-2.5 text-gray-400 text-sm pointer-events-none">
                🔍
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                No hay ubicaciones
              </p>
            ) : (
              filtered.map((ubicacion) => {
                const active = selectedId === ubicacion.id;
                return (
                  <div
                    key={ubicacion.id}
                    onClick={() => setSelectedId(active ? null : ubicacion.id)}
                    className={`group flex items-center justify-between px-4 py-3 cursor-pointer border-l-4 transition-colors ${
                      active
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                        : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/60"
                    }`}
                  >
                    <span
                      className={`text-sm truncate ${
                        active
                          ? "text-blue-700 dark:text-blue-300 font-semibold"
                          : "text-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {ubicacion.name}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(ubicacion);
                        }}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(ubicacion);
                        }}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Panel derecho: detalle de ubicación */}
        <section className="flex-1 overflow-y-auto">
          {selectedUbicacion ? (
            <DetailPanel ubicacion={selectedUbicacion} />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center h-full flex items-center justify-center">
              <div className="max-w-md mx-auto">
                <h2 className="text-xl font-light text-gray-600 dark:text-gray-400 mb-4">
                  Selecciona una ubicación
                </h2>
                <p className="text-base text-gray-500 dark:text-gray-500 leading-relaxed">
                  Haz click en una ubicación de la lista para ver su inventario.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <UbicacionModal
        visible={modalVisible}
        ubicacion={editingUbicacion}
        mode={editingUbicacion ? "edit" : "create"}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />

      <DeleteConfirmModal
        visible={deleteModalVisible}
        ubicacion={ubicacionToDelete}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setUbicacionToDelete(null);
        }}
      />
    </div>
  );
}
