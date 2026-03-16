import { useMutation } from "@tanstack/react-query";
import { MapPin, ChevronDown, ChevronRight, Check, Minus, Plus, Loader2 } from "lucide-react";
import { useToggleSet } from "@/shared/hooks/useToggleSet";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { FlagIcon } from "@/shared/components/FlagIcon";
import { getIsoCode } from "@/shared/lib/nationality";
import { getSpaceColor } from "@/shared/lib/constants";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { errorToast } from "@/shared/lib/toast-helpers";
import type { SpaceGuestData } from "@shared/types";

interface SpaceGuestsCardProps {
  spaces: SpaceGuestData[];
  eventId: number;
}

interface NationalityData {
  nationality: string;
  total: number;
  present: number;
}

/**
 * Card showing guests breakdown by space/venue with check-in controls
 */
export function SpaceGuestsCard({ spaces, eventId }: SpaceGuestsCardProps) {
  const expandedSpaces = useToggleSet<string>(
    spaces.length > 0 ? [spaces[0].spaceName] : []
  );

  // Aggregate nationality data across all spaces
  const nationalityData: NationalityData[] = (() => {
    const map = new Map<string, { total: number; present: number }>();
    spaces.forEach(space => {
      Object.entries(space.nationalityBreakdown).forEach(([nat, count]) => {
        const existing = map.get(nat) || { total: 0, present: 0 };
        existing.total += count;
        // Estimate present based on space presence percentage
        const presenceRatio = space.presence.total > 0
          ? space.presence.present / space.presence.total
          : 0;
        existing.present += Math.round(count * presenceRatio);
        map.set(nat, existing);
      });
    });
    return Array.from(map.entries())
      .map(([nationality, data]) => ({ nationality, ...data }))
      .sort((a, b) => b.total - a.total);
  })();

  const updatePresenceMutation = useMutation({
    mutationFn: async (params: { type: 'space' | 'nationality'; space?: string; nationality?: string; presentCount: number }) => {
      return api.post(`/api/events/${eventId}/guests/mark-present-by-group`, params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests-by-reservation"] });
    },
    onError: () => {
      errorToast("Nepodařilo se aktualizovat přítomnost");
    },
  });

  const toggleSpace = expandedSpaces.toggle;

  if (spaces.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Žádné prostory k zobrazení
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-primary" />
          Hosté dle prostoru / národnosti
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="spaces">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="spaces">Prostory</TabsTrigger>
            <TabsTrigger value="nationalities">Národnosti</TabsTrigger>
          </TabsList>

          <TabsContent value="spaces" className="space-y-2 mt-0">
            {spaces.map((space, index) => (
              <SpaceRow
                key={space.spaceName}
                space={space}
                index={index}
                isExpanded={expandedSpaces.isOpen(space.spaceName)}
                onToggle={() => toggleSpace(space.spaceName)}
                onUpdatePresence={(count) =>
                  updatePresenceMutation.mutate({
                    type: 'space',
                    space: space.spaceName,
                    presentCount: count,
                  })
                }
                isPending={updatePresenceMutation.isPending}
              />
            ))}
          </TabsContent>

          <TabsContent value="nationalities" className="space-y-2 mt-0">
            {nationalityData.map((data) => (
              <NationalityRow
                key={data.nationality}
                data={data}
                onUpdatePresence={(count) =>
                  updatePresenceMutation.mutate({
                    type: 'nationality',
                    nationality: data.nationality,
                    presentCount: count,
                  })
                }
                isPending={updatePresenceMutation.isPending}
              />
            ))}
            {nationalityData.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Žádné národnosti k zobrazení
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface SpaceRowProps {
  space: SpaceGuestData;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdatePresence: (count: number) => void;
  isPending: boolean;
}

function SpaceRow({ space, index, isExpanded, onToggle, onUpdatePresence, isPending }: SpaceRowProps) {
  const spaceColor = getSpaceColor(index);
  const isComplete = space.presence.present >= space.presence.total;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header - clickable */}
      <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 text-left"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}

          <Badge className={`${spaceColor} text-white`}>
            {space.spaceName}
          </Badge>

          <span className="text-sm font-medium">
            {space.types.total} hostů
          </span>
        </button>

        {/* Presence controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdatePresence(Math.max(0, space.presence.present - 1))}
            disabled={isPending || space.presence.present <= 0}
          >
            <Minus className="h-3 w-3" />
          </Button>

          <span className={`min-w-[50px] text-center font-medium ${isComplete ? "text-green-600" : ""}`}>
            {space.presence.present}/{space.presence.total}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onUpdatePresence(Math.min(space.presence.total, space.presence.present + 1))}
            disabled={isPending || space.presence.present >= space.presence.total}
          >
            <Plus className="h-3 w-3" />
          </Button>

          <Button
            variant={isComplete ? "default" : "outline"}
            size="icon"
            className={`h-8 w-8 ${isComplete ? "bg-green-600 hover:bg-green-700" : ""}`}
            onClick={() => onUpdatePresence(space.presence.total)}
            disabled={isPending || isComplete}
            title="Všichni přítomni"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t bg-muted/20 p-3 space-y-3">
          {/* Presence progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Přítomnost</span>
              <span>{space.presence.percentage}%</span>
            </div>
            <Progress value={space.presence.percentage} className="h-1.5" />
          </div>

          {/* Nationality breakdown */}
          {Object.keys(space.nationalityBreakdown).length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Národnosti</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(space.nationalityBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([nationality, count]) => {
                    const isoCode = getIsoCode(nationality);
                    return (
                      <Badge
                        key={nationality}
                        variant="outline"
                        className="text-xs py-0"
                      >
                        {isoCode ? (
                          <FlagIcon code={isoCode} className="h-3 w-4 mr-1 rounded-sm" />
                        ) : (
                          <span className="mr-1">{nationality.toUpperCase().slice(0, 2)}</span>
                        )}
                        {count}
                      </Badge>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Menu breakdown */}
          {space.menuBreakdown.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Menu</span>
              <div className="flex flex-wrap gap-1">
                {space.menuBreakdown.map((menu) => (
                  <Badge key={menu.menuName} variant="secondary" className="text-xs">
                    {menu.menuName}: {menu.count}
                    {menu.surcharge > 0 && (
                      <span className="text-green-600 ml-1">+{menu.surcharge} Kč</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface NationalityRowProps {
  data: NationalityData;
  onUpdatePresence: (count: number) => void;
  isPending: boolean;
}

function NationalityRow({ data, onUpdatePresence, isPending }: NationalityRowProps) {
  const isoCode = getIsoCode(data.nationality);
  const isComplete = data.present >= data.total;
  const percentage = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
      isComplete ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-background"
    }`}>
      {/* Flag */}
      <div className="flex items-center gap-2 min-w-[100px]">
        {isoCode ? (
          <FlagIcon code={isoCode} className="h-4 w-6 rounded-sm" />
        ) : (
          <span className="text-sm font-medium">{data.nationality.toUpperCase().slice(0, 2)}</span>
        )}
        <span className="text-sm font-medium">{data.nationality}</span>
      </div>

      {/* Progress */}
      <div className="flex-1">
        <Progress value={percentage} className="h-2" />
      </div>

      {/* Presence controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdatePresence(Math.max(0, data.present - 1))}
          disabled={isPending || data.present <= 0}
        >
          <Minus className="h-3 w-3" />
        </Button>

        <span className={`min-w-[50px] text-center font-medium ${isComplete ? "text-green-600" : ""}`}>
          {data.present}/{data.total}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdatePresence(Math.min(data.total, data.present + 1))}
          disabled={isPending || data.present >= data.total}
        >
          <Plus className="h-3 w-3" />
        </Button>

        <Button
          variant={isComplete ? "default" : "outline"}
          size="icon"
          className={`h-8 w-8 ${isComplete ? "bg-green-600 hover:bg-green-700" : ""}`}
          onClick={() => onUpdatePresence(data.total)}
          disabled={isPending || isComplete}
          title="Všichni přítomni"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
