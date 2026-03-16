import { useState } from "react";
import { Check, Loader2, Users, Globe } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { getNationalityShort, getNationalityColor } from "./types";

interface MarkPresentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  totalGuests: number;
  presentGuests: number;
}

interface PresenceGroup {
  id: number | string;
  label: string;
  totalCount: number;
  presentCount: number;
  type: "reservation" | "nationality";
  nationality?: string;
  reservationId?: number;
}

interface PresenceGroupingInfo {
  byReservation: Array<{
    reservationId: number;
    contactName: string;
    totalCount: number;
    presentCount: number;
  }>;
  byNationality: Array<{
    nationality: string;
    totalCount: number;
    presentCount: number;
  }>;
}

export function MarkPresentDialog({
  open,
  onOpenChange,
  eventId,
  totalGuests,
  presentGuests,
}: MarkPresentDialogProps) {
  const [selectedTab, setSelectedTab] = useState<"all" | "reservation" | "nationality">("all");
  const [customCounts, setCustomCounts] = useState<Record<string, string>>({});

  // Fetch presence grouping info
  const { data: groupingInfo, isLoading } = useQuery<PresenceGroupingInfo>({
    queryKey: ["/api/events", eventId, "presence-grouping"],
    queryFn: () => api.get(`/api/events/${eventId}/guests/presence-grouping`),
    enabled: open,
  });

  // Mark all present mutation
  const markAllMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/api/events/${eventId}/guests/mark-all-present`);
    },
    onSuccess: (data: { updatedCount: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
      successToast(`${data.updatedCount} hostu oznaceno jako pritomnych`);
      onOpenChange(false);
    },
    onError: () => {
      errorToast("Nepodarilo se oznacit hosty");
    },
  });

  // Mark by group mutation
  const markGroupMutation = useMutation({
    mutationFn: async (params: {
      type: "reservation" | "nationality";
      reservationId?: number;
      nationality?: string;
      presentCount: number;
    }) => {
      return api.post(`/api/events/${eventId}/guests/mark-present-by-group`, params);
    },
    onSuccess: (data: { updatedCount: number; markedPresent: number; markedAbsent: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "presence-grouping"] });
      successToast(`${data.markedPresent} pritomnych, ${data.markedAbsent} nepritomnych`);
    },
    onError: () => {
      errorToast("Nepodarilo se oznacit hosty");
    },
  });

  const handleMarkGroup = (group: PresenceGroup, presentCount: number) => {
    markGroupMutation.mutate({
      type: group.type,
      reservationId: group.type === "reservation" ? (group.id as number) : undefined,
      nationality: group.type === "nationality" ? (group.id as string) : undefined,
      presentCount,
    });
  };

  const getCustomCount = (groupId: string | number, defaultCount: number): number => {
    const key = String(groupId);
    if (customCounts[key] !== undefined && customCounts[key] !== "") {
      return parseInt(customCounts[key], 10) || 0;
    }
    return defaultCount;
  };

  const setCustomCount = (groupId: string | number, value: string) => {
    setCustomCounts((prev) => ({ ...prev, [String(groupId)]: value }));
  };

  const remainingGuests = totalGuests - presentGuests;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Oznacit pritomnost hostu</DialogTitle>
          <DialogDescription>
            {presentGuests}/{totalGuests} hostu je pritomnych ({remainingGuests} zbyvajicich)
          </DialogDescription>
        </DialogHeader>

        {/* Tab buttons */}
        <div className="flex gap-2 border-b pb-3">
          <Button
            variant={selectedTab === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTab("all")}
          >
            Vsichni
          </Button>
          <Button
            variant={selectedTab === "reservation" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTab("reservation")}
          >
            <Users className="h-4 w-4 mr-1" />
            Dle rezervace
          </Button>
          <Button
            variant={selectedTab === "nationality" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTab("nationality")}
          >
            <Globe className="h-4 w-4 mr-1" />
            Dle narodnosti
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* All tab */}
            {selectedTab === "all" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Oznacit vsechny hosty jako pritomne jednim kliknutim.
                </p>
                <Button
                  className="w-full"
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending || remainingGuests === 0}
                >
                  {markAllMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Oznacuji...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Oznacit vsechny ({remainingGuests}) jako pritomne
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* By reservation tab */}
            {selectedTab === "reservation" && (
              <div className="space-y-3">
                {groupingInfo?.byReservation.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Zadne rezervace
                  </p>
                ) : (
                  groupingInfo?.byReservation.map((res) => (
                    <GroupRow
                      key={res.reservationId}
                      group={{
                        id: res.reservationId,
                        label: res.contactName,
                        totalCount: res.totalCount,
                        presentCount: res.presentCount,
                        type: "reservation",
                        reservationId: res.reservationId,
                      }}
                      customCount={getCustomCount(res.reservationId, res.presentCount)}
                      onCustomCountChange={(val) => setCustomCount(res.reservationId, val)}
                      onMarkPresent={handleMarkGroup}
                      isPending={markGroupMutation.isPending}
                    />
                  ))
                )}
              </div>
            )}

            {/* By nationality tab */}
            {selectedTab === "nationality" && (
              <div className="space-y-3">
                {groupingInfo?.byNationality.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Zadne narodnosti
                  </p>
                ) : (
                  groupingInfo?.byNationality.map((nat) => (
                    <GroupRow
                      key={nat.nationality}
                      group={{
                        id: nat.nationality,
                        label: getNationalityShort(nat.nationality),
                        totalCount: nat.totalCount,
                        presentCount: nat.presentCount,
                        type: "nationality",
                        nationality: nat.nationality,
                      }}
                      customCount={getCustomCount(nat.nationality, nat.presentCount)}
                      onCustomCountChange={(val) => setCustomCount(nat.nationality, val)}
                      onMarkPresent={handleMarkGroup}
                      isPending={markGroupMutation.isPending}
                      badgeColor={getNationalityColor(nat.nationality)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface GroupRowProps {
  group: PresenceGroup;
  customCount: number;
  onCustomCountChange: (value: string) => void;
  onMarkPresent: (group: PresenceGroup, presentCount: number) => void;
  isPending: boolean;
  badgeColor?: string;
}

function GroupRow({
  group,
  customCount,
  onCustomCountChange,
  onMarkPresent,
  isPending,
  badgeColor,
}: GroupRowProps) {
  const allPresent = group.presentCount === group.totalCount;
  const remaining = group.totalCount - group.presentCount;

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      {/* Group info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {badgeColor ? (
            <Badge className={`${badgeColor} text-white`}>{group.label}</Badge>
          ) : (
            <span className="font-medium truncate">{group.label}</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {group.presentCount}/{group.totalCount} pritomnych
          {remaining > 0 && (
            <span className="text-orange-500 ml-1">({remaining} chybi)</span>
          )}
        </div>
      </div>

      {/* Count input */}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={group.totalCount}
          value={customCount}
          onChange={(e) => onCustomCountChange(e.target.value)}
          className="w-16 h-8 text-center"
        />
        <span className="text-xs text-muted-foreground">/ {group.totalCount}</span>
      </div>

      {/* Action button */}
      <Button
        size="sm"
        variant={allPresent ? "outline" : "default"}
        onClick={() => onMarkPresent(group, customCount)}
        disabled={isPending}
        className="shrink-0"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : allPresent ? (
          <Check className="h-4 w-4" />
        ) : (
          "Ulozit"
        )}
      </Button>
    </div>
  );
}
