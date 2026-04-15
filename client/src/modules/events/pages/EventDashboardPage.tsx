import { useParams, useLocation } from "wouter";
import { useEventDashboard, useGuestSummary } from "../hooks";
import {
  DashboardHeader,
  GuestCommandCenter,
  StaffPlanningCard,
  ExpenseTrackerCard,
  SettlementCard,
  TransportCard,
  QuickActionsBar,
  StockRequirementsCard,
  DashboardFloorPlan,
} from "../components/dashboard";
import {
  DashboardLayoutProvider,
  DashboardGrid,
} from "../components/dashboard/layout";
import {
  Loader2,
  Users,
  UserCheck,
  Wallet,
  HandCoins,
  Bus,
  Package,
  LayoutGrid,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { InfoTooltip } from "@/shared/components/ui/info-tooltip";
import { cn } from "@/shared/lib/utils";
import type { ReactNode } from "react";

export default function EventDashboardPage() {
  const params = useParams<{ id: string }>();
  const eventId = Number(params.id);
  const [, navigate] = useLocation();

  // Main dashboard data
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
    dataUpdatedAt,
  } = useEventDashboard(eventId);

  // Guest summary - single source of truth for guest data
  const {
    data: guestData,
    isLoading: isGuestLoading,
    error: guestError,
  } = useGuestSummary(eventId);

  const isLoading = isDashboardLoading || isGuestLoading;
  const error = dashboardError || guestError;

  const handleRefresh = () => {
    refetchDashboard();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive text-lg">Nepodařilo se načíst data dashboardu</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-primary text-white rounded-lg touch-manipulation"
        >
          Zkusit znovu
        </button>
      </div>
    );
  }

  // Define box configurations for the grid
  // Note: Guest Command Center combines stats + check-in + spaces into one box
  const boxConfigs: Array<{
    id: string;
    title: string;
    icon: ReactNode;
    badge?: ReactNode;
    render: () => ReactNode;
  }> = [
    {
      id: "guests",
      title: "Hosté",
      icon: <Users className="h-4 w-4" />,
      badge: guestData ? (
        <InfoTooltip
          content={
            <div className="space-y-2">
              <div>
                <span className="font-medium">Celkem hostů:</span> {guestData.types.total}
              </div>
              <div>
                <span className="font-medium">Přítomno:</span> {guestData.presence.present} z {guestData.presence.total} ({guestData.presence.percentage}%)
              </div>
              <div className="text-xs text-muted-foreground pt-1 border-t">
                Platících: {guestData.types.paying} | Zdarma: {guestData.types.free}
              </div>
            </div>
          }
        >
          <Badge variant="secondary" className="text-xs font-bold gap-1 cursor-help">
            {guestData.types.total}
            <span className={cn(
              "text-[10px]",
              guestData.presence.percentage >= 80 ? "text-green-600" :
              guestData.presence.percentage >= 50 ? "text-yellow-600" : "text-muted-foreground"
            )}>
              ({guestData.presence.present}/{guestData.presence.total})
            </span>
          </Badge>
        </InfoTooltip>
      ) : null,
      render: () =>
        guestData ? (
          <GuestCommandCenter data={guestData} eventId={eventId} />
        ) : (
          <div className="h-48 bg-muted rounded-lg animate-pulse" />
        ),
    },
    {
      id: "floor-plan",
      title: "Plánek stolů",
      icon: <LayoutGrid className="h-4 w-4" />,
      render: () => <DashboardFloorPlan eventId={eventId} />,
    },
    {
      id: "staff-planning",
      title: "Plánování personálu",
      icon: <UserCheck className="h-4 w-4" />,
      render: () => (
        <StaffPlanningCard staffing={dashboardData.staffing} eventId={eventId} />
      ),
    },
    {
      id: "transport",
      title: "Doprava",
      icon: <Bus className="h-4 w-4" />,
      badge: (
        <Badge variant="secondary" className="text-xs">
          {dashboardData.transport.totalReservations} rez.
        </Badge>
      ),
      render: () => <TransportCard transport={dashboardData.transport} eventId={eventId} />,
    },
    {
      id: "stock",
      title: "Sklad",
      icon: <Package className="h-4 w-4" />,
      render: () => <StockRequirementsCard eventId={eventId} />,
    },
    {
      id: "expenses",
      title: "Výdaje",
      icon: <Wallet className="h-4 w-4" />,
      render: () => (
        <ExpenseTrackerCard financials={dashboardData.financials} eventId={eventId} pendingTransfers={dashboardData.pendingTransfers} />
      ),
    },
    {
      id: "settlement",
      title: "Vyúčtování",
      icon: <HandCoins className="h-4 w-4" />,
      render: () => (
        <SettlementCard
          settlement={dashboardData.financials.settlement}
          cashbox={dashboardData.financials.cashbox}
          eventId={eventId}
        />
      ),
    },
  ];

  return (
    <DashboardLayoutProvider eventId={eventId}>
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <DashboardHeader
          event={dashboardData.event}
          stats={dashboardData.stats}
          onRefresh={handleRefresh}
          lastUpdated={dataUpdatedAt}
          onBack={() => navigate("/events")}
          onEditDetail={() => navigate(`/events/${eventId}/edit`)}
        />

        {/* Main Content - Draggable Grid */}
        <div className="p-4">
          <DashboardGrid boxes={boxConfigs} />
        </div>

        {/* Floating Quick Actions Bar */}
        <QuickActionsBar
          eventId={eventId}
          eventDate={dashboardData.event.eventDate}
          onNavigateToEdit={() => navigate(`/events/${eventId}/edit`)}
        />
      </div>
    </DashboardLayoutProvider>
  );
}
