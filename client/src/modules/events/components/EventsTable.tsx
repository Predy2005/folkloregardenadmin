import type { Event } from "@shared/types";
import {
  EVENT_TYPE_LABELS,
  EVENT_SPACE_LABELS,
  EVENT_STATUS_LABELS,
} from "@shared/types";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import {
  Pencil,
  Trash2,
  Gauge,
  Star,
  Users as UsersIcon,
  Music,
  UserCog,
  ConciergeBell,
} from "lucide-react";
import { getStatusBadgeVariant, totalGuests } from "../utils/eventFilters";
import dayjs from "dayjs";

interface EventsTableProps {
  readonly events: Event[];
  readonly isLoading: boolean;
  readonly hasFilters: boolean;
  readonly isSuperAdmin: boolean;
  readonly selectedIds: Set<number>;
  readonly onToggleSelect: (id: number) => void;
  readonly onToggleSelectAll: () => void;
  readonly onDashboard: (event: Event) => void;
  readonly onEdit: (event: Event) => void;
  readonly onDelete: (id: number) => void;
}

const HIGHLIGHT_TAG = "Highlight";

export function EventsTable({
  events,
  isLoading,
  hasFilters,
  isSuperAdmin,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDashboard,
  onEdit,
  onDelete,
}: EventsTableProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Načítání...</div>
    );
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
                checked={
                  events.length > 0 &&
                  events.every((e) => selectedIds.has(e.id))
                }
                onCheckedChange={onToggleSelectAll}
              />
            </TableHead>
          )}
          <TableHead className="min-w-[110px]">Datum / čas</TableHead>
          <TableHead className="min-w-[260px]">Akce</TableHead>
          <TableHead className="min-w-[140px]">Hosté</TableHead>
          <TableHead className="min-w-[180px]">Tým</TableHead>
          <TableHead className="min-w-[180px]">Kapela / show</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Akce</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => {
          const isHighlight = (event.eventTags ?? []).some(
            (t) => t.toLowerCase() === HIGHLIGHT_TAG.toLowerCase(),
          );
          const otherTags = (event.eventTags ?? []).filter(
            (t) => t.toLowerCase() !== HIGHLIGHT_TAG.toLowerCase(),
          );
          return (
            <TableRow
              key={event.id}
              data-testid={`row-event-${event.id}`}
              className={selectedIds.has(event.id) ? "bg-primary/5" : ""}
            >
              {isSuperAdmin && (
                <TableCell className="w-[40px]">
                  <Checkbox
                    checked={selectedIds.has(event.id)}
                    onCheckedChange={() => onToggleSelect(event.id)}
                  />
                </TableCell>
              )}

              {/* Datum + čas v jednom sloupci */}
              <TableCell className="text-sm">
                <div className="font-medium">
                  {dayjs(event.eventDate).format("DD.MM.YYYY")}
                </div>
                {event.eventTime && (
                  <div className="text-xs text-muted-foreground font-mono">
                    {event.eventTime.slice(0, 5)}
                  </div>
                )}
              </TableCell>

              {/* Akce: název + typ + tagy + prostor + organizátor (vše do jednoho sloupce) */}
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isHighlight && (
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    )}
                    <span className="font-medium text-sm">{event.name}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {EVENT_TYPE_LABELS[event.eventType]}
                    </Badge>
                    {otherTags.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px] h-4 px-1.5">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                    {event.spaces && event.spaces.length > 0 ? (
                      event.spaces.map((space) => (
                        <span
                          key={space.spaceName}
                          className="inline-block bg-muted px-1.5 rounded text-[10px]"
                        >
                          {space.buildingName ??
                            EVENT_SPACE_LABELS[space.spaceName] ??
                            space.spaceName}
                        </span>
                      ))
                    ) : (
                      <span className="italic">prostor neurčen</span>
                    )}
                    {event.organizerPerson && (
                      <span className="ml-1">· {event.organizerPerson}</span>
                    )}
                  </div>
                </div>
              </TableCell>

              {/* Hosté: total + paid/free split */}
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm">
                  <UsersIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium">{totalGuests(event)}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  <span className="text-emerald-600 font-medium">{event.guestsPaid}</span>
                  {" "}plat. ·{" "}
                  <span>{event.guestsFree}</span>
                  {" "}zdarma
                </div>
              </TableCell>

              {/* Tým: manažerka + hl. číšník */}
              <TableCell>
                <div className="space-y-0.5 text-sm">
                  {event.coordinator ? (
                    <div className="flex items-center gap-1">
                      <UserCog className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate" title={event.coordinator.name}>
                        {event.coordinator.name}
                        {event.coordinator.isExternal && (
                          <span className="text-[10px] text-muted-foreground ml-1">(ext)</span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">manažer —</div>
                  )}
                  {event.headWaiters && event.headWaiters.length > 0 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <ConciergeBell className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate text-xs">
                              {event.headWaiters[0]}
                              {event.headWaiters.length > 1 && (
                                <span className="text-muted-foreground"> +{event.headWaiters.length - 1}</span>
                              )}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">{event.headWaiters.join(", ")}</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">hl. číšník —</div>
                  )}
                </div>
              </TableCell>

              {/* Kapela / show */}
              <TableCell>
                {event.band && event.band.length > 0 ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5 cursor-help">
                          <Music className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <div className="text-sm font-medium">
                              {event.band.length} {event.band.length === 1 ? "člen" : event.band.length < 5 ? "členové" : "členů"}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                              {event.band.slice(0, 2).map((m) => m.name).join(", ")}
                              {event.band.length > 2 && "…"}
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-0.5">
                          {event.band.map((m, i) => (
                            <div key={i}>{m.name} <span className="text-muted-foreground">({m.position})</span></div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <div className="text-xs text-muted-foreground italic">—</div>
                )}
              </TableCell>

              <TableCell>
                <Badge variant={getStatusBadgeVariant(event.status)} className="text-xs">
                  {EVENT_STATUS_LABELS[event.status]}
                </Badge>
              </TableCell>

              <TableCell className="text-right">
                <TooltipProvider>
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onDashboard(event)}
                          data-testid={`button-dashboard-${event.id}`}
                        >
                          <Gauge className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Dashboard</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(event)}
                          data-testid={`button-edit-${event.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Upravit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onDelete(event.id)}
                          data-testid={`button-delete-${event.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Smazat</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
