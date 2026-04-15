import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToggleSet } from "@/shared/hooks/useToggleSet";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { errorToast } from "@/shared/lib/toast-helpers";
import type { SpaceGuestData, ReservationGuestData } from "@shared/types";
import { SpaceCard } from "./SpaceCard";
import { MoveGuestsDialog } from "./MoveGuestsDialog";

interface SpaceViewProps {
  spaces: SpaceGuestData[];
  reservations?: ReservationGuestData[];
  eventId: number;
}

/**
 * Space view for managing guests by venue space
 * Includes advanced move functionality
 */
export function SpaceView({ spaces, reservations = [], eventId }: SpaceViewProps) {
  // Default to all collapsed
  const expandedSpaces = useToggleSet<string>();
  const [moveDialog, setMoveDialog] = useState<{
    fromSpace: string;
    spaceData: SpaceGuestData;
  } | null>(null);

  // Presence mutation
  const updatePresenceMutation = useMutation({
    mutationFn: async (params: { space: string; presentCount: number }) => {
      return api.post(`/api/events/${eventId}/guests/mark-present-by-group`, {
        type: 'space',
        space: params.space,
        presentCount: params.presentCount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guest-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
    },
    onError: () => {
      errorToast("Nepodařilo se aktualizovat přítomnost");
    },
  });

  const toggleSpace = expandedSpaces.toggle;

  // Get reservations for a specific space (case-insensitive, includes null spaceName for first space)
  const getSpaceReservations = (spaceName: string, isFirstSpace: boolean = false) => {
    return reservations.filter((res) => {
      if (res.spaceName) {
        return res.spaceName.toLowerCase() === spaceName.toLowerCase();
      }
      // Reservations without space go to first space
      return isFirstSpace;
    });
  };

  if (spaces.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Žádné prostory k zobrazení
      </div>
    );
  }

  // Find first space index for the move dialog
  const getMoveDialogReservations = () => {
    if (!moveDialog) return [];
    const spaceIndex = spaces.findIndex(s => s.spaceName === moveDialog.fromSpace);
    return getSpaceReservations(moveDialog.fromSpace, spaceIndex === 0);
  };

  return (
    <div className="p-2 space-y-1">
      {spaces.map((space, index) => (
        <SpaceCard
          key={space.spaceName}
          space={space}
          index={index}
          isExpanded={expandedSpaces.isOpen(space.spaceName)}
          onToggle={() => toggleSpace(space.spaceName)}
          onMoveGuests={() => setMoveDialog({
            fromSpace: space.spaceName,
            spaceData: space,
          })}
          onUpdatePresence={(count) => updatePresenceMutation.mutate({
            space: space.spaceName,
            presentCount: count,
          })}
          isPending={updatePresenceMutation.isPending}
          otherSpaces={spaces.filter(s => s.spaceName !== space.spaceName)}
          spaceReservations={getSpaceReservations(space.spaceName, index === 0)}
        />
      ))}

      {/* Advanced move dialog */}
      {moveDialog && (
        <MoveGuestsDialog
          fromSpace={moveDialog.fromSpace}
          spaceData={moveDialog.spaceData}
          targetSpaces={spaces.filter(s => s.spaceName !== moveDialog.fromSpace)}
          reservations={getMoveDialogReservations()}
          eventId={eventId}
          onClose={() => setMoveDialog(null)}
        />
      )}
    </div>
  );
}
