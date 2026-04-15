import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Utensils,
  Globe,
  Users,
  ArrowRightLeft,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/shared/components/ui/select";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import {
  type SpaceSectionProps,
  type SpaceViewMode,
  getNationalityShort,
  getNationalityColor,
  getSpaceColor,
} from "./types";

export function SpaceSection({
  space,
  spaceIndex,
  isExpanded,
  onToggle,
  eventId,
  allSpaces,
}: SpaceSectionProps) {
  const [viewMode, setViewMode] = useState<SpaceViewMode>("summary");
  const [targetSpace, setTargetSpace] = useState<string>("");

  const spaceColor = getSpaceColor(spaceIndex);
  const otherSpaces = allSpaces.filter((s) => s !== space.spaceName);

  // Move guests by nationality mutation
  const moveByNationalityMutation = useMutation({
    mutationFn: async ({ nationality, target }: { nationality: string; target: string }) => {
      return api.post(`/api/events/${eventId}/guests/move-to-space`, {
        nationality,
        sourceSpace: space.spaceName,
        targetSpace: target,
      });
    },
    onSuccess: (data: { movedCount: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
      successToast(`${data.movedCount} hostu presunuto`);
      setTargetSpace("");
    },
    onError: () => {
      errorToast("Nepodarilo se presunout hosty");
    },
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Space header - clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 touch-manipulation min-h-[48px]"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Badge className={`${spaceColor} text-white`}>
            {space.spaceName}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {space.totalGuests} hostu
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-600 font-medium">{space.paidGuests}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-orange-500 font-medium">{space.freeGuests}</span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-3 space-y-4">
          {/* View mode tabs */}
          <div className="flex gap-1 border-b pb-2">
            <Button
              variant={viewMode === "summary" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode("summary")}
            >
              <Utensils className="h-3 w-3 mr-1" />
              Menu
            </Button>
            <Button
              variant={viewMode === "byNationality" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode("byNationality")}
            >
              <Globe className="h-3 w-3 mr-1" />
              Dle narodnosti
            </Button>
            <Button
              variant={viewMode === "byReservation" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setViewMode("byReservation")}
            >
              <Users className="h-3 w-3 mr-1" />
              Dle rezervace
            </Button>
          </div>

          {/* Summary view - menu breakdown + nationality */}
          {viewMode === "summary" && (
            <div className="space-y-4">
              {/* Nationality breakdown with move option */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Narodnosti
                </h4>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(space.nationalityBreakdown)
                    .filter(([, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([nationality, count]) => (
                      <div key={nationality} className="flex items-center gap-1">
                        <Badge
                          className={`${getNationalityColor(nationality)} text-white text-xs`}
                        >
                          {getNationalityShort(nationality)}: {count}
                        </Badge>
                        {otherSpaces.length > 0 && (
                          <Select
                            value={targetSpace}
                            onValueChange={(value) => {
                              setTargetSpace(value);
                              moveByNationalityMutation.mutate({
                                nationality,
                                target: value,
                              });
                            }}
                          >
                            <SelectTrigger className="h-5 w-5 p-0 border-0">
                              <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                            </SelectTrigger>
                            <SelectContent>
                              {otherSpaces.map((s) => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Menu breakdown */}
              {space.menuBreakdown.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Utensils className="h-3 w-3" />
                    Menu
                  </h4>
                  <div className="space-y-1">
                    {space.menuBreakdown.map((menu) => (
                      <div
                        key={menu.menuName}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2">
                          {menu.menuName}
                          {menu.surcharge > 0 && (
                            <Badge variant="outline" className="text-xs">
                              +{menu.surcharge} Kc
                            </Badge>
                          )}
                        </span>
                        <span className="font-medium">{menu.count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* By nationality view */}
          {viewMode === "byNationality" && (
            <div className="space-y-3">
              {space.menuByNationality.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Zadna data
                </p>
              ) : (
                space.menuByNationality.map((natGroup) => (
                  <div
                    key={natGroup.nationality}
                    className="border rounded-lg p-2"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        className={`${getNationalityColor(natGroup.nationality)} text-white`}
                      >
                        {getNationalityShort(natGroup.nationality)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {natGroup.totalCount} hostu
                      </span>
                    </div>
                    <div className="space-y-1">
                      {natGroup.menus.map((menu) => (
                        <div
                          key={menu.menuName}
                          className="flex items-center justify-between text-xs"
                        >
                          <span>{menu.menuName}</span>
                          <span className="font-medium">{menu.count}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* By reservation view */}
          {viewMode === "byReservation" && (
            <div className="space-y-3">
              {space.menuByReservation.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Zadna data
                </p>
              ) : (
                space.menuByReservation.map((resGroup) => (
                  <div
                    key={resGroup.reservationId}
                    className="border rounded-lg p-2"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate max-w-[150px]">
                          {resGroup.contactName}
                        </span>
                        {resGroup.nationality && (
                          <Badge
                            className={`${getNationalityColor(resGroup.nationality)} text-white text-xs`}
                          >
                            {getNationalityShort(resGroup.nationality)}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {resGroup.totalCount} hostu
                      </span>
                    </div>
                    <div className="space-y-1">
                      {resGroup.menus.map((menu) => (
                        <div
                          key={menu.menuName}
                          className="flex items-center justify-between text-xs"
                        >
                          <span>{menu.menuName}</span>
                          <span className="font-medium">{menu.count}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Present count footer */}
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">Pritomnych</span>
            <span className="font-medium">
              {space.presentGuests} / {space.totalGuests}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
