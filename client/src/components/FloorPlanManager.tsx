import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import type { Event, EventTable, EventGuest, Reservation, ReservationPerson } from "@shared/types";
import { EVENT_SPACE_LABELS } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, GripVertical, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, useSensor, useSensors, PointerSensor, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import dayjs from "dayjs";

const tableSchema = z.object({
  tableName: z.string().min(1, "Zadejte název stolu"),
  room: z.enum(["roubenka", "terasa", "stodolka", "cely_areal"], {
    required_error: "Vyberte místnost",
  }),
  capacity: z.coerce.number().min(1, "Kapacita musí být alespoň 1"),
});

type TableForm = z.infer<typeof tableSchema>;

interface FloorPlanManagerProps {
  event: Event;
  reservations?: Reservation[];
}

// DroppableTableArea - ensures tables are droppable even when empty
interface DroppableTableAreaProps {
  tableId: number;
  children: React.ReactNode;
}

function DroppableTableArea({ tableId, children }: DroppableTableAreaProps) {
  const { setNodeRef } = useDroppable({
    id: `table-${tableId}`,
  });

  return (
    <div ref={setNodeRef} className="space-y-1 min-h-[40px]">
      {children}
    </div>
  );
}

// DroppableUnassignedArea - ensures unassigned roster is droppable even when empty
interface DroppableUnassignedAreaProps {
  children: React.ReactNode;
}

function DroppableUnassignedArea({ children }: DroppableUnassignedAreaProps) {
  const { setNodeRef } = useDroppable({
    id: 'unassigned',
  });

  return (
    <div ref={setNodeRef} className="space-y-2 max-h-[500px] overflow-y-auto min-h-[100px]">
      {children}
    </div>
  );
}

interface DraggableGuestCardProps {
  guest: EventGuest;
  onRemove: () => void;
}

function DraggableGuestCard({ guest, onRemove }: DraggableGuestCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `guest-${guest.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-background border rounded-md hover-elevate"
      data-testid={`guest-card-${guest.id}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{guest.name}</div>
        <div className="text-xs text-muted-foreground">
          {guest.type === 'adult' ? 'Dospělý' : 'Dítě'}
          {guest.nationality && ` • ${guest.nationality}`}
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={onRemove}
        className="h-6 w-6"
        data-testid={`button-remove-guest-${guest.id}`}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

export default function FloorPlanManager({ event, reservations }: FloorPlanManagerProps) {
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<EventTable | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Event['space']>("roubenka");
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);
  const [localTables, setLocalTables] = useState<EventTable[]>([]);
  const [localGuests, setLocalGuests] = useState<EventGuest[]>([]);
  const [nationalityFilter, setNationalityFilter] = useState<string>("all");
  const { toast } = useToast();

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const tableForm = useForm<TableForm>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      tableName: "",
      room: selectedRoom,
      capacity: 10,
    },
  });

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
    toast({
      title: "Úspěch",
      description: `Importováno ${importedGuests.length} hostů z ${dayReservations.length} rezervací`,
    });
  };

  // Přidání/editace stolu
  const handleSaveTable = (data: TableForm) => {
    if (editingTable) {
      setLocalTables(localTables.map(t => 
        t.id === editingTable.id 
          ? { ...t, ...data, guests: t.guests }
          : t
      ));
      toast({ title: "Stůl upraven" });
    } else {
      const newTable: EventTable = {
        id: localTables.length > 0 ? Math.max(...localTables.map(t => t.id)) + 1 : 1,
        eventId: event.id,
        ...data,
        guests: [],
      };
      setLocalTables([...localTables, newTable]);
      toast({ title: "Stůl přidán" });
    }
    setIsTableDialogOpen(false);
    setEditingTable(null);
    tableForm.reset();
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
    toast({ title: "Stůl smazán", description: `${tableGuests.length} hostů přesunuto zpět` });
  };

  // Drag and drop handler
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
      toast({ title: "Host přesunut ke stolu" });
    } else {
      toast({ title: "Host odstraněn ze stolu" });
    }
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
      toast({
        title: "Úspěch",
        description: "Plánek stolů byl uložen",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit plánek stolů",
        variant: "destructive",
      });
    },
  });

  // Filtrované hosté podle národnosti
  const unassignedGuests = localGuests.filter(g => !g.eventTableId);
  const filteredUnassignedGuests = nationalityFilter === "all"
    ? unassignedGuests
    : unassignedGuests.filter(g => g.nationality === nationalityFilter);

  const uniqueNationalities = Array.from(new Set(unassignedGuests.map(g => g.nationality).filter(Boolean)));

  // Computed vs manual count
  const computedPaidCount = localGuests.filter(g => g.isPaid).length;
  const computedFreeCount = localGuests.filter(g => !g.isPaid).length;
  const totalComputed = computedPaidCount + computedFreeCount;
  const totalManual = event.paidCount + event.freeCount;

  return (
    <div className="space-y-4">
      {/* Header s tlačítky */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold">Správa plánku stolů</h3>
          <div className="text-sm text-muted-foreground flex items-center gap-4">
            <span>
              Celkem hostů: <strong>{totalComputed}</strong>
            </span>
            {totalComputed !== totalManual && (
              <Badge variant="outline" className="text-xs">
                Manuální korekce: {totalManual} ({event.paidCount} platících + {event.freeCount} zdarma)
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleImportGuests}
            data-testid="button-import-guests"
          >
            <Users className="w-4 h-4 mr-2" />
            Importovat hosty z rezervací
          </Button>
          <Button
            size="sm"
            onClick={() => saveFloorPlanMutation.mutate()}
            disabled={saveFloorPlanMutation.isPending}
            className="bg-gradient-to-r from-primary to-purple-600"
            data-testid="button-save-floorplan"
          >
            {saveFloorPlanMutation.isPending ? "Ukládání..." : "Uložit plánek"}
          </Button>
        </div>
      </div>

      {/* Tabs pro místnosti */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Tabs value={selectedRoom} onValueChange={(v) => setSelectedRoom(v as Event['space'])} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="roubenka">Roubenka</TabsTrigger>
            <TabsTrigger value="terasa">Terasa</TabsTrigger>
            <TabsTrigger value="stodolka">Stodolka</TabsTrigger>
            <TabsTrigger value="cely_areal">Celý areál</TabsTrigger>
          </TabsList>

          {(['roubenka', 'terasa', 'stodolka', 'cely_areal'] as const).map((room) => (
            <TabsContent key={room} value={room} className="mt-4">
              <div className="flex gap-4">
                {/* Floor Plan Canvas - stoly */}
                <div className="flex-1 border rounded-md p-4 min-h-[500px] bg-muted/20">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">
                      Místnost: {EVENT_SPACE_LABELS[room]}
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        tableForm.setValue('room', room);
                        setIsTableDialogOpen(true);
                      }}
                      data-testid={`button-add-table-${room}`}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Přidat stůl
                    </Button>
                  </div>

                  {/* Grid zobrazení stolů */}
                  <div className="grid grid-cols-4 gap-3">
                    {localTables
                      .filter(table => table.room === room)
                      .map((table) => {
                        const tableGuests = localGuests.filter(g => g.eventTableId === table.id);
                        return (
                          <SortableContext
                            key={table.id}
                            id={`table-${table.id}`}
                            items={tableGuests.map(g => `guest-${g.id}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            <Card
                              className="hover-elevate cursor-pointer"
                              data-testid={`table-${table.id}`}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-sm font-semibold">{table.tableName}</div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() => {
                                        setEditingTable(table);
                                        tableForm.reset(table);
                                        setIsTableDialogOpen(true);
                                      }}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6"
                                      onClick={() => handleDeleteTable(table.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground mb-2">
                                  {tableGuests.length} / {table.capacity} hostů
                                </div>
                                <DroppableTableArea tableId={table.id}>
                                  {tableGuests.map((guest) => (
                                    <DraggableGuestCard
                                      key={guest.id}
                                      guest={guest}
                                      onRemove={() => {
                                        setLocalGuests(localGuests.map(g =>
                                          g.id === guest.id ? { ...g, eventTableId: undefined } : g
                                        ));
                                      }}
                                    />
                                  ))}
                                </DroppableTableArea>
                              </CardContent>
                            </Card>
                          </SortableContext>
                        );
                      })}
                  </div>

                  {!localTables.some(t => t.room === room) && (
                    <div className="text-center py-12 text-muted-foreground">
                      V této místnosti zatím nejsou žádné stoly
                    </div>
                  )}
                </div>

                {/* Guest Roster - nepřiřazení hosté */}
                <div className="w-80 border rounded-md p-4" id="unassigned">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Nepřiřazení hosté ({filteredUnassignedGuests.length})</h4>
                    {uniqueNationalities.length > 0 && (
                      <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
                        <SelectTrigger className="w-28 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Vše</SelectItem>
                          {uniqueNationalities.map(nat => (
                            <SelectItem key={nat} value={nat!}>{nat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    Přetáhněte hosty ke stolům
                  </div>
                  <SortableContext
                    id="unassigned"
                    items={filteredUnassignedGuests.map(g => `guest-${g.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableUnassignedArea>
                      {filteredUnassignedGuests.map((guest) => (
                        <DraggableGuestCard
                          key={guest.id}
                          guest={guest}
                          onRemove={() => {
                            setLocalGuests(localGuests.filter(g => g.id !== guest.id));
                          }}
                        />
                      ))}
                      {filteredUnassignedGuests.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          {nationalityFilter === "all"
                            ? "Zatím žádní nepřiřazení hosté"
                            : "Žádní hosté s touto národností"}
                        </div>
                      )}
                    </DroppableUnassignedArea>
                  </SortableContext>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <DragOverlay>
          {activeGuestId && (() => {
            const guest = localGuests.find(g => `guest-${g.id}` === activeGuestId);
            return guest ? (
              <div className="p-2 bg-background border rounded-md shadow-lg">
                <div className="text-sm font-medium">{guest.name}</div>
              </div>
            ) : null;
          })()}
        </DragOverlay>
      </DndContext>

      {/* Table Management Dialog */}
      <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? "Upravit stůl" : "Nový stůl"}</DialogTitle>
            <DialogDescription>
              Zadejte informace o stolu
            </DialogDescription>
          </DialogHeader>
          <Form {...tableForm}>
            <form onSubmit={tableForm.handleSubmit(handleSaveTable)} className="space-y-4">
              <FormField
                control={tableForm.control}
                name="tableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název stolu *</FormLabel>
                    <FormControl>
                      <Input placeholder="Stůl 1" {...field} data-testid="input-table-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={tableForm.control}
                name="room"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Místnost *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-table-room">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="roubenka">Roubenka</SelectItem>
                        <SelectItem value="terasa">Terasa</SelectItem>
                        <SelectItem value="stodolka">Stodolka</SelectItem>
                        <SelectItem value="cely_areal">Celý areál</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={tableForm.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kapacita *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        data-testid="input-table-capacity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsTableDialogOpen(false);
                    setEditingTable(null);
                    tableForm.reset();
                  }}
                >
                  Zrušit
                </Button>
                <Button type="submit" data-testid="button-save-table">
                  {editingTable ? "Uložit" : "Vytvořit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
