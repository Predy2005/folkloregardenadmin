import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ArrowLeft, Loader2, RefreshCw, Users } from "lucide-react";
import { api } from "@/shared/lib/api";
import {
  WaiterFloorPlan,
  WaiterTableList,
  WaiterTimeline,
  WaiterViewSwitcher,
  type WaiterViewData,
  type WaiterViewMode,
} from "../components/waiter";

export default function WaiterViewPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/events/:id/waiter");
  const [viewMode, setViewMode] = useState<WaiterViewMode>("tables");

  const eventId = params?.id ? parseInt(params.id) : null;

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<WaiterViewData>({
    queryKey: ["/api/events", eventId, "waiter-view"],
    queryFn: async () => api.get<WaiterViewData>(`/api/events/${eventId}/waiter-view`),
    enabled: !!eventId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  if (!eventId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Chyba</CardTitle>
          </CardHeader>
          <CardContent>
            <p>ID události nebylo nalezeno</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Chyba načítání</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Nepodařilo se načíst data události.</p>
            <Button onClick={() => refetch()}>Zkusit znovu</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { event, tables, unassignedGuests, schedule, menuSummary, nationalityDistribution } = data;

  const handleTableClick = (tableId: number) => {
    // Could open a detail modal or navigate
    console.log("Table clicked:", tableId);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header - fixed */}
      <header className="flex-shrink-0 bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/events/${eventId}/edit`)}
              className="touch-manipulation"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-lg truncate max-w-[200px] sm:max-w-none">
                {event.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {new Date(event.eventDate).toLocaleDateString("cs-CZ")} • {event.eventTime}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm">
              <Users className="h-4 w-4" />
              <span className="font-medium">{event.guestsTotal}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              className="touch-manipulation"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* View Switcher */}
      <div className="flex-shrink-0 px-4 py-3 bg-white border-b">
        <WaiterViewSwitcher activeMode={viewMode} onModeChange={setViewMode} />
      </div>

      {/* Content - scrollable */}
      <main className="flex-1 overflow-hidden">
        {viewMode === "floor" && (
          <WaiterFloorPlan
            tables={tables}
            unassignedGuests={unassignedGuests}
            nationalityDistribution={nationalityDistribution}
            onTableClick={handleTableClick}
          />
        )}
        {viewMode === "tables" && (
          <WaiterTableList
            tables={tables}
            unassignedGuests={unassignedGuests}
            onTableClick={handleTableClick}
          />
        )}
        {viewMode === "timeline" && (
          <WaiterTimeline
            event={event}
            schedule={schedule}
            menuSummary={menuSummary}
          />
        )}
      </main>

      {/* Footer info bar */}
      <footer className="flex-shrink-0 bg-white border-t px-4 py-2 text-center text-xs text-muted-foreground">
        Automatická aktualizace každých 30s • Poslední: {new Date().toLocaleTimeString("cs-CZ")}
      </footer>
    </div>
  );
}
