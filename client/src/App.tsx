import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Reservations from "@/pages/Reservations";
import Payments from "@/pages/Payments";
import Foods from "@/pages/Foods";
import Users from "@/pages/Users";
import DisabledDates from "@/pages/DisabledDates";
import StockItems from "@/pages/StockItems";
import Recipes from "@/pages/Recipes";
import StockMovements from "@/pages/StockMovements";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  // Public routes (bez autentizace)
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.includes(location);

  // Pokud je uživatel přihlášený a je na public route, přesměruj na dashboard
  if (isAuthenticated && isPublicRoute) {
    window.location.href = '/';
    return null;
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Dashboard />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/reservations">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Reservations />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/payments">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Payments />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/foods">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Foods />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/users">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Users />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/disabled-dates">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <DisabledDates />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/stock-items">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <StockItems />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/recipes">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Recipes />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/stock-movements">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <StockMovements />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
