export function Home() {
  const DashboardContent = () => (
    <div className="bg-gray-50 p-6">
      <div className="justify-center items-start">
        <div className="w-3/4 max-w-md">
          <h1 className="text-4xl mb-6 text-center">Print List</h1>
          <div className="flex-row justify-between items-center mt-4 border outline-1 rounded-lg p-4">
            <h2 className="text-xl">List item</h2>
            <button className="bg-red-500 px-2 py-2 rounded">
              <span className="text-white font-medium">Delete</span>
            </button>
          </div>
          <button 
            className="mt-4 border border-blue-500 rounded-lg p-4 bg-blue-50"
            onClick={() => {
              window.print();
            }}
          >
            <span className="text-3xl text-center text-blue-600 font-medium">
              Print
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return <DashboardContent />;
};