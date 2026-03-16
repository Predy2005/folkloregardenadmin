import { Users, UserCheck, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useToggleSet } from "@/shared/hooks/useToggleSet";
import { SpaceSection } from "./SpaceSection";
import { MoveGuestsDialog } from "./MoveGuestsDialog";
import { MarkPresentDialog } from "./MarkPresentDialog";
import { calculateGuestSummary, type GuestOverviewCardProps } from "./types";

export function GuestOverviewCard({ guestsBySpace, eventId }: GuestOverviewCardProps) {
  const expandedSpaces = useToggleSet<string>(
    guestsBySpace.length > 0 ? [guestsBySpace[0].spaceName] : []
  );
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [presenceDialogOpen, setPresenceDialogOpen] = useState(false);

  const summary = calculateGuestSummary(guestsBySpace);
  const hasMultipleSpaces = guestsBySpace.length > 1;

  const toggleSpace = expandedSpaces.toggle;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          {/* Title with total count */}
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Hoste
            <Badge variant="secondary" className="ml-auto">
              {summary.totalGuests} celkem
            </Badge>
          </CardTitle>

          {/* Paid/Free counts and presence */}
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 font-medium">
                {summary.paidGuests} platici
              </span>
              <span className="text-orange-500 font-medium">
                {summary.freeGuests} zdarma
              </span>
            </div>
            <div className="text-sm font-medium">
              <span className="text-green-600">{summary.presentGuests}</span>/ <span className="text-red-500">{summary.totalGuests}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setPresenceDialogOpen(true)}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Pritomnost ({summary.presentGuests}/{summary.totalGuests})
            </Button>
            {hasMultipleSpaces && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setMoveDialogOpen(true)}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Presunout hosty
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {guestsBySpace.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Zadne prostory k zobrazeni
            </p>
          ) : (
            guestsBySpace.map((space, index) => (
              <SpaceSection
                key={space.spaceName}
                space={space}
                spaceIndex={index}
                isExpanded={expandedSpaces.isOpen(space.spaceName)}
                onToggle={() => toggleSpace(space.spaceName)}
                eventId={eventId}
                allSpaces={guestsBySpace.map((s) => s.spaceName)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <MoveGuestsDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        eventId={eventId}
        spaces={guestsBySpace.map((s) => s.spaceName)}
      />

      <MarkPresentDialog
        open={presenceDialogOpen}
        onOpenChange={setPresenceDialogOpen}
        eventId={eventId}
        totalGuests={summary.totalGuests}
        presentGuests={summary.presentGuests}
      />
    </>
  );
}
