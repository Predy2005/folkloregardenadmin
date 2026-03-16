import { useAuth } from '@modules/auth';

// Permission keys for modules
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_READ: 'dashboard.read',

  // Reservations
  RESERVATIONS_READ: 'reservations.read',
  RESERVATIONS_CREATE: 'reservations.create',
  RESERVATIONS_UPDATE: 'reservations.update',
  RESERVATIONS_DELETE: 'reservations.delete',
  RESERVATIONS_SEND_EMAIL: 'reservations.send_email',

  // Payments
  PAYMENTS_READ: 'payments.read',
  PAYMENTS_CREATE: 'payments.create',
  PAYMENTS_UPDATE: 'payments.update',

  // Contacts
  CONTACTS_READ: 'contacts.read',
  CONTACTS_CREATE: 'contacts.create',
  CONTACTS_UPDATE: 'contacts.update',
  CONTACTS_DELETE: 'contacts.delete',

  // Foods
  FOODS_READ: 'foods.read',
  FOODS_CREATE: 'foods.create',
  FOODS_UPDATE: 'foods.update',
  FOODS_DELETE: 'foods.delete',

  // Food Pricing
  FOOD_PRICING_READ: 'food_pricing.read',
  FOOD_PRICING_CREATE: 'food_pricing.create',
  FOOD_PRICING_UPDATE: 'food_pricing.update',
  FOOD_PRICING_DELETE: 'food_pricing.delete',

  // Pricing
  PRICING_READ: 'pricing.read',
  PRICING_UPDATE: 'pricing.update',

  // Events
  EVENTS_READ: 'events.read',
  EVENTS_CREATE: 'events.create',
  EVENTS_UPDATE: 'events.update',
  EVENTS_DELETE: 'events.delete',

  // Users
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  // Permissions
  PERMISSIONS_READ: 'permissions.read',
  PERMISSIONS_UPDATE: 'permissions.update',

  // Staff
  STAFF_READ: 'staff.read',
  STAFF_CREATE: 'staff.create',
  STAFF_UPDATE: 'staff.update',
  STAFF_DELETE: 'staff.delete',

  // Staff Attendance
  STAFF_ATTENDANCE_READ: 'staff_attendance.read',
  STAFF_ATTENDANCE_CREATE: 'staff_attendance.create',
  STAFF_ATTENDANCE_UPDATE: 'staff_attendance.update',

  // Staffing Formulas
  STAFFING_FORMULAS_READ: 'staffing_formulas.read',
  STAFFING_FORMULAS_UPDATE: 'staffing_formulas.update',

  // Stock Items
  STOCK_ITEMS_READ: 'stock_items.read',
  STOCK_ITEMS_CREATE: 'stock_items.create',
  STOCK_ITEMS_UPDATE: 'stock_items.update',
  STOCK_ITEMS_DELETE: 'stock_items.delete',

  // Recipes
  RECIPES_READ: 'recipes.read',
  RECIPES_CREATE: 'recipes.create',
  RECIPES_UPDATE: 'recipes.update',
  RECIPES_DELETE: 'recipes.delete',

  // Stock Movements
  STOCK_MOVEMENTS_READ: 'stock_movements.read',
  STOCK_MOVEMENTS_CREATE: 'stock_movements.create',

  // Partners
  PARTNERS_READ: 'partners.read',
  PARTNERS_CREATE: 'partners.create',
  PARTNERS_UPDATE: 'partners.update',
  PARTNERS_DELETE: 'partners.delete',

  // Vouchers
  VOUCHERS_READ: 'vouchers.read',
  VOUCHERS_CREATE: 'vouchers.create',
  VOUCHERS_UPDATE: 'vouchers.update',
  VOUCHERS_DELETE: 'vouchers.delete',
  VOUCHERS_REDEEM: 'vouchers.redeem',

  // Commissions
  COMMISSIONS_READ: 'commissions.read',
  COMMISSIONS_UPDATE: 'commissions.update',

  // Cashbox
  CASHBOX_READ: 'cashbox.read',
  CASHBOX_CREATE: 'cashbox.create',
  CASHBOX_UPDATE: 'cashbox.update',
  CASHBOX_DELETE: 'cashbox.delete',
  CASHBOX_CLOSE: 'cashbox.close',
  CASHBOX_REOPEN: 'cashbox.reopen',

  // Disabled Dates
  DISABLED_DATES_READ: 'disabled_dates.read',
  DISABLED_DATES_CREATE: 'disabled_dates.create',
  DISABLED_DATES_UPDATE: 'disabled_dates.update',
  DISABLED_DATES_DELETE: 'disabled_dates.delete',

  // Reservation Types
  RESERVATION_TYPES_READ: 'reservation_types.read',
  RESERVATION_TYPES_CREATE: 'reservation_types.create',
  RESERVATION_TYPES_UPDATE: 'reservation_types.update',
  RESERVATION_TYPES_DELETE: 'reservation_types.delete',
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export function usePermissions() {
  const { user, hasPermission, hasAnyPermission, hasAllPermissions, hasRole, isSuperAdmin } = useAuth();

  return {
    user,
    isSuperAdmin,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,

    // Convenience methods for common permission checks
    canRead: (module: string) => hasPermission(`${module}.read`),
    canCreate: (module: string) => hasPermission(`${module}.create`),
    canUpdate: (module: string) => hasPermission(`${module}.update`),
    canDelete: (module: string) => hasPermission(`${module}.delete`),

    // Module-specific helpers
    canManageUsers: () => hasAnyPermission(['users.read', 'users.create', 'users.update', 'users.delete']),
    canManagePermissions: () => hasAnyPermission(['permissions.read', 'permissions.update']),
    canManageReservations: () => hasAnyPermission(['reservations.read', 'reservations.create', 'reservations.update']),
    canManageEvents: () => hasAnyPermission(['events.read', 'events.create', 'events.update']),
    canManageStaff: () => hasAnyPermission(['staff.read', 'staff.create', 'staff.update']),
    canManageCashbox: () => hasAnyPermission(['cashbox.read', 'cashbox.create', 'cashbox.close']),
    canManageStock: () => hasAnyPermission(['stock_items.read', 'stock_movements.read']),
    canManagePartners: () => hasAnyPermission(['partners.read', 'vouchers.read', 'commissions.read']),
  };
}
