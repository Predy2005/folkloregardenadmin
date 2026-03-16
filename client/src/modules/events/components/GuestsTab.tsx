import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import { useToggleSet } from "@/shared/hooks/useToggleSet";
import type { EventGuest } from "@shared/types";
import type { GuestGroup } from "../types";
import { useGuestSummary, invalidateGuestSummary } from "../hooks/useGuestSummary";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { Loader2, Plus, Users, RefreshCw, CheckSquare, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

import {
  GuestFormDialog,
  BulkActionDialog,
  GuestTable,
  BulkAddCard,
} from "./guests";
import type { BulkActionType } from "./guests";
import { GuestCommandCenter } from "./dashboard/guest-command";

export interface GuestsTabProps {
  eventId: number;
  eventType: string;
  guests: EventGuest[];
  isLoading: boolean;
}

export default function GuestsTab({ eventId, eventType, guests, isLoading }: GuestsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<EventGuest | null>(null);

  // Guest summary for GuestCommandCenter
  const { data: guestSummary } = useGuestSummary(eventId);

  // Collapsible state - all sections closed by default
  const openSections = useToggleSet<string>();

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Bulk action state
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<BulkActionType>(null);

  const isFolklorniShow = eventType === "folklorni_show";

  // Group guests by reservation
  const groupedGuests = useMemo(() => {
    const groups: Map<number | null, EventGuest[]> = new Map();

    guests.forEach(guest => {
      const key = guest.reservationId ?? null;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(guest);
    });

    const result: GuestGroup[] = [];

    // First add reservation groups (sorted by reservationId)
    const reservationKeys = Array.from(groups.keys())
      .filter(k => k !== null)
      .sort((a, b) => (a as number) - (b as number));

    for (const key of reservationKeys) {
      const groupGuests = groups.get(key)!;
      result.push({
        reservationId: key,
        guests: groupGuests,
        stats: {
          total: groupGuests.length,
          adults: groupGuests.filter(g => g.type === "adult").length,
          children: groupGuests.filter(g => g.type === "child").length,
          paid: groupGuests.filter(g => g.isPaid).length,
          present: groupGuests.filter(g => g.isPresent).length,
        },
      });
    }

    // Add manual guests group if exists
    if (groups.has(null)) {
      const manualGuests = groups.get(null)!;
      result.push({
        reservationId: null,
        guests: manualGuests,
        stats: {
          total: manualGuests.length,
          adults: manualGuests.filter(g => g.type === "adult").length,
          children: manualGuests.filter(g => g.type === "child").length,
          paid: manualGuests.filter(g => g.isPaid).length,
          present: manualGuests.filter(g => g.isPresent).length,
        },
      });
    }

    return result;
  }, [guests]);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
    invalidateGuestSummary(eventId);
  };

  const loadFromReservationsMutation = useMutation({
    mutationFn: async () => {
      return await api.post(`/api/events/${eventId}/guests/from-reservations`);
    },
    onSuccess: (data: any) => {
      invalidateQueries();
      successToast(`Načteno ${data.guestsCount} hostů z rezervací`);
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/events/${eventId}/guests/${id}`);
    },
    onSuccess: () => {
      invalidateQueries();
      successToast("Host byl smazán");
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const handleEdit = (guest: EventGuest) => {
    setEditingGuest(guest);
    setDialogOpen(true);
  };

  const handleOpenAddDialog = () => {
    setEditingGuest(null);
    setDialogOpen(true);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectGroup = (groupGuests: EventGuest[]) => {
    const allSelected = groupGuests.every(g => selectedIds.has(g.id));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      groupGuests.forEach(g => {
        if (allSelected) {
          newSet.delete(g.id);
        } else {
          newSet.add(g.id);
        }
      });
      return newSet;
    });
  };

  const openBulkAction = (action: BulkActionType) => {
    setBulkActionType(action);
    setBulkActionDialogOpen(true);
  };

  // Count statistics
  const stats = {
    total: guests.length,
    adults: guests.filter(g => g.type === "adult").length,
    children: guests.filter(g => g.type === "child").length,
    present: guests.filter(g => g.isPresent).length,
  };

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Seznam hostů</CardTitle>
          <Badge variant="secondary">{stats.total} celkem</Badge>
          {stats.adults > 0 && <Badge variant="outline">{stats.adults} dosp.</Badge>}
          {stats.children > 0 && <Badge variant="outline">{stats.children} dětí</Badge>}
          {stats.present > 0 && <Badge className="bg-green-600">{stats.present} přítomno</Badge>}
        </div>
        <div className="flex gap-2">
          {isFolklorniShow && (
            <Button
              variant="outline"
              onClick={() => loadFromReservationsMutation.mutate()}
              disabled={loadFromReservationsMutation.isPending}
            >
              {loadFromReservationsMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Obnovit z rezervací
            </Button>
          )}
          <Button onClick={handleOpenAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Přidat hosta
          </Button>
        </div>
      </div>

      {/* Bulk add section - only for non-folklorni_show */}
      {!isFolklorniShow && <BulkAddCard eventId={eventId} />}

      {/* Guest Command Center - rich view from dashboard */}
      {guestSummary && guestSummary.byReservation.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <GuestCommandCenter data={guestSummary} eventId={eventId} />
          </CardContent>
        </Card>
      )}

      {/* Selection actions bar */}
      {selectedIds.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="mr-2">
                <CheckSquare className="mr-1 h-3 w-3" />
                {selectedIds.size} vybráno
              </Badge>
              <Button size="sm" variant="outline" onClick={() => openBulkAction("nationality")}>
                Národnost
              </Button>
              <Button size="sm" variant="outline" onClick={() => openBulkAction("type")}>
                Typ
              </Button>
              <Button size="sm" variant="outline" onClick={() => openBulkAction("isPaid")}>
                Placení
              </Button>
              <Button size="sm" variant="outline" onClick={() => openBulkAction("isPresent")}>
                Přítomnost
              </Button>
              <Button size="sm" variant="destructive" onClick={() => openBulkAction("delete")}>
                <Trash2 className="mr-1 h-3 w-3" />
                Smazat
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                Zrušit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guest groups */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Načítání hostů...
            </div>
          </CardContent>
        </Card>
      ) : guests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {isFolklorniShow
              ? "Zatím žádní hosté. Klikněte na 'Obnovit z rezervací' pro načtení."
              : "Zatím žádní hosté. Použijte hromadné přidání nebo tlačítko 'Přidat hosta'."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {groupedGuests.map((group) => {
            const sectionKey = group.reservationId !== null ? `res-${group.reservationId}` : "manual";
            const isOpen = openSections.isOpen(sectionKey);

            return (
              <Collapsible
                key={sectionKey}
                open={isOpen}
                onOpenChange={() => openSections.toggle(sectionKey)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 transition-colors py-3 rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <CardTitle className="text-base font-medium">
                            {group.reservationId !== null
                              ? `Rezervace #${group.reservationId}`
                              : "Manuálně přidaní hosté"}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{group.stats.total} hostů</Badge>
                          {group.stats.adults > 0 && (
                            <Badge variant="outline" className="text-xs">{group.stats.adults} dosp.</Badge>
                          )}
                          {group.stats.children > 0 && (
                            <Badge variant="outline" className="text-xs">{group.stats.children} dětí</Badge>
                          )}
                          {group.stats.present > 0 && (
                            <Badge className="bg-green-600 text-xs">{group.stats.present} přít.</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 px-0">
                      <GuestTable
                        guests={group.guests}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                        onToggleSelectGroup={toggleSelectGroup}
                        onEdit={handleEdit}
                        onDelete={(id) => deleteMutation.mutate(id)}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Single guest dialog */}
      <GuestFormDialog
        eventId={eventId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingGuest={editingGuest}
      />

      {/* Bulk action dialog */}
      <BulkActionDialog
        eventId={eventId}
        open={bulkActionDialogOpen}
        onOpenChange={setBulkActionDialogOpen}
        selectedIds={selectedIds}
        actionType={bulkActionType}
        onSuccess={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
