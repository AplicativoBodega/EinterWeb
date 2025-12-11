import { useState, useRef, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useDarkMode } from '../context/DarkModeContext'

interface NavbarProps {
  onNavigateToProfile: () => void
}

export function Navbar({ onNavigateToProfile }: NavbarProps) {
  const { user, logout } = useAuth0()
  const { darkMode } = useDarkMode()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  const [notifications] = useState([
    { id: 1, message: 'Nuevo producto agregado', timestamp: '5 min' },
    { id: 2, message: 'Pedido completado', timestamp: '2 horas' },
    { id: 3, message: 'Stock bajo en Ubicación A', timestamp: '1 día' },
  ])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 h-16 z-40 shadow-lg ${
        darkMode
          ? 'bg-gray-900 border-b border-gray-800'
          : 'bg-white border-b border-gray-200'
      }`}
    >
      <div className="h-full px-6 flex items-center justify-between">
        <div className="w-24" />

        <div className="flex-1 text-center">
          <h1
            className={`text-3xl font-bold tracking-wider ${
              darkMode ? 'text-blue-400' : 'text-blue-600'
            }`}
          >
            EINTER
          </h1>
        </div>

        <div className="w-24 flex items-center justify-end gap-4">
          {/* Notifications */}
          <div ref={notificationsRef} className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowProfileMenu(false)
              }}
              className={`p-2 rounded-lg transition-all relative ${
                darkMode
                  ? 'hover:bg-gray-800 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Notificaciones"
            >
              <span className="text-xl">🔔</span>
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                className={`absolute right-0 mt-2 w-80 rounded-lg shadow-xl ${
                  darkMode
                    ? 'bg-gray-800 border border-gray-700'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div
                  className={`p-4 border-b ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}
                >
                  <h3
                    className={`font-semibold text-lg ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    Notificaciones
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 border-b cursor-pointer transition-all hover:bg-opacity-50 ${
                          darkMode
                            ? 'border-gray-700 hover:bg-gray-700'
                            : 'border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        <p
                          className={`text-sm font-medium ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          {notif.message}
                        </p>
                        <p
                          className={`text-xs mt-1 ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          {notif.timestamp}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div
                      className={`p-4 text-center text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      No hay notificaciones
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div ref={profileMenuRef} className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu)
                setShowNotifications(false)
              }}
              className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                darkMode
                  ? 'hover:bg-gray-800 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Perfil"
            >
              <img
                src={
                  user?.picture ||
                  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 110 110'%3E%3Ccircle cx='55' cy='55' r='55' fill='%2363b3ed'/%3E%3Cpath d='M55 50c8.28 0 15-6.72 15-15s-6.72-15-15-15-15 6.72-15 15 6.72 15 15 15zm0 7.5c-10 0-30 5.02-30 15v3.75c0 2.07 1.68 3.75 3.75 3.75h52.5c2.07 0 3.75-1.68 3.75-3.75V72.5c0-9.98-20-15-30-15z' fill='%23fff'/%3E%3C/svg%3E`
                }
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover"
              />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div
                className={`absolute right-0 mt-2 w-64 rounded-lg shadow-xl ${
                  darkMode
                    ? 'bg-gray-800 border border-gray-700'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {/* User Info Section */}
                <div
                  className={`p-4 border-b ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        user?.picture ||
                        `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 110 110'%3E%3Ccircle cx='55' cy='55' r='55' fill='%2363b3ed'/%3E%3Cpath d='M55 50c8.28 0 15-6.72 15-15s-6.72-15-15-15-15 6.72-15 15 6.72 15 15 15zm0 7.5c-10 0-30 5.02-30 15v3.75c0 2.07 1.68 3.75 3.75 3.75h52.5c2.07 0 3.75-1.68 3.75-3.75V72.5c0-9.98-20-15-30-15z' fill='%23fff'/%3E%3C/svg%3E`
                      }
                      alt={user?.name || 'User'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-semibold truncate ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {user?.name || 'Usuario'}
                      </p>
                      <p
                        className={`text-xs truncate ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        {user?.email || 'email@example.com'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div>
                  <button
                    onClick={() => {
                      onNavigateToProfile()
                      setShowProfileMenu(false)
                    }}
                    className={`w-full text-left px-4 py-3 transition-all flex items-center gap-3 ${
                      darkMode
                        ? 'hover:bg-gray-700 text-gray-200'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="text-lg">👤</span>
                    <span className="font-medium">Ver Perfil</span>
                  </button>

                  <button
                    className={`w-full text-left px-4 py-3 transition-all flex items-center gap-3 ${
                      darkMode
                        ? 'hover:bg-gray-700 text-gray-200'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="text-lg">🔐</span>
                    <span className="font-medium">Cambiar Contraseña</span>
                  </button>

                  <div
                    className={`border-t ${
                      darkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}
                  >
                    <button
                      onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                      className={`w-full text-left px-4 py-3 transition-all flex items-center gap-3 ${
                        darkMode
                          ? 'hover:bg-red-900 hover:bg-opacity-30 text-red-400'
                          : 'hover:bg-red-50 text-red-600'
                      }`}
                    >
                      <span className="text-lg">🚪</span>
                      <span className="font-medium">Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
