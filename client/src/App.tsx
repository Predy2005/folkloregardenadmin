import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "@/shared/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/shared/components/ui/toaster";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/shared/components/ui/sidebar";
import { ThemeProvider } from "@/shared/contexts/ThemeContext";
import { CurrencyProvider } from "@/shared/contexts/CurrencyContext";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import { AppSidebar } from "@/shared/components/AppSidebar";
import { HelpChatbot } from "@/shared/components/HelpChatbot";

// Auth module
import {
  AuthProvider,
  useAuth,
  LoginPage as Login,
  RegisterPage as Register,
  ForgotPasswordPage as ForgotPassword,
  ResetPasswordPage as ResetPassword
} from "@modules/auth";

// Routes
import { AuthenticatedRoutes } from "@/routes/AuthenticatedRoutes";

// Other
import NotFound from "@/pages/not-found";

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
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-background">
            <div className="container_muj mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
      <HelpChatbot />
    </SidebarProvider>
  );
}

function Router() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  // Public routes (bez autentizace)
  const publicRoutes = ['/login', '/register', '/forgot-password'];
  const isPublicRoute = publicRoutes.includes(location) || location.startsWith('/reset-password/');

  // Pokud je uživatel přihlášený a je na public route, přesměruj na dashboard
  if (isAuthenticated && isPublicRoute) {
    window.location.href = '/';
    return null;
  }

  const renderWithLayout = (children: React.ReactNode) => (
    <AuthenticatedLayout>{children}</AuthenticatedLayout>
  );

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />

      {/* Protected routes */}
      <AuthenticatedRoutes layout={renderWithLayout} />

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
          <CurrencyProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </CurrencyProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
