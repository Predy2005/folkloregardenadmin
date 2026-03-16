import type { Event, EventTable, EventGuest } from "@shared/types";
import { EVENT_SPACE_LABELS } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// --- Helper components ---

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

// --- Main canvas component ---

interface FloorPlanCanvasProps {
  selectedRoom: Event['space'];
  onSelectedRoomChange: (room: Event['space']) => void;
  localTables: EventTable[];
  localGuests: EventGuest[];
  filteredUnassignedGuests: EventGuest[];
  nationalityFilter: string;
  onNationalityFilterChange: (value: string) => void;
  uniqueNationalities: string[];
  onOpenAddTable: (room: string) => void;
  onEditTable: (table: EventTable) => void;
  onDeleteTable: (tableId: number) => void;
  onRemoveGuestFromTable: (guestId: number) => void;
  onRemoveGuestEntirely: (guestId: number) => void;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  activeGuestId: string | null;
}

export default function FloorPlanCanvas({
  selectedRoom,
  onSelectedRoomChange,
  localTables,
  localGuests,
  filteredUnassignedGuests,
  nationalityFilter,
  onNationalityFilterChange,
  uniqueNationalities,
  onOpenAddTable,
  onEditTable,
  onDeleteTable,
  onRemoveGuestFromTable,
  onRemoveGuestEntirely,
  onDragStart,
  onDragEnd,
  activeGuestId,
}: FloorPlanCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <Tabs value={selectedRoom} onValueChange={(v) => onSelectedRoomChange(v as Event['space'])} className="w-full">
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
                    onClick={() => onOpenAddTable(room)}
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
                                    onClick={() => onEditTable(table)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => onDeleteTable(table.id)}
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
                                    onRemove={() => onRemoveGuestFromTable(guest.id)}
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
                    <Select value={nationalityFilter} onValueChange={onNationalityFilterChange}>
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
                        onRemove={() => onRemoveGuestEntirely(guest.id)}
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
  );
}
