import { type ReactNode } from 'react';
import { useAuth } from '@modules/auth';

interface RequirePermissionProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions.
 *
 * Usage:
 * - Single permission: <RequirePermission permission="reservations.read">...</RequirePermission>
 * - Any of permissions: <RequirePermission permissions={['reservations.read', 'events.read']}>...</RequirePermission>
 * - All permissions: <RequirePermission permissions={['reservations.read', 'reservations.update']} requireAll>...</RequirePermission>
 */
export function RequirePermission({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null
}: RequirePermissionProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } = useAuth();

  // Super admin always has access
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  } else {
    // No permission specified - allow access
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

interface RequireRoleProps {
  children: ReactNode;
  role: string;
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on user role.
 */
export function RequireRole({ children, role, fallback = null }: RequireRoleProps) {
  const { hasRole, isSuperAdmin } = useAuth();

  if (isSuperAdmin || hasRole(role)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface RequireSuperAdminProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders for super admins.
 */
export function RequireSuperAdmin({ children, fallback = null }: RequireSuperAdminProps) {
  const { isSuperAdmin } = useAuth();

  return isSuperAdmin ? <>{children}</> : <>{fallback}</>;
}
