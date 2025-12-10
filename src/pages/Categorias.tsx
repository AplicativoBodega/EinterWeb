import React, { useState } from "react";

type Product = {
  id: string;
  name: string;
  sku: string;
  existencia: number;
  children?: Product[];
};

type Category = {
  id: string;
  name: string;
  products: Product[];
};

const sampleData: Category[] = [
  {
    id: "cat1",
    name: "Baños",
    products: [
      {
        id: "p1",
        name: "Lavamanos de Cerámica",
        sku: "LAV-001",
        existencia: 45,
        children: [
          { id: "p1-1", name: "Blanco", sku: "LAV-001-W", existencia: 25 },
          { id: "p1-2", name: "Negro", sku: "LAV-001-B", existencia: 20 },
        ],
      },
      {
        id: "p2",
        name: "Espejo de Baño",
        sku: "ESP-002",
        existencia: 30,
      },
      {
        id: "p3",
        name: "Cortina de Ducha",
        sku: "COR-003",
        existencia: 60,
        children: [
          { id: "p3-1", name: "Transparente", sku: "COR-003-T", existencia: 35 },
          { id: "p3-2", name: "Opaca", sku: "COR-003-O", existencia: 25 },
        ],
      },
    ],
  },
  {
    id: "cat2",
    name: "Decoración",
    products: [
      {
        id: "p4",
        name: "Cuadro Moderno",
        sku: "CUA-001",
        existencia: 25,
      },
      {
        id: "p5",
        name: "Lámpara de Piso",
        sku: "LAM-002",
        existencia: 15,
        children: [
          { id: "p5-1", name: "Dorada", sku: "LAM-002-G", existencia: 8 },
          { id: "p5-2", name: "Plateada", sku: "LAM-002-S", existencia: 7 },
        ],
      },
      {
        id: "p6",
        name: "Espejo Decorativo",
        sku: "ESP-004",
        existencia: 18,
      },
      {
        id: "p7",
        name: "Tapiz de Pared",
        sku: "TAP-005",
        existencia: 40,
      },
    ],
  },
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
      {/* Header de la categoría */}
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

export function Categorias() {
  const [data] = useState(sampleData);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedId(categoryId || null);
    setDropdownVisible(false);
  };

  return (
    <div className="flex-1 bg-gray-50 min-h-screen overflow-auto">
      {/* Header limpio y elegante */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex flex-row justify-between items-center">
          <h1 className="text-3xl font-bold tracking-wide">Categorías</h1>
        </div>
      </div>

      {/* Área de selección con espaciado mejorado */}
      <div className="bg-white mx-8 mt-6 rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-600 mb-3">
            SELECCIONAR CATEGORÍA
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
                ? data.find((c) => c.id === selectedId)?.name
                : "Seleccione una categoría para visualizar"}
            </span>
            <span className="text-lg text-gray-400">
              {dropdownVisible ? "×" : "⌄"}
            </span>
          </button>

          {/* Dropdown mejorado */}
          {dropdownVisible && (
            <div className="mt-2 border border-gray-200 rounded bg-white">
              {data.map((categoria, index) => (
                <button
                  key={categoria.id}
                  onClick={() => handleCategorySelect(categoria.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 text-base text-gray-700 ${
                    index !== data.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  {categoria.name}
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
            .map((c) => (
              <AccordionItem
                key={c.id}
                title={c.name}
                products={c.products}
                open={true}
              />
            ))
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-light text-gray-600 mb-4">
                Ninguna categoría seleccionada
              </h2>
              <p className="text-base text-gray-500 leading-relaxed">
                Selecciona una categoría del menú desplegable superior para
                visualizar sus productos.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}