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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/shared/lib/api";

// Extracted tab components
import BasicInfoTab from "../components/BasicInfoTab";
import GuestsTab from "../components/GuestsTab";
import { MenuTab, BeveragesTab, ScheduleTab, TablesTab, StaffTab, VouchersTab } from "../components/tabs";

// Notes panel
import { EventNotesProvider } from "../contexts/EventNotesContext";
import FloatingNotesPanel from "../components/FloatingNotesPanel";

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
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/menu`);
      if (!res.ok) throw new Error("Failed to fetch menu");
      return res.json();
    },
    enabled: !!eventId && activeTab === "menu",
  });

  const { data: beverages, isLoading: beveragesLoading } = useQuery<EventBeverage[]>({
    queryKey: ["/api/events", eventId, "beverages"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/beverages`);
      if (!res.ok) throw new Error("Failed to fetch beverages");
      return res.json();
    },
    enabled: !!eventId && activeTab === "beverages",
  });

  const { data: schedule, isLoading: scheduleLoading } = useQuery<EventScheduleItem[]>({
    queryKey: ["/api/events", eventId, "schedule"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/schedule`);
      if (!res.ok) throw new Error("Failed to fetch schedule");
      return res.json();
    },
    enabled: !!eventId && activeTab === "schedule",
  });

  const { data: tables, isLoading: tablesLoading } = useQuery<EventTable[]>({
    queryKey: ["/api/events", eventId, "tables"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/tables`);
      if (!res.ok) throw new Error("Failed to fetch tables");
      return res.json();
    },
    enabled: !!eventId && activeTab === "tables",
  });

  const { data: staffAssignments, isLoading: staffLoading } = useQuery<EventStaffAssignment[]>({
    queryKey: ["/api/events", eventId, "staff-assignments"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/staff-assignments`);
      if (!res.ok) throw new Error("Failed to fetch staff assignments");
      return res.json();
    },
    enabled: !!eventId && activeTab === "staff",
  });

  const { data: eventVouchers, isLoading: vouchersLoading } = useQuery<EventVoucher[]>({
    queryKey: ["/api/events", eventId, "vouchers"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/vouchers`);
      if (!res.ok) throw new Error("Failed to fetch vouchers");
      return res.json();
    },
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
          <Button
            variant="ghost"
            onClick={() => setLocation("/events")}
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na seznam
          </Button>
        </div>

        <div className="flex gap-6">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Editace události</CardTitle>
              <CardDescription>{event.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-8" data-testid="tabs-list">
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
                    Stoly
                  </TabsTrigger>
                  <TabsTrigger value="staff" data-testid="tab-trigger-staff">
                    Personál
                  </TabsTrigger>
                  <TabsTrigger value="vouchers" data-testid="tab-trigger-vouchers">
                    Vouchery
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
                  />
                </TabsContent>

                <TabsContent value="vouchers" className="mt-6">
                  <VouchersTab
                    eventId={eventId}
                    vouchers={eventVouchers || []}
                    isLoading={vouchersLoading}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <FloatingNotesPanel />
        </div>
      </div>
    </EventNotesProvider>
  );
}
