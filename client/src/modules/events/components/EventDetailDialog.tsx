import type { Event } from "@shared/types";
import { EVENT_TYPE_LABELS, EVENT_STATUS_LABELS, EVENT_SPACE_LABELS } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { getStatusBadgeVariant } from "../utils/eventFilters";
import dayjs from "dayjs";

interface EventDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
}

export function EventDetailDialog({
  isOpen,
  onOpenChange,
  event,
}: EventDetailDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event?.name}</DialogTitle>
          <DialogDescription>
            Zobrazení detailu akce
          </DialogDescription>
        </DialogHeader>
        {event && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Typ akce</p>
                <p className="text-sm">{EVENT_TYPE_LABELS[event.eventType]}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Datum a čas</p>
                <p className="text-sm">
                  {dayjs(event.eventDate).format("DD.MM.YYYY")} {event.eventTime ? event.eventTime.substring(0,5) : ""}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Organizátor</p>
                <p className="text-sm">{event.organizerPerson}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={getStatusBadgeVariant(event.status)}>
                  {EVENT_STATUS_LABELS[event.status]}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Organizátor</p>
                <p className="text-sm">{event.organizerPerson || "Neurčeno"}</p>
              </div>
              {event.coordinatorId && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Koordinátor</p>
                  <p className="text-sm">ID: {event.coordinatorId}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Prostory</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {event.spaces?.map((space) => (
                    <Badge key={space.spaceName} variant="outline">
                      {EVENT_SPACE_LABELS[space.spaceName]}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Počet platících</p>
                <p className="text-sm">{event.guestsPaid}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Počet zdarma</p>
                <p className="text-sm">{event.guestsFree}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Celkem hostů</p>
                <p className="text-sm">{event.guestsTotal}</p>
              </div>
            </div>
            {event.notesInternal && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Poznámky interní</p>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {event.notesInternal}
                </p>
              </div>
            )}
            {event.notesStaff && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Poznámky personalu</p>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {event.notesStaff}
                </p>
              </div>
            )}
            {event.specialRequirements && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Speciální požadavky</p>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {event.specialRequirements}
                </p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} data-testid="button-close">
            Zavřít
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
