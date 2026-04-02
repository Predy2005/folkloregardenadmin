import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "@/shared/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/shared/components/ui/toaster";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/shared/components/ui/sidebar";
import { ThemeProvider } from "@/shared/contexts/ThemeContext";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import { AppSidebar } from "@/shared/components/AppSidebar";
import { HelpChatbot } from "@/shared/components/HelpChatbot";

// Auth module
import {
  AuthProvider,
  useAuth,
  ProtectedRoute,
  LoginPage as Login,
  RegisterPage as Register,
  ProfilePage as Profile,
  ForgotPasswordPage as ForgotPassword,
  ResetPasswordPage as ResetPassword
} from "@modules/auth";

// Dashboard module
import { DashboardPage as Dashboard } from "@modules/dashboard";

// Reservations module
import { ReservationsPage as Reservations, ReservationEditPage as ReservationEdit } from "@modules/reservations";

// Events module
import { EventsPage as Events, EventCreatePage as EventCreate, EventEditPage as EventEdit, EventDashboardPage as EventDashboard, WaiterViewPage as WaiterView } from "@modules/events";

// Staff module
import { StaffMembersPage as StaffMembers, StaffEditPage as StaffEdit, StaffAttendancePage as StaffAttendance, StaffingFormulasPage as StaffingFormulas } from "@modules/staff";

// Contacts module
import { ContactsPage as Contacts, ContactEditPage as ContactEdit } from "@modules/contacts";

// Partners module
import { PartnersPage as Partners, PartnerEditPage as PartnerEdit, VouchersPage as Vouchers } from "@modules/partners";

// Payments module
import { PaymentsPage as Payments } from "@modules/payments";

// Invoices module
import { InvoicesPage as Invoices, InvoiceEditPage as InvoiceEdit } from "@modules/invoices";

// Cashbox module
import { CashboxPage as Cashbox, CommissionLogsPage as CommissionLogs } from "@modules/cashbox";

// Drinks module
import { DrinksPage as Drinks } from "@modules/drinks";

// Transport module
import { TransportCompaniesPage as TransportCompanies, TransportCompanyEditPage as TransportCompanyEdit } from "@modules/transport";

// Foods module
import { FoodsPage as Foods, FoodEditPage as FoodEdit } from "@modules/foods";

// Recipes module
import { RecipesPage as Recipes, RecipeEditPage as RecipeEdit } from "@modules/recipes";

// Stock module
import { StockItemsPage as StockItems, StockMovementsPage as StockMovements, StockRequirementsPage as StockRequirements, StockReceivingPage as StockReceiving } from "@modules/stock";

// Venue module
import { BuildingsPage as Buildings, FloorPlanTemplatesPage as FloorPlanTemplates, TemplateDesignerPage as TemplateDesigner } from "@modules/venue";

// Admin module
import { UsersPage as Users, RolesPage as Roles, SettingsPage as Settings, PricingPage as Pricing, DisabledDatesPage as DisabledDates, ReservationTypesPage as ReservationTypes, CashMovementCategoriesPage as CashCategories } from "@modules/admin";

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

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />

      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Dashboard />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/reservations/new">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <ReservationEdit />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/reservations/:id/edit">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <ReservationEdit />
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

      <Route path="/invoices">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Invoices />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/invoices/new">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <InvoiceEdit />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/invoices/:id/edit">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <InvoiceEdit />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Settings />
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

      <Route path="/foods/new">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <FoodEdit />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/foods/:id/edit">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <FoodEdit />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/contacts">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Contacts />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/contacts/:id/edit">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <ContactEdit />
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

      <Route path="/roles">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Roles />
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

      <Route path="/reservation-types">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <ReservationTypes />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/cash-categories">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <CashCategories />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/stock/receive">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <StockReceiving />
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

      <Route path="/recipes/new">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <RecipeEdit />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/recipes/:id/edit">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <RecipeEdit />
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

      <Route path="/stock-requirements">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <StockRequirements />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/drinks">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Drinks />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/transport/new">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <TransportCompanyEdit />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/transport/:id/edit">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <TransportCompanyEdit />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/transport">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <TransportCompanies />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/partners/new">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <PartnerEdit />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/partners/:id/edit">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <PartnerEdit />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/partners">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Partners />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/vouchers">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Vouchers />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/commission-logs">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <CommissionLogs />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/staff">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <StaffMembers />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/staff/new">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <StaffEdit />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/staff/:id/edit">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <StaffEdit />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/staff-attendance">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <StaffAttendance />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/cashbox">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Cashbox />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/events">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Events />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/events/new">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <EventCreate />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/events/:id/dashboard">
        <ProtectedRoute>
          <EventDashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/events/:id/edit">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <EventEdit />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/events/:id/waiter">
        <ProtectedRoute>
          <WaiterView />
        </ProtectedRoute>
      </Route>

      <Route path="/profile">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Profile />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/pricing">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Pricing />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/staffing-formulas">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <StaffingFormulas />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/venue/buildings">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Buildings />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/venue/templates">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <FloorPlanTemplates />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/venue/templates/:id/designer">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <TemplateDesigner />
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
