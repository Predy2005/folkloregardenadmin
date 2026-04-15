import { lazy, Suspense } from "react";
import { Route } from "wouter";
import { ProtectedRoute } from "@modules/auth";
import { Loader2 } from "lucide-react";

// Lazy loading wrapper
function LazyPage({ component: Component }: { component: React.LazyExoticComponent<React.ComponentType> }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <Component />
    </Suspense>
  );
}

// Lazy imports — each module loads only when navigated to
const Dashboard = lazy(() => import("@modules/dashboard/pages/DashboardPage"));
const Reservations = lazy(() => import("@modules/reservations/pages/ReservationsPage"));
const ReservationEdit = lazy(() => import("@modules/reservations/pages/ReservationEditPage"));
const ReservationImport = lazy(() => import("@modules/reservations/pages/ReservationImportPage"));
const Events = lazy(() => import("@modules/events/pages/EventsPage"));
const EventCreate = lazy(() => import("@modules/events/pages/EventCreatePage"));
const EventEdit = lazy(() => import("@modules/events/pages/EventEditPage"));
const EventDashboard = lazy(() => import("@modules/events/pages/EventDashboardPage"));
const WaiterView = lazy(() => import("@modules/events/pages/WaiterViewPage"));
const StaffMembers = lazy(() => import("@modules/staff/pages/StaffMembersPage"));
const StaffEdit = lazy(() => import("@modules/staff/pages/StaffEditPage"));
const StaffAttendance = lazy(() => import("@modules/staff/pages/StaffAttendancePage"));
const StaffingFormulas = lazy(() => import("@modules/staff/pages/StaffingFormulasPage"));
const Contacts = lazy(() => import("@modules/contacts/pages/ContactsPage"));
const ContactEdit = lazy(() => import("@modules/contacts/pages/ContactEditPage"));
const Partners = lazy(() => import("@modules/partners/pages/PartnersPage"));
const PartnerEdit = lazy(() => import("@modules/partners/pages/PartnerEditPage"));
const Vouchers = lazy(() => import("@modules/partners/pages/VouchersPage"));
const Payments = lazy(() => import("@modules/payments/pages/PaymentsPage"));
const Invoices = lazy(() => import("@modules/invoices/pages/InvoicesPage"));
const InvoiceEdit = lazy(() => import("@modules/invoices/pages/InvoiceEditPage"));
const Cashbox = lazy(() => import("@modules/cashbox/pages/CashboxPage"));
const CommissionLogs = lazy(() => import("@modules/cashbox/pages/CommissionLogsPage"));
const Drinks = lazy(() => import("@modules/drinks/pages/DrinksPage"));
const TransportCompanies = lazy(() => import("@modules/transport/pages/TransportCompaniesPage"));
const TransportCompanyEdit = lazy(() => import("@modules/transport/pages/TransportCompanyEditPage"));
const Foods = lazy(() => import("@modules/foods/pages/FoodsPage"));
const FoodEdit = lazy(() => import("@modules/foods/pages/FoodEditPage"));
const Recipes = lazy(() => import("@modules/recipes/pages/RecipesPage"));
const RecipeEdit = lazy(() => import("@modules/recipes/pages/RecipeEditPage"));
const StockItems = lazy(() => import("@modules/stock/pages/StockItemsPage"));
const StockMovements = lazy(() => import("@modules/stock/pages/StockMovementsPage"));
const StockRequirements = lazy(() => import("@modules/stock/pages/StockRequirementsPage"));
const StockReceiving = lazy(() => import("@modules/stock/pages/StockReceivingPage"));
const Buildings = lazy(() => import("@modules/venue/pages/BuildingsPage").then(m => ({ default: m.BuildingsPage })));
const FloorPlanTemplates = lazy(() => import("@modules/venue/pages/FloorPlanTemplatesPage").then(m => ({ default: m.FloorPlanTemplatesPage })));
const TemplateDesigner = lazy(() => import("@modules/venue/pages/TemplateDesignerPage").then(m => ({ default: m.TemplateDesignerPage })));
const Users = lazy(() => import("@modules/admin/pages/UsersPage"));
const Roles = lazy(() => import("@modules/admin/pages/RolesPage"));
const Settings = lazy(() => import("@modules/admin/pages/SettingsPage"));
const Pricing = lazy(() => import("@modules/admin/pages/PricingPage"));
const DisabledDates = lazy(() => import("@modules/admin/pages/DisabledDatesPage"));
const ReservationTypes = lazy(() => import("@modules/admin/pages/ReservationTypesPage"));
const CashCategories = lazy(() => import("@modules/admin/pages/CashMovementCategoriesPage"));
const Profile = lazy(() => import("@modules/auth/pages/ProfilePage"));

interface AuthenticatedRoutesProps {
  layout: (children: React.ReactNode) => React.ReactNode;
}

export function AuthenticatedRoutes({ layout }: AuthenticatedRoutesProps) {
  const P = ({ component: C }: { component: React.LazyExoticComponent<React.ComponentType> }) => (
    <ProtectedRoute>{layout(<LazyPage component={C} />)}</ProtectedRoute>
  );
  const PNoLayout = ({ component: C }: { component: React.LazyExoticComponent<React.ComponentType> }) => (
    <ProtectedRoute><LazyPage component={C} /></ProtectedRoute>
  );

  return (
    <>
      <Route path="/"><P component={Dashboard} /></Route>

      {/* Reservations */}
      <Route path="/reservations/import"><P component={ReservationImport} /></Route>
      <Route path="/reservations/new"><P component={ReservationEdit} /></Route>
      <Route path="/reservations/:id/edit"><P component={ReservationEdit} /></Route>
      <Route path="/reservations"><P component={Reservations} /></Route>

      {/* Payments & Invoices */}
      <Route path="/payments"><P component={Payments} /></Route>
      <Route path="/invoices"><P component={Invoices} /></Route>
      <Route path="/invoices/new"><P component={InvoiceEdit} /></Route>
      <Route path="/invoices/:id/edit"><P component={InvoiceEdit} /></Route>

      {/* Events */}
      <Route path="/events"><P component={Events} /></Route>
      <Route path="/events/new"><P component={EventCreate} /></Route>
      <Route path="/events/:id/dashboard"><PNoLayout component={EventDashboard} /></Route>
      <Route path="/events/:id/edit"><P component={EventEdit} /></Route>
      <Route path="/events/:id/waiter"><PNoLayout component={WaiterView} /></Route>

      {/* Staff */}
      <Route path="/staff"><P component={StaffMembers} /></Route>
      <Route path="/staff/new"><P component={StaffEdit} /></Route>
      <Route path="/staff/:id/edit"><P component={StaffEdit} /></Route>
      <Route path="/staff-attendance"><P component={StaffAttendance} /></Route>
      <Route path="/staffing-formulas"><P component={StaffingFormulas} /></Route>

      {/* Contacts & Partners */}
      <Route path="/contacts"><P component={Contacts} /></Route>
      <Route path="/contacts/:id/edit"><P component={ContactEdit} /></Route>
      <Route path="/partners"><P component={Partners} /></Route>
      <Route path="/partners/new"><P component={PartnerEdit} /></Route>
      <Route path="/partners/:id/edit"><P component={PartnerEdit} /></Route>
      <Route path="/vouchers"><P component={Vouchers} /></Route>
      <Route path="/commission-logs"><P component={CommissionLogs} /></Route>

      {/* Cashbox */}
      <Route path="/cashbox"><P component={Cashbox} /></Route>

      {/* Foods & Drinks & Recipes */}
      <Route path="/foods"><P component={Foods} /></Route>
      <Route path="/foods/new"><P component={FoodEdit} /></Route>
      <Route path="/foods/:id/edit"><P component={FoodEdit} /></Route>
      <Route path="/drinks"><P component={Drinks} /></Route>
      <Route path="/recipes"><P component={Recipes} /></Route>
      <Route path="/recipes/new"><P component={RecipeEdit} /></Route>
      <Route path="/recipes/:id/edit"><P component={RecipeEdit} /></Route>

      {/* Stock */}
      <Route path="/stock-items"><P component={StockItems} /></Route>
      <Route path="/stock-movements"><P component={StockMovements} /></Route>
      <Route path="/stock-requirements"><P component={StockRequirements} /></Route>
      <Route path="/stock/receive"><P component={StockReceiving} /></Route>

      {/* Transport */}
      <Route path="/transport"><P component={TransportCompanies} /></Route>
      <Route path="/transport/new"><P component={TransportCompanyEdit} /></Route>
      <Route path="/transport/:id/edit"><P component={TransportCompanyEdit} /></Route>

      {/* Venue */}
      <Route path="/venue/buildings"><P component={Buildings} /></Route>
      <Route path="/venue/templates"><P component={FloorPlanTemplates} /></Route>
      <Route path="/venue/templates/:id/designer"><P component={TemplateDesigner} /></Route>

      {/* Admin */}
      <Route path="/settings"><P component={Settings} /></Route>
      <Route path="/pricing"><P component={Pricing} /></Route>
      <Route path="/users"><P component={Users} /></Route>
      <Route path="/roles"><P component={Roles} /></Route>
      <Route path="/disabled-dates"><P component={DisabledDates} /></Route>
      <Route path="/reservation-types"><P component={ReservationTypes} /></Route>
      <Route path="/cash-categories"><P component={CashCategories} /></Route>

      {/* Profile */}
      <Route path="/profile"><P component={Profile} /></Route>
    </>
  );
}
