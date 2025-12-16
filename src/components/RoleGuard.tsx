import { ReactNode } from 'react';
import { useRole } from '../hooks/useRole';
import type { UserRole } from '../lib/roles';

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requireSuperAdmin?: boolean;
  fallback?: ReactNode;
}

export function RoleGuard({
  children,
  requiredRole,
  requireSuperAdmin = false,
  fallback = null
}: RoleGuardProps) {
  const { hasPermission, isSuperAdmin, loading } = useRole();

  if (loading) {
    return null;
  }

  // Check if user has required permissions
  if (requireSuperAdmin && !isSuperAdmin) {
    return <>{fallback}</>;
  }

  if (requiredRole && !hasPermission(requiredRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
