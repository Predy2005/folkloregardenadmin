import type { Event } from "@shared/types";
import { EVENT_TYPE_LABELS, EVENT_SPACE_LABELS, EVENT_STATUS_LABELS } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Pencil, Trash2, Eye, Gauge } from "lucide-react";
import { getStatusBadgeVariant, totalGuests } from "../utils/eventFilters";
import dayjs from "dayjs";

interface EventsTableProps {
  events: Event[];
  isLoading: boolean;
  hasFilters: boolean;
  isSuperAdmin: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onDashboard: (event: Event) => void;
  onView: (event: Event) => void;
  onEdit: (event: Event) => void;
  onDelete: (id: number) => void;
}

export function EventsTable({
  events,
  isLoading,
  hasFilters,
  isSuperAdmin,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDashboard,
  onView,
  onEdit,
  onDelete,
}: EventsTableProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Načítání...</div>;
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {hasFilters ? "Žádné akce nenalezeny" : "Zatím žádné akce"}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {isSuperAdmin && (
            <TableHead className="w-[40px]">
              <Checkbox
                checked={events.length > 0 && events.every(e => selectedIds.has(e.id))}
                onCheckedChange={onToggleSelectAll}
              />
            </TableHead>
          )}
          <TableHead>Název</TableHead>
          <TableHead>Typ</TableHead>
          <TableHead>Datum</TableHead>
          <TableHead>Prostor</TableHead>
          <TableHead>Organizátor</TableHead>
          <TableHead>Hosté</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Akce</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id} data-testid={`row-event-${event.id}`} className={selectedIds.has(event.id) ? 'bg-primary/5' : ''}>
            {isSuperAdmin && (
              <TableCell className="w-[40px]">
                <Checkbox
                  checked={selectedIds.has(event.id)}
                  onCheckedChange={() => onToggleSelect(event.id)}
                />
              </TableCell>
            )}
            <TableCell className="font-medium" data-testid={`text-name-${event.id}`}>
              {event.name}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{EVENT_TYPE_LABELS[event.eventType]}</Badge>
            </TableCell>
            <TableCell>{dayjs(event.eventDate).format("DD.MM.YYYY")}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {event.spaces && event.spaces.length > 0 ? (
                  event.spaces.map((space) => (
                    <Badge key={space.spaceName} variant="outline" className="text-xs">
                      {space.buildingName ?? EVENT_SPACE_LABELS[space.spaceName] ?? space.spaceName}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-xs">Neurčeno</span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-sm">{event.organizerPerson}</TableCell>
            <TableCell>
              <div className="text-sm">
                <div className="font-medium">{totalGuests(event)} celkem</div>
                <div className="text-muted-foreground text-xs">
                  {event.guestsPaid} platících / {event.guestsFree} zdarma
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(event.status)}>
                {EVENT_STATUS_LABELS[event.status]}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <TooltipProvider>
              <div className="flex items-center justify-end gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDashboard(event)}
                      data-testid={`button-dashboard-${event.id}`}
                    >
                      <Gauge className="w-4 h-4"/>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Dashboard</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(event)}
                      data-testid={`button-view-${event.id}`}
                    >
                      <Eye className="w-4 h-4"/>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zobrazit detail</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(event)}
                      data-testid={`button-edit-${event.id}`}
                    >
                      <Pencil className="w-4 h-4"/>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Upravit</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(event.id)}
                      data-testid={`button-delete-${event.id}`}
                    >
                      <Trash2 className="w-4 h-4"/>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Smazat</TooltipContent>
                </Tooltip>
              </div>
              </TooltipProvider>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
