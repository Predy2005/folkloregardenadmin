import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type {
  Event,
  EventBeverage,
  EventGuest,
  EventMenu,
  EventScheduleItem,
  EventStaffAssignment,
  EventTable,
  EventVoucher,
  StaffMember,
} from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ArrowLeft, LayoutDashboard, Loader2 } from "lucide-react";
import { api } from "@/shared/lib/api";

// Extracted tab components
import BasicInfoTab from "../components/BasicInfoTab";
import GuestsTab from "../components/GuestsTab";
import { MenuTab, BeveragesTab, ScheduleTab, TablesTab, StaffTab, VouchersTab, FinanceTab } from "../components/tabs";
import { TransportTab } from "../components/tabs/TransportTab";

// Notes & floating action bar
import { EventNotesProvider } from "../contexts/EventNotesContext";
import FloatingActionBar from "../components/FloatingActionBar";

export default function EventEdit() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/events/:id/edit");
  const [activeTab, setActiveTab] = useState("basic");

  const eventId = params?.id ? parseInt(params.id) : null;

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    queryFn: async () => api.get<Event>(`/api/events/${eventId}`),
    enabled: !!eventId,
  });

  const { data: guests, isLoading: guestsLoading } = useQuery<EventGuest[]>({
    queryKey: ["/api/events", eventId, "guests"],
    queryFn: async () => api.get(`/api/events/${eventId}/guests`),
    enabled: !!eventId && activeTab === "guests",
  });

  const { data: menu, isLoading: menuLoading } = useQuery<EventMenu[]>({
    queryKey: ["/api/events", eventId, "menu"],
    queryFn: () => api.get(`/api/events/${eventId}/menu`),
    enabled: !!eventId && activeTab === "menu",
  });

  const { data: beverages, isLoading: beveragesLoading } = useQuery<EventBeverage[]>({
    queryKey: ["/api/events", eventId, "beverages"],
    queryFn: () => api.get(`/api/events/${eventId}/beverages`),
    enabled: !!eventId && activeTab === "beverages",
  });

  const { data: schedule, isLoading: scheduleLoading } = useQuery<EventScheduleItem[]>({
    queryKey: ["/api/events", eventId, "schedule"],
    queryFn: () => api.get(`/api/events/${eventId}/schedule`),
    enabled: !!eventId && activeTab === "schedule",
  });

  const { data: tables, isLoading: tablesLoading } = useQuery<EventTable[]>({
    queryKey: ["/api/events", eventId, "tables"],
    queryFn: () => api.get(`/api/events/${eventId}/tables`),
    enabled: !!eventId && activeTab === "tables",
  });

  const { data: staffAssignments, isLoading: staffLoading } = useQuery<EventStaffAssignment[]>({
    queryKey: ["/api/events", eventId, "staff-assignments"],
    queryFn: () => api.get(`/api/events/${eventId}/staff-assignments`),
    enabled: !!eventId && activeTab === "staff",
  });

  const { data: eventVouchers, isLoading: vouchersLoading } = useQuery<EventVoucher[]>({
    queryKey: ["/api/events", eventId, "vouchers"],
    queryFn: () => api.get(`/api/events/${eventId}/vouchers`),
    enabled: !!eventId && activeTab === "vouchers",
  });

  const { data: staffMembers } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
    queryFn: async () => api.get("/api/staff"),
  });

  if (!eventId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Chyba</CardTitle>
            <CardDescription>ID události nebylo nalezeno</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Událost nenalezena</CardTitle>
            <CardDescription>Událost s ID {eventId} neexistuje</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <EventNotesProvider
      eventId={eventId}
      initialNotes={{
        notesInternal: event.notesInternal || "",
        notesStaff: event.notesStaff || "",
        specialRequirements: event.specialRequirements || "",
      }}
    >
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/events")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <PageHeader
              title={event.name || "Událost"}
              description="Úprava údajů události"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation(`/events/${eventId}/dashboard`)}
            data-testid="button-dashboard"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </div>

        <FloatingActionBar />

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Editace události</CardTitle>
              <CardDescription>{event.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-9" data-testid="tabs-list">
                  <TabsTrigger value="basic" data-testid="tab-trigger-basic">
                    Základní
                  </TabsTrigger>
                  <TabsTrigger value="guests" data-testid="tab-trigger-guests">
                    Hosté
                  </TabsTrigger>
                  <TabsTrigger value="menu" data-testid="tab-trigger-menu">
                    Menu
                  </TabsTrigger>
                  <TabsTrigger value="beverages" data-testid="tab-trigger-beverages">
                    Nápoje
                  </TabsTrigger>
                  <TabsTrigger value="schedule" data-testid="tab-trigger-schedule">
                    Harmonogram
                  </TabsTrigger>
                  <TabsTrigger value="tables" data-testid="tab-trigger-tables">
                    Plánek stolů
                  </TabsTrigger>
                  <TabsTrigger value="staff" data-testid="tab-trigger-staff">
                    Personál
                  </TabsTrigger>
                  <TabsTrigger value="finance" data-testid="tab-trigger-finance">
                    Finance
                  </TabsTrigger>
                  <TabsTrigger value="transport" data-testid="tab-trigger-transport">
                    Doprava
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="mt-6">
                  <BasicInfoTab event={event} eventId={eventId} />
                </TabsContent>

                <TabsContent value="guests" className="mt-6">
                  <GuestsTab
                    eventId={eventId}
                    eventType={event.eventType}
                    guests={guests || []}
                    isLoading={guestsLoading}
                  />
                </TabsContent>

                <TabsContent value="menu" className="mt-6">
                  <MenuTab
                    eventId={eventId}
                    eventType={event.eventType}
                    menu={menu || []}
                    isLoading={menuLoading}
                  />
                </TabsContent>

                <TabsContent value="beverages" className="mt-6">
                  <BeveragesTab
                    eventId={eventId}
                    beverages={beverages || []}
                    isLoading={beveragesLoading}
                  />
                </TabsContent>

                <TabsContent value="schedule" className="mt-6">
                  <ScheduleTab
                    eventId={eventId}
                    schedule={schedule || []}
                    isLoading={scheduleLoading}
                  />
                </TabsContent>

                <TabsContent value="tables" className="mt-6">
                  <TablesTab
                    eventId={eventId}
                    tables={tables || []}
                    isLoading={tablesLoading}
                  />
                </TabsContent>

                <TabsContent value="staff" className="mt-6">
                  <StaffTab
                    eventId={eventId}
                    staffAssignments={staffAssignments || []}
                    staffMembers={staffMembers || []}
                    isLoading={staffLoading}
                    eventDurationMinutes={event?.durationMinutes || 0}
                  />
                </TabsContent>

                <TabsContent value="finance" className="mt-6">
                  <FinanceTab eventId={eventId} />
                </TabsContent>

                <TabsContent value="vouchers" className="mt-6">
                  <VouchersTab
                    eventId={eventId}
                    vouchers={eventVouchers || []}
                    isLoading={vouchersLoading}
                  />
                </TabsContent>

                <TabsContent value="transport" className="mt-6">
                  <TransportTab eventId={eventId} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

        </div>
      </div>
    </EventNotesProvider>
  );
}
