import { useParams, useLocation } from "wouter";
import { useEventDashboard } from "../hooks/useEventDashboard";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { GuestOverviewCard } from "../components/dashboard/GuestOverviewCard";
import { StaffPlanningCard } from "../components/dashboard/StaffPlanningCard";
import { ExpenseTrackerCard } from "../components/dashboard/ExpenseTrackerCard";
import { SettlementCard } from "../components/dashboard/SettlementCard";
import { QuickActionsBar } from "../components/dashboard/QuickActionsBar";
import { Loader2 } from "lucide-react";

export default function EventDashboardPage() {
  const params = useParams<{ id: string }>();
  const eventId = Number(params.id);
  const [, navigate] = useLocation();

  const { data, isLoading, error, refetch, dataUpdatedAt } = useEventDashboard(eventId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive text-lg">Nepodařilo se načíst data dashboardu</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-white rounded-lg touch-manipulation"
        >
          Zkusit znovu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <DashboardHeader
        event={data.event}
        stats={data.stats}
        onRefresh={refetch}
        lastUpdated={dataUpdatedAt}
        onBack={() => navigate("/events")}
        onEditDetail={() => navigate(`/events/${eventId}/edit`)}
      />

      {/* Main Content - Responsive Grid */}
      <div className="p-4 space-y-4">
        {/* Top Row - Guests and Staff */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GuestOverviewCard
            guestsBySpace={data.guestsBySpace}
            totalPaid={data.event.guestsPaid}
            totalFree={data.event.guestsFree}
          />
          <StaffPlanningCard
            staffing={data.staffing}
            eventId={eventId}
          />
        </div>

        {/* Expenses and Settlement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ExpenseTrackerCard
            financials={data.financials}
            eventId={eventId}
          />
          <SettlementCard
            settlement={data.financials.settlement}
            cashbox={data.financials.cashbox}
          />
        </div>
      </div>

      {/* Floating Quick Actions Bar */}
      <QuickActionsBar
        eventId={eventId}
        onNavigateToEdit={() => navigate(`/events/${eventId}/edit`)}
      />
    </div>
  );
}
