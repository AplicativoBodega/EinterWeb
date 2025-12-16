import { useAuth } from '../context/AuthContext';
import { hasPermission, isSuperAdmin } from '../lib/roles';
import type { UserRole } from '../lib/roles';

export function useRole() {
  const { userRole, userData, loading } = useAuth();

  return {
    role: userRole,
    userData,
    loading,
    isSuperAdmin: userRole ? isSuperAdmin(userRole) : false,
    hasPermission: (requiredRole: UserRole) => {
      if (!userRole) return false;
      return hasPermission(userRole, requiredRole);
    },
    isRole: (role: UserRole) => userRole === role
  };
}
