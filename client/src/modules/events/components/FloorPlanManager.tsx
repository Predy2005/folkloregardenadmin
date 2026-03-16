import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { Event, EventTable, EventGuest, Reservation } from "@shared/types";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import dayjs from "dayjs";

import { FloorPlanCanvas, FloorPlanToolbar, TableEditorDialog } from "./floor-plan";
import type { TableForm } from "./floor-plan";

interface FloorPlanManagerProps {
  event: Event;
  reservations?: Reservation[];
}

export default function FloorPlanManager({ event, reservations }: FloorPlanManagerProps) {
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<EventTable | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Event['space']>("roubenka");
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);
  const [localTables, setLocalTables] = useState<EventTable[]>([]);
  const [localGuests, setLocalGuests] = useState<EventGuest[]>([]);
  const [nationalityFilter, setNationalityFilter] = useState<string>("all");

  // Hydrate state from event prop whenever it changes
  useEffect(() => {
    if (!event) return;

    // Load tables
    const tables = event.tables || [];
    setLocalTables(tables);

    // Load all guests from all tables (flatten nested structure)
    const allGuests: EventGuest[] = [];
    
    // Add assigned guests from tables
    tables.forEach(table => {
      if (table.guests && table.guests.length > 0) {
        table.guests.forEach(guest => {
          allGuests.push({
            ...guest,
            eventTableId: table.id, // Ensure eventTableId is set
          });
        });
      }
    });

    // Add unassigned guests from event level (if backend returns them)
    if ((event as any).guests && Array.isArray((event as any).guests)) {
      (event as any).guests.forEach((guest: EventGuest) => {
        allGuests.push({
          ...guest,
          eventTableId: undefined, // Explicitly mark as unassigned
        });
      });
    }

    setLocalGuests(allGuests);
  }, [event]); // Re-run when event changes (includes refetched data)

  // Import hostů z rezervací na daný den
  const handleImportGuests = () => {
    if (!reservations) return;

    const eventDate = dayjs(event.date).format("YYYY-MM-DD");
    const dayReservations = reservations.filter(
      r => dayjs(r.date).format("YYYY-MM-DD") === eventDate
    );

    const importedGuests: EventGuest[] = [];
    let guestId = localGuests.length > 0 ? Math.max(...localGuests.map(g => g.id)) + 1 : 1;

    dayReservations.forEach((reservation) => {
      if (!reservation.persons || reservation.persons.length === 0) {
        // Pokud rezervace nemá persons, vytvoříme 1 hosta z contact údajů
        importedGuests.push({
          id: guestId++,
          name: reservation.contactName,
          type: 'adult',
          nationality: reservation.contactNationality,
          isPresent: false,
          isPaid: reservation.status === 'PAID',
          reservationId: reservation.id,
        });
      } else {
        // Vytvoříme hosta pro každou osobu
        reservation.persons.forEach((person, index) => {
          importedGuests.push({
            id: guestId++,
            name: `${reservation.contactName} - Osoba ${index + 1}`,
            type: person.type === 'infant' ? 'child' : person.type,
            nationality: reservation.contactNationality,
            isPresent: false,
            isPaid: reservation.status === 'PAID',
            reservationId: reservation.id,
            personIndex: index,
          });
        });
      }
    });

    setLocalGuests([...localGuests, ...importedGuests]);
    successToast(`Importováno ${importedGuests.length} hostů z ${dayReservations.length} rezervací`);
  };

  // Přidání/editace stolu
  const handleSaveTable = (data: TableForm) => {
    if (editingTable) {
      setLocalTables(localTables.map(t => 
        t.id === editingTable.id 
          ? { ...t, ...data, guests: t.guests }
          : t
      ));
      successToast("Stůl upraven");
    } else {
      const newTable: EventTable = {
        id: localTables.length > 0 ? Math.max(...localTables.map(t => t.id)) + 1 : 1,
        eventId: event.id,
        ...data,
        guests: [],
      };
      setLocalTables([...localTables, newTable]);
      successToast("Stůl přidán");
    }
    setIsTableDialogOpen(false);
    setEditingTable(null);
  };

  // Smazání stolu
  const handleDeleteTable = (tableId: number) => {
    const table = localTables.find(t => t.id === tableId);
    if (!table) return;

    // Přesunout hosty zpět do unassigned
    const tableGuests = localGuests.filter(g => g.eventTableId === tableId);
    const updatedGuests = localGuests.map(g => 
      g.eventTableId === tableId ? { ...g, eventTableId: undefined } : g
    );

    setLocalGuests(updatedGuests);
    setLocalTables(localTables.filter(t => t.id !== tableId));
    successToast(`Stůl smazán, ${tableGuests.length} hostů přesunuto zpět`);
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveGuestId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveGuestId(null);

    if (!over) return;

    const guestId = parseInt((active.id as string).replace('guest-', ''));
    const targetId = over.id as string;

    // Determine destination table ID
    let destinationTableId: number | undefined = undefined;

    if (targetId.startsWith('table-')) {
      // Dropped directly on table container
      destinationTableId = parseInt(targetId.replace('table-', ''));
    } else if (targetId.startsWith('guest-')) {
      // Dropped on another guest - find that guest's table
      const targetGuestId = parseInt(targetId.replace('guest-', ''));
      const targetGuest = localGuests.find(g => g.id === targetGuestId);
      destinationTableId = targetGuest?.eventTableId;
    } else if (targetId === 'unassigned') {
      // Explicitly dropped in unassigned area
      destinationTableId = undefined;
    }

    // Update guest's table assignment
    setLocalGuests(localGuests.map(g => 
      g.id === guestId ? { ...g, eventTableId: destinationTableId } : g
    ));

    if (destinationTableId !== undefined) {
      successToast("Host přesunut ke stolu");
    } else {
      successToast("Host odstraněn ze stolu");
    }
  };

  // Remove guest from table (back to unassigned)
  const handleRemoveGuestFromTable = (guestId: number) => {
    setLocalGuests(localGuests.map(g =>
      g.id === guestId ? { ...g, eventTableId: undefined } : g
    ));
  };

  // Remove guest entirely
  const handleRemoveGuestEntirely = (guestId: number) => {
    setLocalGuests(localGuests.filter(g => g.id !== guestId));
  };

  // Open add table dialog for a specific room
  const handleOpenAddTable = (room: string) => {
    setEditingTable(null);
    setIsTableDialogOpen(true);
  };

  // Open edit table dialog
  const handleEditTable = (table: EventTable) => {
    setEditingTable(table);
    setIsTableDialogOpen(true);
  };

  // Cancel table dialog
  const handleCancelTableDialog = () => {
    setIsTableDialogOpen(false);
    setEditingTable(null);
  };

  // Uložení celého floor planu
  const saveFloorPlanMutation = useMutation({
    mutationFn: async () => {
      // Připravíme data s nested tables a guests
      const updatedEvent = {
        ...event,
        tables: localTables.map(table => ({
          ...table,
          guests: localGuests.filter(g => g.eventTableId === table.id),
        })),
        // Include unassigned guests at event level
        guests: localGuests.filter(g => !g.eventTableId),
      };
      return await api.put(`/api/events/${event.id}`, updatedEvent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      successToast("Plánek stolů byl uložen");
    },
    onError: () => {
      errorToast("Nepodařilo se uložit plánek stolů");
    },
  });

  // Filtrované hosté podle národnosti
  const unassignedGuests = localGuests.filter(g => !g.eventTableId);
  const filteredUnassignedGuests = nationalityFilter === "all"
    ? unassignedGuests
    : unassignedGuests.filter(g => g.nationality === nationalityFilter);

  const uniqueNationalities = Array.from(new Set(unassignedGuests.map(g => g.nationality).filter(Boolean))) as string[];

  // Computed vs manual count
  const computedPaidCount = localGuests.filter(g => g.isPaid).length;
  const computedFreeCount = localGuests.filter(g => !g.isPaid).length;
  const totalComputed = computedPaidCount + computedFreeCount;
  const totalManual = event.paidCount + event.freeCount;

  return (
    <div className="space-y-4">
      {/* Header s tlačítky */}
      <FloorPlanToolbar
        totalComputed={totalComputed}
        totalManual={totalManual}
        paidCount={event.paidCount}
        freeCount={event.freeCount}
        onImportGuests={handleImportGuests}
        onSave={() => saveFloorPlanMutation.mutate()}
        isSaving={saveFloorPlanMutation.isPending}
      />

      {/* Tabs pro místnosti + DnD canvas */}
      <FloorPlanCanvas
        selectedRoom={selectedRoom}
        onSelectedRoomChange={setSelectedRoom}
        localTables={localTables}
        localGuests={localGuests}
        filteredUnassignedGuests={filteredUnassignedGuests}
        nationalityFilter={nationalityFilter}
        onNationalityFilterChange={setNationalityFilter}
        uniqueNationalities={uniqueNationalities}
        onOpenAddTable={handleOpenAddTable}
        onEditTable={handleEditTable}
        onDeleteTable={handleDeleteTable}
        onRemoveGuestFromTable={handleRemoveGuestFromTable}
        onRemoveGuestEntirely={handleRemoveGuestEntirely}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        activeGuestId={activeGuestId}
      />

      {/* Table Management Dialog */}
      <TableEditorDialog
        open={isTableDialogOpen}
        onOpenChange={setIsTableDialogOpen}
        editingTable={editingTable}
        defaultRoom={selectedRoom}
        onSave={handleSaveTable}
        onCancel={handleCancelTableDialog}
      />
    </div>
  );
}
