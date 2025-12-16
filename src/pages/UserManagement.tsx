import { useState, useEffect } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { api } from '../lib/api';
import type { BackendUserData } from '../lib/api';
import { USER_ROLES, ROLE_LABELS } from '../lib/roles';
import type { UserRole } from '../lib/roles';

export function UserManagement() {
  const { darkMode } = useDarkMode();
  const [users, setUsers] = useState<BackendUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const allUsers = await api.getAllUsers();
      setUsers(allUsers);
    } catch (error: any) {
      console.error('Error loading users:', error);
      setError(error.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (uid: string) => {
    if (!selectedRole) return;

    try {
      await api.updateUserRole(uid, selectedRole);
      await loadUsers();
      setEditingUserId(null);
      setSelectedRole('');
    } catch (error: any) {
      console.error('Error updating role:', error);
      alert(error.message || 'Error al actualizar el rol del usuario');
    }
  };

  const handleToggleActive = async (uid: string, currentStatus: boolean) => {
    try {
      await api.toggleUserActive(uid, !currentStatus);
      await loadUsers();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      alert(error.message || 'Error al cambiar el estado del usuario');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case USER_ROLES.SUPERADMIN:
        return 'bg-purple-500 text-white';
      case USER_ROLES.OWNER:
        return 'bg-red-500 text-white';
      case USER_ROLES.ADMIN:
        return 'bg-blue-500 text-white';
      case USER_ROLES.SECRETARIA:
        return 'bg-pink-500 text-white';
      case USER_ROLES.TRABAJADOR:
        return 'bg-green-500 text-white';
      case USER_ROLES.EMPLEADO:
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  return (
    <div className={`min-h-screen p-6 transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Gesti�n de Usuarios
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Administra roles y permisos de usuarios
          </p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por email o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-4 py-3 rounded-lg border transition-colors ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
            <button
              onClick={loadUsers}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Cargando usuarios...</p>
          </div>
        ) : !error ? (
          <div className={`rounded-lg shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Usuario
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Email
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Rol
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Estado
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredUsers.map((user) => (
                    <tr key={user.uid} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={user.photoURL || 'https://via.placeholder.com/40'}
                            alt={user.displayName || 'User'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="ml-4">
                            <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {user.displayName || 'Sin nombre'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUserId === user.uid ? (
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                            className={`px-3 py-1 rounded-md border ${
                              darkMode
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            <option value="">Seleccionar rol...</option>
                            {Object.entries(USER_ROLES).map(([key, value]) => (
                              <option key={key} value={value}>
                                {ROLE_LABELS[value]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                            {ROLE_LABELS[user.role]}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingUserId === user.uid ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRoleUpdate(user.uid)}
                              disabled={!selectedRole}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => {
                                setEditingUserId(null);
                                setSelectedRole('');
                              }}
                              className={`px-3 py-1 rounded ${
                                darkMode
                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingUserId(user.uid);
                                setSelectedRole(user.role);
                              }}
                              className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                              Cambiar Rol
                            </button>
                            <button
                              onClick={() => handleToggleActive(user.uid, user.isActive)}
                              className={`px-3 py-1 rounded ${
                                user.isActive
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {user.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  No se encontraron usuarios
                </p>
              </div>
            )}
          </div>
        ) : null}

        <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
          <h3 className={`font-semibold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>
            Jerarqu�a de Roles
          </h3>
          <ul className={`text-sm space-y-1 ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
            <li>" <strong>Super Administrador:</strong> Acceso total al sistema</li>
            <li>" <strong>Propietario:</strong> Control completo de la organizaci�n</li>
            <li>" <strong>Administrador:</strong> Gesti�n avanzada del sistema</li>
            <li>" <strong>Secretaria:</strong> Gesti�n de documentos y registros</li>
            <li>" <strong>Trabajador:</strong> Acceso operativo</li>
            <li>" <strong>Empleado:</strong> Acceso b�sico</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
