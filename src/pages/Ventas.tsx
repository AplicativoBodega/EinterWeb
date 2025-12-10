import { useState, useEffect } from "react";
import { VentaModal } from "../components/VentaModal";
import type { OrdenVenta } from "../components/VentaModal";

interface Venta {
  id_venta: number;
  id_orden: string | number | null;
  id_folio: string | number | null;
  cliente: string | null;
  precio: number | string;
  costo: number | string;
  fecha: string | Date;
}

interface VentasResponse {
  page: number;
  pageSize: number;
  total: number;
  items: Venta[];
}

export function Ventas() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [filteredVentas, setFilteredVentas] = useState<Venta[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<OrdenVenta | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  // Fetch ventas from API
  useEffect(() => {
    const fetchVentas = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = (await fetchAPI(
          `/(api)/ventas?type=ventas&page=${page}&pageSize=${pageSize}`
        )) as VentasResponse;

        setVentas(response.items);
        setFilteredVentas(response.items);
        setTotal(response.total);
      } catch (err) {
        setError((err as Error).message);
        console.error("Error fetching ventas:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVentas();
  }, [page, pageSize]);

  const handleSearch = (text: string) => {
    setSearchText(text);
    const filtered = ventas.filter(
      (venta) =>
        venta.id_orden?.toString().toLowerCase().includes(text.toLowerCase()) ||
        false ||
        venta.cliente?.toLowerCase().includes(text.toLowerCase()) ||
        false ||
        venta.id_folio?.toString().toLowerCase().includes(text.toLowerCase()) ||
        false
    );
    setFilteredVentas(filtered);
  };

  const formatDate = (dateValue: string | Date) => {
    const date = new Date(dateValue);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatCurrency = (value: number | string) => {
    return `$${Number(value).toFixed(2)}`;
  };

  const handleOpenCreateModal = () => {
    setSelectedOrden(null);
    setModalMode("create");
    setModalVisible(true);
  };

  const handleOpenEditModal = (venta: Venta) => {
    // TODO: Convert venta to OrdenVenta structure
    // setSelectedOrden(venta);
    // setModalMode("edit");
    // setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedOrden(null);
  };

  const handleSaveOrden = async (ordenData: OrdenVenta) => {
    try {
      if (modalMode === "create") {
        await fetchAPI("/(api)/ventas", {
          method: "POST",
          body: JSON.stringify(ordenData),
        });
      } else if (modalMode === "edit" && selectedOrden) {
        await fetchAPI(`/(api)/ventas`, {
          method: "PUT",
          body: JSON.stringify(ordenData),
        });
      }

      // Refresh the ventas list
      const response = (await fetchAPI(
        `/(api)/ventas?type=ventas&page=${page}&pageSize=${pageSize}`
      )) as VentasResponse;

      setVentas(response.items);
      setFilteredVentas(response.items);
      setTotal(response.total);
    } catch (err) {
      throw err;
    }
  };

  const WebView = (
    <div className="w-full bg-gray-50 flex flex-col">
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex-row items-center justify-between">
          <div className="flex-row items-center">
            <h2 className="text-2xl font-robotoMedium text-gray-800">
              Ventas
            </h2>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <span className="text-white font-robotoMedium">Agregar Venta</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white mx-6 mt-4 border border-gray-400 overflow-hidden flex flex-col">
        <div className="flex bg-[#f0f0f0] border-b-2 border-gray-400">
          <div className="w-16 py-4 px-3 border-r border-gray-400 flex items-center justify-center">
            <span className="text-2xl">📄</span>
          </div>
          <div className="flex-[0.8] py-4 px-3 border-r border-gray-400 flex items-center justify-center">
            <span className="font-robotoMedium text-gray-900 text-xl text-center">
              ID
            </span>
          </div>
          <div className="flex-[1.5] py-4 px-3 border-r border-gray-400 flex items-center justify-center">
            <span className="font-robotoMedium text-gray-900 text-xl text-center">
              Numero Orden
            </span>
          </div>
          <div className="flex-[1.2] py-4 px-3 border-r border-gray-400 flex items-center justify-center">
            <span className="font-robotoMedium text-gray-900 text-xl text-center">
              Folio
            </span>
          </div>
          <div className="flex-2 py-4 px-3 border-r border-gray-400 flex items-center justify-center">
            <span className="font-robotoMedium text-gray-900 text-xl text-center">
              Cliente
            </span>
          </div>
          <div className="flex-[1.2] py-4 px-3 border-r border-gray-400 flex items-center justify-center">
            <span className="font-robotoMedium text-gray-900 text-xl text-center">
              Precio
            </span>
          </div>
          <div className="flex-[1.2] py-4 px-3 border-r border-gray-400 flex items-center justify-center">
            <span className="font-robotoMedium text-gray-900 text-xl text-center">
              Costo
            </span>
          </div>
          <div className="flex-[1.2] py-4 px-3 flex items-center justify-center">
            <span className="font-robotoMedium text-gray-900 text-xl text-center">
              Fecha
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex-1 items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 font-robotoRegular mt-4">
                Cargando ventas...
              </p>
            </div>
          ) : error ? (
            <div className="flex-1 items-center justify-center py-20">
              <p className="text-red-500 font-robotoMedium">
                Error al cargar ventas
              </p>
              <p className="text-gray-400 font-robotoRegular text-sm mt-2">
                {error}
              </p>
            </div>
          ) : filteredVentas.length === 0 ? (
            <div className="flex-1 items-center justify-center py-20">
              <p className="text-gray-500 font-robotoRegular">
                No hay ventas disponibles
              </p>
              {searchText && (
                <p className="text-gray-400 font-robotoRegular text-sm mt-2">
                  No se encontraron resultados para "{searchText}"
                </p>
              )}
            </div>
          ) : (
            filteredVentas.map((venta, index) => (
              <div
                key={venta.id_venta}
                className={`flex border-b border-gray-300 ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-blue-50`}
              >
                <div className="w-16 py-4 px-3 border-r border-gray-300 flex items-center justify-center">
                  <span className="text-2xl">📄</span>
                </div>

                <div className="flex-[0.8] py-4 px-3 border-r border-gray-300 flex items-center justify-center">
                  <span className="text-gray-900 font-robotoRegular text-base text-center">
                    {(page - 1) * pageSize + index + 1}
                  </span>
                </div>

                <div className="flex-[1.5] py-4 px-3 border-r border-gray-300 flex items-center justify-center">
                  <span className="text-gray-900 font-robotoRegular text-base text-center">
                    {venta.id_orden || "—"}
                  </span>
                </div>

                <div className="flex-[1.2] py-4 px-3 border-r border-gray-300 flex items-center justify-center">
                  <span className="text-gray-900 font-robotoRegular text-base text-center">
                    {venta.id_folio || "—"}
                  </span>
                </div>

                <div className="flex-2 py-4 px-3 border-r border-gray-300 flex items-center justify-center">
                  <span
                    className="text-gray-900 font-robotoRegular text-base text-center truncate"
                    title={venta.cliente || ""}
                  >
                    {venta.cliente || "—"}
                  </span>
                </div>

                <div className="flex-[1.2] py-4 px-3 border-r border-gray-300 flex items-center justify-center">
                  <span className="text-gray-900 font-robotoRegular text-base text-center">
                    {formatCurrency(venta.precio)}
                  </span>
                </div>

                <div className="flex-[1.2] py-4 px-3 border-r border-gray-300 flex items-center justify-center">
                  <span className="text-gray-900 font-robotoRegular text-base text-center">
                    {formatCurrency(venta.costo)}
                  </span>
                </div>

                <div className="flex-[1.2] py-4 px-3 flex items-center justify-center">
                  <span className="text-gray-900 font-robotoRegular text-base text-center">
                    {formatDate(venta.fecha)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {!loading && !error && total > 0 && (
          <div className="flex-row items-center justify-between px-6 py-4 border-t border-gray-200">
            <span className="text-gray-600 font-robotoRegular">
              Mostrando {(page - 1) * pageSize + 1} -{" "}
              {Math.min(page * pageSize, total)} de {total} ventas
            </span>
            <div className="flex-row gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-4 py-2 rounded-lg ${page === 1 ? "bg-gray-200" : "bg-blue-600"}`}
              >
                <span
                  className={`font-robotoMedium ${page === 1 ? "text-gray-400" : "text-white"}`}
                >
                  Anterior
                </span>
              </button>
              <span className="px-4 py-2 font-robotoMedium text-gray-700">
                Página {page} de {Math.ceil(total / pageSize)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
                className={`px-4 py-2 rounded-lg ${page >= Math.ceil(total / pageSize) ? "bg-gray-200" : "bg-blue-600"}`}
              >
                <span
                  className={`font-robotoMedium ${page >= Math.ceil(total / pageSize) ? "text-gray-400" : "text-white"}`}
                >
                  Siguiente
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {WebView}
      <VentaModal
        visible={modalVisible}
        orden={selectedOrden}
        onClose={handleCloseModal}
        onSave={handleSaveOrden}
        mode={modalMode}
      />
    </>
  );
}