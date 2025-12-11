import { useState, useEffect } from "react";

export interface Producto {
  id: string;
  nombre: string;
  sku: string;
  cantidad: number;
  costo_por_articulo: number;
}

export interface ReciboData {
  orden: string;
  proveedor_id: number;
  proveedor_name?: string;
  tipo: number;
  fecha_compra: string;
  eta: string;
  productos: Producto[];
  pdf?: string | File | null;
}

interface Proveedor {
  id: number;
  name: string;
  city: string;
  lead_time: number;
}

interface ReciboModalProps {
  visible: boolean;
  recibo: ReciboData | null;
  onClose: () => void;
  onSave: (recibo: ReciboData) => Promise<void>;
  mode: "create" | "edit";
}

export function ReciboModal({
  visible,
  recibo,
  onClose,
  onSave,
  mode,
}: ReciboModalProps) {
  const [formData, setFormData] = useState({
    orden: "",
    proveedor_id: "",
    tipo: "1",
    fecha_compra: "",
    eta: "",
  });
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [showProveedorList, setShowProveedorList] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchProveedores();
    }
  }, [visible]);

  useEffect(() => {
    if (recibo && mode === "edit") {
      setFormData({
        orden: recibo.orden,
        proveedor_id: String(recibo.proveedor_id),
        tipo: String(recibo.tipo),
        fecha_compra: recibo.fecha_compra,
        eta: recibo.eta,
      });
      setProductos(recibo.productos);
      const proveedor = proveedores.find((p) => p.id === recibo.proveedor_id);
      setSelectedProveedor(proveedor || null);
    } else {
      const today = new Date().toISOString().split("T")[0];
      setFormData({
        orden: "",
        proveedor_id: "",
        tipo: "1",
        fecha_compra: today,
        eta: "",
      });
      setProductos([]);
      setSelectedProveedor(null);
    }
    setError(null);
    setPdfFile(null);
    setPdfFileName(null);
  }, [recibo, mode, visible, proveedores]);

  const fetchProveedores = async () => {
    setLoadingProveedores(true);
    try {
      // Mock data - replace with actual API call
      setProveedores([
        { id: 1, name: "Proveedor A", city: "México", lead_time: 3 },
        { id: 2, name: "Proveedor B", city: "Guadalajara", lead_time: 5 },
      ]);
    } catch (err) {
      console.error("Error fetching proveedores:", err);
    } finally {
      setLoadingProveedores(false);
    }
  };

  const handleSelectProveedor = (proveedor: Proveedor) => {
    setSelectedProveedor(proveedor);
    setFormData({ ...formData, proveedor_id: String(proveedor.id) });
    setShowProveedorList(false);
  };

  const handleAddProducto = () => {
    const newProducto: Producto = {
      id: Date.now().toString(),
      nombre: "",
      sku: "",
      cantidad: 1,
      costo_por_articulo: 0,
    };
    setProductos([...productos, newProducto]);
  };

  const handleRemoveProducto = (productoId: string) => {
    setProductos(productos.filter((p) => p.id !== productoId));
  };

  const handleUpdateProducto = (
    productoId: string,
    field: keyof Producto,
    value: any
  ) => {
    setProductos(
      productos.map((p) => (p.id === productoId ? { ...p, [field]: value } : p))
    );
  };

  const calculateTotal = () => {
    return productos.reduce(
      (total, p) => total + p.cantidad * p.costo_por_articulo,
      0
    );
  };

  const handleFileSelect = (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Solo se permiten archivos PDF");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPdfFile(base64.split(",")[1]);
      setPdfFileName(file.name);
    };
    reader.onerror = () => {
      setError("Error al leer el archivo PDF");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.orden.trim()) {
      setError("El número de orden es obligatorio");
      return;
    }

    if (!formData.proveedor_id) {
      setError("Debe seleccionar un proveedor");
      return;
    }

    if (!formData.fecha_compra) {
      setError("La fecha de compra es obligatoria");
      return;
    }

    if (productos.length === 0) {
      setError("Debe agregar al menos un producto");
      return;
    }

    for (const producto of productos) {
      if (!producto.nombre.trim() || !producto.sku.trim()) {
        setError("Todos los productos deben tener nombre y SKU");
        return;
      }
      if (producto.cantidad <= 0 || producto.costo_por_articulo <= 0) {
        setError("La cantidad y el costo deben ser mayores a 0");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const reciboData: ReciboData = {
        orden: formData.orden,
        proveedor_id: parseInt(formData.proveedor_id),
        proveedor_name: selectedProveedor?.name,
        tipo: parseInt(formData.tipo),
        fecha_compra: formData.fecha_compra,
        eta: formData.eta || formData.fecha_compra,
        productos: productos,
        pdf: pdfFile,
      };

      await onSave(reciboData);
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
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
        <div className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-robotoMedium text-gray-800">
            {mode === "create" ? "Agregar Compra" : "Editar Compra"}
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

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="space-y-4">
            <div className="flex flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-robotoMedium text-gray-700 mb-2 block">
                  Número de Orden
                </label>
                <input
                  type="text"
                  value={formData.orden}
                  onChange={(e) =>
                    setFormData({ ...formData, orden: e.target.value })
                  }
                  placeholder="50000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-robotoMedium text-gray-700 mb-2 block">
                Proveedor *
              </label>
              <button
                onClick={() => setShowProveedorList(!showProveedorList)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-left"
              >
                {loadingProveedores ? "Cargando..." : selectedProveedor?.name || "Selecciona un proveedor"}
              </button>

              {showProveedorList && (
                <div className="mt-2 border border-gray-200 rounded-lg bg-white overflow-y-auto max-h-48">
                  {loadingProveedores ? (
                    <div className="p-3">Cargando...</div>
                  ) : (
                    proveedores.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectProveedor(p)}
                        className="w-full text-left px-4 py-2 border-b border-gray-100 hover:bg-gray-50"
                      >
                        {p.name} ({p.city})
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-robotoMedium text-gray-700 mb-2 block">
                  Fecha de Compra
                </label>
                <input
                  type="date"
                  value={formData.fecha_compra}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_compra: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-robotoMedium text-gray-700 mb-2 block">
                  ETA
                </label>
                <input
                  type="date"
                  value={formData.eta}
                  onChange={(e) =>
                    setFormData({ ...formData, eta: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-robotoMedium">Productos</h3>
                <button
                  onClick={handleAddProducto}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Agregar Producto
                </button>
              </div>

              {productos.length === 0 ? (
                <p className="text-gray-500">No hay productos agregados</p>
              ) : (
                <div className="space-y-3">
                  {productos.map((producto) => (
                    <div key={producto.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-5 gap-3 mb-2">
                        <input
                          type="text"
                          value={producto.nombre}
                          onChange={(e) =>
                            handleUpdateProducto(producto.id, "nombre", e.target.value)
                          }
                          placeholder="Nombre"
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="text"
                          value={producto.sku}
                          onChange={(e) =>
                            handleUpdateProducto(producto.id, "sku", e.target.value)
                          }
                          placeholder="SKU"
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          value={producto.cantidad}
                          onChange={(e) =>
                            handleUpdateProducto(producto.id, "cantidad", parseInt(e.target.value) || 0)
                          }
                          placeholder="Cantidad"
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          value={producto.costo_por_articulo}
                          onChange={(e) =>
                            handleUpdateProducto(
                              producto.id,
                              "costo_por_articulo",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="Costo"
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => handleRemoveProducto(producto.id)}
                          className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-right font-robotoMedium">
                  Total: ${calculateTotal().toFixed(2)}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <label className="text-sm font-robotoMedium text-gray-700 mb-2 block">
                Subir PDF (Opcional)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {pdfFileName && (
                <p className="text-sm text-gray-600 mt-2">Archivo: {pdfFileName}</p>
              )}
            </div>
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