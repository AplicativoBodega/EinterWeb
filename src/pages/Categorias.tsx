import React, { useState, useEffect } from "react";
import { fetchAPI } from "../lib/fetch";
import { useDarkMode } from "../context/DarkModeContext";
import { CategoryModal } from "../components/CategoryModal";
import { DeleteConfirmModal } from "../components/DeleteCategoryConfirmModal";

type Product = {
  id: number;
  name: string;
  sku: string;
  stock: number;
  children?: Product[];
};

type Category = {
  id: number;
  name: string;
  products: Product[];
};


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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header de la categoría */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white">{title}</h3>
      </div>

      {open && (
        <div className="p-6">
          {/* Lista de productos en tabla */}
          <div className="overflow-x-auto">
            {products.length > 0 ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                    <th className="text-left px-4 py-3 font-semibold text-black dark:text-white text-sm">Producto</th>
                    <th className="text-left px-4 py-3 font-semibold text-black dark:text-white text-sm">SKU</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, index) => (
                    <tr
                      key={p.id ? `product-${p.id}` : `product-${index}`}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-4 text-black dark:text-white">
                        {p.name}
                      </td>
                      <td className="px-4 py-4 text-black dark:text-white">
                        {p.sku}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 italic">
                  No hay productos en esta categoría
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
  useDarkMode(); // Initialize dark mode context
  const [data, setData] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [loadingCategory, setLoadingCategory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar solo categorías
      const categoriesData = await fetchAPI("/api/categorias?page=1&pageSize=100") as { items?: { id: number; name: string }[] };
      const categories = categoriesData.items || [];

      // Crear estructura de categorías sin productos
      const categoriesWithoutProducts: Category[] = categories.map((cat: { id: number; name: string }) => ({
        id: cat.id,
        name: cat.name,
        products: [],
      }));

      setData(categoriesWithoutProducts);
    } catch (err) {
      console.error("Failed to load categories", err);
      setError(err instanceof Error ? err.message : "Error al cargar categorías");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (categoryId: number) => {
    setSelectedId(categoryId || null);
    setDropdownVisible(false);
    
    // Cargar productos de la categoría seleccionada
    try {
      setLoadingCategory(true);
      const categoryData = await fetchAPI(`/api/categorias?id=${categoryId}`) as { productos?: Record<string, unknown>[]; products?: Record<string, unknown>[]; items?: Record<string, unknown>[]; data?: Record<string, unknown>[] };
      const products = categoryData.productos || categoryData.products || categoryData.items || categoryData.data || [];
      
      setData((prevData) =>
        prevData.map((cat) =>
          cat.id === categoryId
            ? {
                ...cat,
                products: products.map((p: Record<string, unknown>) => ({
                  id: Number(p.id_articulo || p.id) || 0,
                  name: String(p.nombre_producto || p.name || ''),
                  sku: String(p.master_sku || p.sku || ''),
                  stock: Number(p.stock) || 0,
                  children: p.children as Product[] | undefined,
                })),
              }
            : cat
        )
      );
    } catch (err) {
      console.error(`Failed to load products for category ${categoryId}`, err);
      setError(err instanceof Error ? err.message : "Error al cargar productos de la categoría");
    } finally {
      setLoadingCategory(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setCategoryModalVisible(true);
  };

  const openEditModal = (category: { id: number; name: string }) => {
    setEditingCategory(category);
    setCategoryModalVisible(true);
  };

  const handleSaveCategory = async (categoryData: {
    id?: number;
    name: string;
  }) => {
    if (categoryData.id) {
      await fetchAPI(`/api/categorias?id=${categoryData.id}`, {
        method: "PUT",
        body: JSON.stringify({ nombre_categoria: categoryData.name }),
      });
    } else {
      await fetchAPI("/api/categorias", {
        method: "POST",
        body: JSON.stringify({ nombre_categoria: categoryData.name }),
      });
    }
    loadData();
    setCategoryModalVisible(false);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    await fetchAPI(`/api/categorias?id=${categoryToDelete.id}`, {
      method: "DELETE",
    });
    loadData();
    setDeleteModalVisible(false);
    setCategoryToDelete(null);
    if (selectedId === categoryToDelete.id) {
      setSelectedId(null);
    }
  };

  const openDeleteModal = (category: { id: number; name: string }) => {
    setCategoryToDelete(category);
    setDeleteModalVisible(true);
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen overflow-auto">
      {/* Header limpio y elegante */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="flex flex-row justify-between items-center">
          <h1 className="text-3xl font-bold tracking-wide text-gray-900 dark:text-white">
            Categorías
          </h1>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-robotoMedium transition-colors"
          >
            + Nueva Categoría
          </button>
        </div>
      </div>

      {/* Área de selección con espaciado mejorado */}
      <div className="bg-white dark:bg-gray-800 mx-8 mt-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            SELECCIONAR CATEGORÍA
          </p>
          <button
            onClick={() => setDropdownVisible(!dropdownVisible)}
            className="w-full flex flex-row items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded hover:border-black dark:hover:border-white transition-colors bg-white dark:bg-gray-700"
          >
            <span
              className={`text-base ${
                selectedId 
                  ? "text-black dark:text-white font-medium" 
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {selectedId
                ? data.find((c) => c.id === selectedId)?.name
                : "Seleccione una categoría para visualizar"}
            </span>
            <span className="text-lg text-gray-400 dark:text-gray-500">
              {dropdownVisible ? "×" : "⌄"}
            </span>
          </button>

          {/* Dropdown mejorado */}
          {dropdownVisible && (
            <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-700 max-h-60 overflow-y-auto">
              {data.length === 0 ? (
                <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
                  No hay categorías
                </div>
              ) : (
                data.map((categoria, index) => (
                  <div
                    key={categoria.id}
                    className={`flex flex-row items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 ${
                      index !== data.length - 1
                        ? "border-b border-gray-100 dark:border-gray-700"
                        : ""
                    }`}
                  >
                    <button
                      onClick={() => handleCategorySelect(categoria.id)}
                      className="flex-1 text-left text-base text-gray-700 dark:text-gray-200"
                    >
                      {categoria.name}
                    </button>
                    <div className="flex flex-row gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(categoria);
                        }}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(categoria);
                        }}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal con scroll de página completa */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">Cargando categorías...</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700 p-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : selectedId ? (
          loadingCategory ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">Cargando productos de la categoría...</p>
            </div>
          ) : (
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
          )
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-light text-gray-600 dark:text-gray-400 mb-4">
                Ninguna categoría seleccionada
              </h2>
              <p className="text-base text-gray-500 dark:text-gray-500 leading-relaxed">
                Selecciona una categoría del menú desplegable superior para
                visualizar sus productos.
              </p>
            </div>
          </div>
        )}
      </div>

      <CategoryModal
        visible={categoryModalVisible}
        category={editingCategory}
        onClose={() => setCategoryModalVisible(false)}
        onSave={handleSaveCategory}
        mode={editingCategory ? "edit" : "create"}
      />

      <DeleteConfirmModal
        visible={deleteModalVisible}
        title="Eliminar Categoría"
        message={`¿Estás seguro de que deseas eliminar la categoría "${categoryToDelete?.name}"?`}
        onConfirm={handleDeleteCategory}
        onCancel={() => {
          setDeleteModalVisible(false);
          setCategoryToDelete(null);
        }}
      />
    </div>
  );
}