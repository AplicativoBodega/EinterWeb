import { useState, useEffect } from "react";

export interface Producto {
  id: string;
  nombre: string;
  sku: string;
  cantidad: number;
  precio: number;
}

export interface Folio {
  id: string;
  numero_folio: string;
  productos: Producto[];
}

export interface OrdenVenta {
  id_orden: string;
  cliente: string;
  fecha: string;
  folios: Folio[];
}

interface VentaModalProps {
  visible: boolean;
  orden: OrdenVenta | null;
  onClose: () => void;
  onSave: (orden: OrdenVenta) => Promise<void>;
  mode: "create" | "edit";
}

export function VentaModal({
  visible,
  orden,
  onClose,
  onSave,
  mode,
}: VentaModalProps) {
  const [formData, setFormData] = useState({
    id_orden: "",
    cliente: "",
    fecha: "",
  });
  const [folios, setFolios] = useState<Folio[]>([]);
  const [selectedFolioId, setSelectedFolioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orden && mode === "edit") {
      setFormData({
        id_orden: orden.id_orden,
        cliente: orden.cliente,
        fecha: orden.fecha,
      });
      setFolios(orden.folios);
      if (orden.folios.length > 0) {
        setSelectedFolioId(orden.folios[0].id);
      }
    } else {
      const today = new Date().toISOString().split("T")[0];
      setFormData({
        id_orden: "",
        cliente: "",
        fecha: today,
      });
      setFolios([]);
      setSelectedFolioId(null);
    }
    setError(null);
  }, [orden, mode, visible]);

  const handleAddFolio = () => {
    const newFolio: Folio = {
      id: Date.now().toString(),
      numero_folio: `FOL-${Date.now()}`,
      productos: [],
    };
    setFolios([...folios, newFolio]);
    setSelectedFolioId(newFolio.id);
  };

  const handleRemoveFolio = (folioId: string) => {
    const updatedFolios = folios.filter((f) => f.id !== folioId);
    setFolios(updatedFolios);
    if (selectedFolioId === folioId) {
      setSelectedFolioId(updatedFolios.length > 0 ? updatedFolios[0].id : null);
    }
  };

  const handleAddProducto = () => {
    if (!selectedFolioId) return;

    const newProducto: Producto = {
      id: Date.now().toString(),
      nombre: "",
      sku: "",
      cantidad: 1,
      precio: 0,
    };

    setFolios(
      folios.map((f) =>
        f.id === selectedFolioId
          ? { ...f, productos: [...f.productos, newProducto] }
          : f
      )
    );
  };

  const handleRemoveProducto = (productoId: string) => {
    if (!selectedFolioId) return;

    setFolios(
      folios.map((f) =>
        f.id === selectedFolioId
          ? { ...f, productos: f.productos.filter((p) => p.id !== productoId) }
          : f
      )
    );
  };

  const handleUpdateProducto = (
    productoId: string,
    field: keyof Producto,
    value: any
  ) => {
    if (!selectedFolioId) return;

    setFolios(
      folios.map((f) =>
        f.id === selectedFolioId
          ? {
              ...f,
              productos: f.productos.map((p) =>
                p.id === productoId ? { ...p, [field]: value } : p
              ),
            }
          : f
      )
    );
  };

  const calculateTotals = () => {
    let totalProductos = 0;
    let totalPrecio = 0;

    folios.forEach((folio) => {
      folio.productos.forEach((producto) => {
        totalProductos += producto.cantidad;
        totalPrecio += producto.cantidad * producto.precio;
      });
    });

    return { totalProductos, totalPrecio };
  };

  const handleSave = async () => {
    if (!formData.id_orden.trim()) {
      setError("El número de orden es obligatorio");
      return;
    }

    if (!formData.cliente.trim()) {
      setError("El nombre del cliente es obligatorio");
      return;
    }

    if (!formData.fecha) {
      setError("La fecha es obligatoria");
      return;
    }

    if (folios.length === 0) {
      setError("Debe agregar al menos un folio");
      return;
    }

    for (const folio of folios) {
      if (folio.productos.length === 0) {
        setError(
          `El folio ${folio.numero_folio} debe tener al menos un producto`
        );
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const ordenData: OrdenVenta = {
        id_orden: formData.id_orden,
        cliente: formData.cliente,
        fecha: formData.fecha,
        folios: folios,
      };

      await onSave(ordenData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const selectedFolio = folios.find((f) => f.id === selectedFolioId);
  const { totalProductos, totalPrecio } = calculateTotals();

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-7xl max-h-[95vh] flex flex-col">
        <div className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-robotoMedium text-gray-800">
            {mode === "create" ? "Nueva Orden de Venta" : "Editar Orden"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <span className="text-gray-500 text-2xl">×</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3">
            <p className="text-red-600 font-robotoRegular">{error}</p>
          </div>
        )}

        <div className="flex-1 flex flex-row">
          <div className="w-80 border-r border-gray-200 p-6">
            <h3 className="text-lg font-robotoMedium text-gray-800 mb-4">
              Información de la Orden
            </h3>

            <div className="mb-4">
              <label className="text-sm font-robotoMedium text-gray-700 mb-2 block">
                Número de Orden *
              </label>
              <input
                type="text"
                value={formData.id_orden}
                onChange={(e) =>
                  setFormData({ ...formData, id_orden: e.target.value })
                }
                placeholder="ORD-12345"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
              />
            </div>

            <div className="mb-4">
              <label className="text-sm font-robotoMedium text-gray-700 mb-2 block">
                Cliente *
              </label>
              <input
                type="text"
                value={formData.cliente}
                onChange={(e) =>
                  setFormData({ ...formData, cliente: e.target.value })
                }
                placeholder="Nombre del cliente"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
              />
            </div>

            <div className="mb-6">
              <label className="text-sm font-robotoMedium text-gray-700 mb-2 block">
                Fecha *
              </label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) =>
                  setFormData({ ...formData, fecha: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
              />
            </div>

            <div className="flex-1">
              <div className="flex flex-row items-center justify-between mb-3">
                <h4 className="text-sm font-robotoMedium text-gray-700">
                  Folios
                </h4>
                <button
                  onClick={handleAddFolio}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Agregar
                </button>
              </div>

              <div className="overflow-y-auto max-h-48 space-y-2">
                {folios.map((folio) => (
                  <div key={folio.id} className="p-2 border border-gray-200 rounded">
                    <div className="flex flex-row justify-between items-center mb-2">
                      <span className="text-sm font-robotoMedium">
                        {folio.numero_folio}
                      </span>
                      <button
                        onClick={() => handleRemoveFolio(folio.id)}
                        className="text-red-600 text-xs hover:text-red-700"
                      >
                        Quitar
                      </button>
                    </div>
                    <button
                      onClick={() => setSelectedFolioId(folio.id)}
                      className={`w-full text-left px-2 py-1 rounded text-xs ${
                        selectedFolioId === folio.id
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100"
                      }`}
                    >
                      ({folio.productos.length} productos)
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex flex-row justify-between mb-2">
                <p className="text-sm text-gray-600">Total Productos:</p>
                <p className="text-sm font-robotoMedium">{totalProductos}</p>
              </div>
              <div className="flex flex-row justify-between">
                <p className="text-sm text-gray-600">Total Precio:</p>
                <p className="text-sm font-robotoMedium">${totalPrecio.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col p-6">
            {selectedFolio ? (
              <>
                <div className="mb-4">
                  <div className="flex flex-row items-center justify-between mb-3">
                    <h4 className="text-lg font-robotoMedium">
                      {selectedFolio.numero_folio}
                    </h4>
                    <button
                      onClick={handleAddProducto}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Agregar Producto
                    </button>
                  </div>

                  {selectedFolio.productos.length === 0 ? (
                    <p className="text-gray-500">No hay productos</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {selectedFolio.productos.map((producto) => (
                        <div key={producto.id} className="p-3 border border-gray-200 rounded">
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            <input
                              type="text"
                              value={producto.nombre}
                              onChange={(e) =>
                                handleUpdateProducto(producto.id, "nombre", e.target.value)
                              }
                              placeholder="Nombre"
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="text"
                              value={producto.sku}
                              onChange={(e) =>
                                handleUpdateProducto(producto.id, "sku", e.target.value)
                              }
                              placeholder="SKU"
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="number"
                              value={producto.cantidad}
                              onChange={(e) =>
                                handleUpdateProducto(
                                  producto.id,
                                  "cantidad",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="Cantidad"
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="number"
                              value={producto.precio}
                              onChange={(e) =>
                                handleUpdateProducto(
                                  producto.id,
                                  "precio",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="Precio"
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <button
                            onClick={() => handleRemoveProducto(producto.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 w-full"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500">Selecciona un folio para agregar productos</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-row items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 rounded-lg border border-gray-300 disabled:opacity-50"
          >
            <span className="text-gray-700 font-robotoMedium">Cancelar</span>
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-3 rounded-lg bg-blue-600 disabled:opacity-50"
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