// Auth module barrel export

// Contexts
export { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
export { ProtectedRoute } from './components/ProtectedRoute';
export { RequirePermission, RequireRole, RequireSuperAdmin } from './components/RequirePermission';

// Hooks
export { usePermissions, PERMISSIONS } from './hooks/use-permissions';

// Pages
export { default as LoginPage } from './pages/LoginPage';
export { default as RegisterPage } from './pages/RegisterPage';
export { default as ProfilePage } from './pages/ProfilePage';
