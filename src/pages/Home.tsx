export function Home() {
  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen overflow-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <h1 className="text-3xl font-bold tracking-wide text-gray-900 dark:text-white">
          Inicio
        </h1>
      </div>

      {/* Main content */}
      <div className="mx-8 mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-light text-gray-600 dark:text-gray-400 mb-4">
              Bienvenido a Bodega
            </h2>
            <p className="text-base text-gray-500 dark:text-gray-500 leading-relaxed">
              Selecciona una opción del menú lateral para comenzar a gestionar tu inventario.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};