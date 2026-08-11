// Placeholder shown in place of a page/section that is not ready yet.
interface UnderConstructionProps {
  title?: string;
  message?: string;
}

export function UnderConstruction({
  title = "En desarrollo",
  message = "Esta sección está en construcción. Vuelve pronto.",
}: UnderConstructionProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 px-6 text-center">
      <span className="text-6xl mb-4" role="img" aria-label="En construcción">
        🚧
      </span>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-md">{message}</p>
    </div>
  );
}
