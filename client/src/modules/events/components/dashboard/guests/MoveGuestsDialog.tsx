import { useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import {
  type MoveGuestsDialogProps,
  type GuestGroupingInfo,
  type SelectedMoveGroup,
  type MoveGuestsResponse,
  getNationalityShort,
  getNationalityColor,
} from "./types";

export function MoveGuestsDialog({
  open,
  onOpenChange,
  eventId,
  spaces,
}: MoveGuestsDialogProps) {
  const [selectedTab, setSelectedTab] = useState<"nationality" | "reservation">("nationality");
  const [selectedGroup, setSelectedGroup] = useState<SelectedMoveGroup | null>(null);
  const [targetSpace, setTargetSpace] = useState<string>("");
  const [moveCount, setMoveCount] = useState<string>("");
  const [sourceSpace, setSourceSpace] = useState<string>("");

  // Fetch grouping info
  const { data: groupingInfo, isLoading, refetch } = useQuery<GuestGroupingInfo>({
    queryKey: ["/api/events", eventId, "guests/grouping-info"],
    queryFn: () => api.get(`/api/events/${eventId}/guests/grouping-info`),
    enabled: open,
  });

  // Move mutation
  const moveMutation = useMutation({
    mutationFn: async (params: {
      targetSpace: string;
      nationality?: string;
      reservationId?: number;
      sourceSpace?: string;
      count?: number;
    }) => {
      return api.post(`/api/events/${eventId}/guests/move-to-space`, params);
    },
    onSuccess: (data: MoveGuestsResponse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
      refetch();
      successToast(`${data.movedCount} z ${data.totalMatching} hostů přesunuto do ${data.targetSpace}`);
      resetForm();
    },
    onError: (error: Error) => errorToast(error),
  });

  const resetForm = () => {
    setSelectedGroup(null);
    setTargetSpace("");
    setMoveCount("");
    setSourceSpace("");
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleSelectGroup = (group: SelectedMoveGroup) => {
    setSelectedGroup(group);
    setMoveCount(String(group.count));
    const spacesWithCounts = Object.entries(group.spaces);
    if (spacesWithCounts.length > 0) {
      const maxSpace = spacesWithCounts.reduce((a, b) => (a[1] > b[1] ? a : b));
      setSourceSpace(maxSpace[0]);
    }
  };

  const handleMove = () => {
    if (!selectedGroup || !targetSpace) return;

    const count = moveCount ? parseInt(moveCount, 10) : undefined;

    moveMutation.mutate({
      targetSpace,
      nationality: selectedGroup.type === "nationality" ? selectedGroup.nationality : undefined,
      reservationId: selectedGroup.type === "reservation" ? selectedGroup.reservationId : undefined,
      sourceSpace: sourceSpace || undefined,
      count: count && count < selectedGroup.count ? count : undefined,
    });
  };

  const getSourceSpaceCount = () => {
    if (!selectedGroup || !sourceSpace) return selectedGroup?.count || 0;
    return selectedGroup.spaces[sourceSpace] || 0;
  };

  const availableSpaces = groupingInfo?.availableSpaces || spaces;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Presunout hosty mezi prostory</DialogTitle>
          <DialogDescription>
            Vyberte skupinu hostu a urcete kolik z nich chcete presunout.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : selectedGroup ? (
          <MoveForm
            selectedGroup={selectedGroup}
            sourceSpace={sourceSpace}
            setSourceSpace={setSourceSpace}
            targetSpace={targetSpace}
            setTargetSpace={setTargetSpace}
            moveCount={moveCount}
            setMoveCount={setMoveCount}
            availableSpaces={availableSpaces}
            getSourceSpaceCount={getSourceSpaceCount}
            onBack={() => setSelectedGroup(null)}
            onMove={handleMove}
            isPending={moveMutation.isPending}
          />
        ) : (
          <GroupSelection
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
            groupingInfo={groupingInfo}
            onSelectGroup={handleSelectGroup}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface MoveFormProps {
  selectedGroup: SelectedMoveGroup;
  sourceSpace: string;
  setSourceSpace: (value: string) => void;
  targetSpace: string;
  setTargetSpace: (value: string) => void;
  moveCount: string;
  setMoveCount: (value: string) => void;
  availableSpaces: string[];
  getSourceSpaceCount: () => number;
  onBack: () => void;
  onMove: () => void;
  isPending: boolean;
}

function MoveForm({
  selectedGroup,
  sourceSpace,
  setSourceSpace,
  targetSpace,
  setTargetSpace,
  moveCount,
  setMoveCount,
  availableSpaces,
  getSourceSpaceCount,
  onBack,
  onMove,
  isPending,
}: MoveFormProps) {
  return (
    <div className="space-y-4">
      {/* Selected group header */}
      <div className="p-3 bg-muted/30 rounded-lg">
        <div className="font-medium">
          {selectedGroup.type === "nationality" ? (
            <Badge
              className={`${getNationalityColor(selectedGroup.nationality!)} text-white`}
            >
              {getNationalityShort(selectedGroup.nationality!)}
            </Badge>
          ) : (
            <span>{selectedGroup.contactName}</span>
          )}
          <span className="ml-2 text-sm text-muted-foreground">
            ({selectedGroup.count} hostu celkem)
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {Object.entries(selectedGroup.spaces).map(([space, cnt]) => (
            <span key={space} className="mr-2">
              {space}: {cnt}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {/* Source space */}
        <div className="grid gap-2">
          <Label htmlFor="sourceSpace">Z prostoru</Label>
          <Select value={sourceSpace} onValueChange={setSourceSpace}>
            <SelectTrigger id="sourceSpace">
              <SelectValue placeholder="Vyberte zdrojovy prostor" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(selectedGroup.spaces).map(([space, cnt]) => (
                <SelectItem key={space} value={space}>
                  {space} ({cnt} hostu)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target space */}
        <div className="grid gap-2">
          <Label htmlFor="targetSpace">Do prostoru</Label>
          <Select value={targetSpace} onValueChange={setTargetSpace}>
            <SelectTrigger id="targetSpace">
              <SelectValue placeholder="Vyberte cilovy prostor" />
            </SelectTrigger>
            <SelectContent>
              {availableSpaces
                .filter((s) => s !== sourceSpace)
                .map((space) => (
                  <SelectItem key={space} value={space}>
                    {space}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Count input */}
        <div className="grid gap-2">
          <Label htmlFor="moveCount">
            Pocet hostu k presunuti (max {getSourceSpaceCount()})
          </Label>
          <Input
            id="moveCount"
            type="number"
            min={1}
            max={getSourceSpaceCount()}
            value={moveCount}
            onChange={(e) => setMoveCount(e.target.value)}
            placeholder={`1 - ${getSourceSpaceCount()}`}
          />
          <p className="text-xs text-muted-foreground">
            Nechte prazdne nebo zadejte max pro presun vsech hostu z teto skupiny
          </p>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onBack}>
          Zpet
        </Button>
        <Button onClick={onMove} disabled={!targetSpace || isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Presouvam...
            </>
          ) : (
            <>Presunout {moveCount || getSourceSpaceCount()} hostu</>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

interface GroupSelectionProps {
  selectedTab: "nationality" | "reservation";
  setSelectedTab: (tab: "nationality" | "reservation") => void;
  groupingInfo: GuestGroupingInfo | undefined;
  onSelectGroup: (group: SelectedMoveGroup) => void;
}

function GroupSelection({
  selectedTab,
  setSelectedTab,
  groupingInfo,
  onSelectGroup,
}: GroupSelectionProps) {
  return (
    <div className="space-y-4">
      {/* Tab buttons */}
      <div className="flex gap-2">
        <Button
          variant={selectedTab === "nationality" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedTab("nationality")}
        >
          Podle narodnosti
        </Button>
        <Button
          variant={selectedTab === "reservation" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedTab("reservation")}
        >
          Podle rezervace
        </Button>
      </div>

      {/* Group list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {selectedTab === "nationality" ? (
          groupingInfo?.byNationality.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Zadne skupiny podle narodnosti
            </p>
          ) : (
            groupingInfo?.byNationality.map((group) => (
              <button
                key={group.nationality}
                onClick={() =>
                  onSelectGroup({
                    type: "nationality",
                    nationality: group.nationality,
                    count: group.count,
                    spaces: group.spaces,
                  })
                }
                className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <div>
                  <Badge
                    className={`${getNationalityColor(group.nationality)} text-white`}
                  >
                    {getNationalityShort(group.nationality)}
                  </Badge>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {group.count} hostu
                  </span>
                  <div className="text-xs text-muted-foreground mt-1">
                    {Object.entries(group.spaces).map(([space, cnt]) => (
                      <span key={space} className="mr-2">
                        {space}: {cnt}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))
          )
        ) : groupingInfo?.byReservation.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Zadne skupiny podle rezervace
          </p>
        ) : (
          groupingInfo?.byReservation.map((group) => (
            <button
              key={group.reservationId}
              onClick={() =>
                onSelectGroup({
                  type: "reservation",
                  reservationId: group.reservationId,
                  contactName: group.contactName,
                  count: group.count,
                  spaces: group.spaces,
                })
              }
              className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{group.contactName}</div>
                <div className="text-xs text-muted-foreground">
                  {group.count} hostu | {group.nationality || "?"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Object.entries(group.spaces).map(([space, cnt]) => (
                    <span key={space} className="mr-2">
                      {space}: {cnt}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
