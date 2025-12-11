import { useAuth0 } from "@auth0/auth0-react";
import LoginButton from "../components/LoginButton";

export const Login = () => {
  const { isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="loading-text text-xl text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-lg shadow-2xl p-12 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block bg-indigo-600 text-white rounded-lg p-4 mb-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h10m4-6V9m0 6v-3m0 3v3m0-9V9" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Einter</h1>
          <p className="text-gray-600">Sistema de Gestión de Bodega</p>
        </div>

        <div className="space-y-4">
          <LoginButton />
          <p className="text-center text-gray-500 text-sm">
            Inicia sesión con tu cuenta para continuar
          </p>
        </div>
      </div>
    </div>
  );
};
