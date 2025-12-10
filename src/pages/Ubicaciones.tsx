import React, { useState } from "react";

type Product = {
  id: string;
  name: string;
  sku: string;
  existencia: number;
  children?: Product[];
};

const sampleData: { id: string; name: string; products: Product[] }[] = [
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

interface AccordionItemProps {
  title: string;
  products: Product[];
  open: boolean;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  products,
  open,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header de la bodega */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-800">{title}</h3>
      </div>

      {open && (
        <div className="p-6">
          {/* Header de la tabla con diseño más limpio */}
          <div className="flex flex-row border-b border-gray-200 pb-3 mb-4">
            <h4 className="w-2/5 text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Producto
            </h4>
            <p className="w-1/5 text-sm font-semibold text-gray-600 uppercase tracking-wide">
              SKU
            </p>
            <p className="w-1/5 text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Stock
            </p>
            <p className="w-1/5 text-sm font-semibold text-gray-600 uppercase tracking-wide text-right">
              Acción
            </p>
          </div>

          {/* Lista de productos expandida completamente */}
          <div>
            {products.length > 0 ? (
              products.map((p, index) => (
                <div
                  key={p.id}
                  className={`flex flex-row items-start py-4 ${
                    index !== products.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <div className="w-2/5 pr-4">
                    <p className="text-base font-medium text-gray-900 mb-1">
                      {p.name}
                    </p>
                    {p.children && (
                      <div className="ml-4 mt-2 space-y-1">
                        {p.children.map((c) => (
                          <p key={c.id} className="text-sm text-gray-600">
                            ↳ {c.name}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="w-1/5 text-base text-gray-700">{p.sku}</p>
                  <p className="w-1/5 text-base font-medium text-gray-900">
                    {p.existencia}
                  </p>
                  <div className="w-1/5 flex flex-row justify-end">
                    <button className="px-3 py-2 border border-gray-300 rounded hover:border-black hover:bg-gray-50 transition-colors">
                      <span className="text-base">🖨️</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-500 italic">
                  No hay productos en esta bodega
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface AddLocationModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, description: string) => void;
}

const AddLocationModal: React.FC<AddLocationModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const handleAdd = () => {
    if (name.trim() === "") return;
    onAdd(name.trim(), desc.trim());
    setName("");
    setDesc("");
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
      <div className="w-full max-w-md bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header del modal */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-row justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Agregar Ubicación
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
            >
              <span className="text-gray-600 text-lg">×</span>
            </button>
          </div>
        </div>

        {/* Contenido del modal */}
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ingrese el nombre de la ubicación"
                className="w-full px-4 py-3 border border-gray-300 rounded focus:border-black focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Descripción
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Descripción opcional"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded focus:border-black focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Botones del modal */}
          <div className="flex flex-row justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              <span className="text-gray-700 font-medium">Cancelar</span>
            </button>

            <button
              onClick={handleAdd}
              className="px-6 py-2 bg-black rounded hover:bg-gray-800"
            >
              <span className="text-white font-medium">Agregar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function Ubicaciones() {
  const [data, setData] = useState(sampleData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleAddLocation = (name: string) => {
    const newItem = { id: `b-${Date.now()}`, name, products: [] };
    setData((d) => [newItem, ...d]);
    setModalVisible(false);
  };

  const handleBodegaSelect = (bodegaId: string) => {
    setSelectedId(bodegaId || null);
    setDropdownVisible(false);
  };

  return (
    <div className="flex-1 bg-gray-50 min-h-screen overflow-auto">
      {/* Header limpio y elegante */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex flex-row justify-between items-center">
          <h1 className="text-3xl font-bold tracking-wide">Ubicaciones</h1>
          <button
            onClick={() => setModalVisible(true)}
            className="px-6 py-2 border border-black hover:bg-black hover:text-white transition-colors text-sm font-medium"
          >
            + Agregar Ubicación
          </button>
        </div>
      </div>

      {/* Área de selección con espaciado mejorado */}
      <div className="bg-white mx-8 mt-6 rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-600 mb-3">
            SELECCIONAR BODEGA
          </p>
          <button
            onClick={() => setDropdownVisible(!dropdownVisible)}
            className="w-full flex flex-row items-center justify-between px-4 py-3 border border-gray-300 rounded hover:border-black transition-colors"
          >
            <span
              className={`text-base ${
                selectedId ? "text-black font-medium" : "text-gray-500"
              }`}
            >
              {selectedId
                ? data.find((b) => b.id === selectedId)?.name
                : "Seleccione una bodega para visualizar"}
            </span>
            <span className="text-lg text-gray-400">
              {dropdownVisible ? "×" : "⌄"}
            </span>
          </button>

          {/* Dropdown mejorado */}
          {dropdownVisible && (
            <div className="mt-2 border border-gray-200 rounded bg-white">
              {data.map((bodega, index) => (
                <button
                  key={bodega.id}
                  onClick={() => handleBodegaSelect(bodega.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 text-base text-gray-700 ${
                    index !== data.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  {bodega.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal con scroll de página completa */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        {selectedId ? (
          data
            .filter((d) => d.id === selectedId)
            .map((b) => (
              <AccordionItem
                key={b.id}
                title={b.name}
                products={b.products}
                open={true}
              />
            ))
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-light text-gray-600 mb-4">
                Ninguna bodega seleccionada
              </h2>
              <p className="text-base text-gray-500 leading-relaxed">
                Selecciona una bodega del menú desplegable superior para
                visualizar su inventario y ubicaciones.
              </p>
            </div>
          </div>
        )}
      </div>

      <AddLocationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddLocation}
      />
    </div>
  );
}