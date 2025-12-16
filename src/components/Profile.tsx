import { useAuth } from "../context/AuthContext";
import { useDarkMode } from '../context/DarkModeContext'

const Profile = () => {
  const { user, loading } = useAuth();
  const { darkMode } = useDarkMode();

  if (loading) {
    return <div className="loading-text">Loading profile...</div>;
  }

  return (
    user ? (
      <div className={`flex flex-col items-center gap-4 p-8 rounded-lg transition-colors ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <img
          src={user.photoURL || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='110' viewBox='0 0 110 110'%3E%3Ccircle cx='55' cy='55' r='55' fill='%2363b3ed'/%3E%3Cpath d='M55 50c8.28 0 15-6.72 15-15s-6.72-15-15-15-15 6.72-15 15 6.72 15 15 15zm0 7.5c-10 0-30 5.02-30 15v3.75c0 2.07 1.68 3.75 3.75 3.75h52.5c2.07 0 3.75-1.68 3.75-3.75V72.5c0-9.98-20-15-30-15z' fill='%23fff'/%3E%3C/svg%3E`}
          alt={user.displayName || 'User'}
          className="profile-picture w-28 h-28 rounded-full object-cover border-4 border-blue-400"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='110' viewBox='0 0 110 110'%3E%3Ccircle cx='55' cy='55' r='55' fill='%2363b3ed'/%3E%3Cpath d='M55 50c8.28 0 15-6.72 15-15s-6.72-15-15-15-15 6.72-15 15 6.72 15 15 15zm0 7.5c-10 0-30 5.02-30 15v3.75c0 2.07 1.68 3.75 3.75 3.75h52.5c2.07 0 3.75-1.68 3.75-3.75V72.5c0-9.98-20-15-30-15z' fill='%23fff'/%3E%3C/svg%3E`;
          }}
        />
        <div className="text-center">
          <div className="profile-name text-2xl font-semibold text-blue-600 dark:text-blue-400 mb-2">
            {user.displayName || 'Usuario'}
          </div>
          <div className="profile-email text-lg text-blue-500 dark:text-blue-300">
            {user.email}
          </div>
        </div>
      </div>
    ) : null
  );
};

export default Profile;