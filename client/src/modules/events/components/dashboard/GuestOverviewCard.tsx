import { useState } from "react";
import { Users, ChevronDown, ChevronRight, Utensils } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { SpaceGuestStats } from "@shared/types";

interface GuestOverviewCardProps {
  guestsBySpace: SpaceGuestStats[];
  totalPaid: number;
  totalFree: number;
}

const NATIONALITY_LABELS: Record<string, string> = {
  CZ: "CZ",
  EN: "EN",
  DE: "DE",
  CN: "CN",
  RU: "RU",
  ES: "ES",
  FR: "FR",
  IT: "IT",
  OTHER: "Ostatní",
};

const NATIONALITY_COLORS: Record<string, string> = {
  CZ: "bg-blue-500",
  EN: "bg-red-500",
  DE: "bg-yellow-500",
  CN: "bg-orange-500",
  RU: "bg-green-500",
  ES: "bg-purple-500",
  FR: "bg-indigo-500",
  IT: "bg-emerald-500",
  OTHER: "bg-gray-500",
};

export function GuestOverviewCard({
  guestsBySpace,
  totalPaid,
  totalFree,
}: GuestOverviewCardProps) {
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(
    new Set(guestsBySpace.length > 0 ? [guestsBySpace[0].spaceName] : [])
  );

  const toggleSpace = (spaceName: string) => {
    const newSet = new Set(expandedSpaces);
    if (newSet.has(spaceName)) {
      newSet.delete(spaceName);
    } else {
      newSet.add(spaceName);
    }
    setExpandedSpaces(newSet);
  };

  const totalGuests = guestsBySpace.reduce((sum, s) => sum + s.totalGuests, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Hosté
          <Badge variant="secondary" className="ml-auto">
            {totalGuests} celkem
          </Badge>
        </CardTitle>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="text-green-600 font-medium">{totalPaid} zaplaceno</span>
          <span className="text-orange-500">{totalFree} zdarma</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {guestsBySpace.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">
            Žádné prostory k zobrazení
          </p>
        ) : (
          guestsBySpace.map((space) => (
            <SpaceSection
              key={space.spaceName}
              space={space}
              isExpanded={expandedSpaces.has(space.spaceName)}
              onToggle={() => toggleSpace(space.spaceName)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

interface SpaceSectionProps {
  space: SpaceGuestStats;
  isExpanded: boolean;
  onToggle: () => void;
}

function SpaceSection({ space, isExpanded, onToggle }: SpaceSectionProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
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
          <span className="font-medium">{space.spaceName}</span>
          <Badge variant="outline">{space.totalGuests}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-green-600">{space.paidGuests}</span>
          <span>/</span>
          <span className="text-orange-500">{space.freeGuests}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Nationality breakdown */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              Národnosti
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(space.nationalityBreakdown)
                .filter(([, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([nationality, count]) => (
                  <Badge
                    key={nationality}
                    className={`${NATIONALITY_COLORS[nationality] || NATIONALITY_COLORS.OTHER} text-white`}
                  >
                    {NATIONALITY_LABELS[nationality] || nationality}: {count}
                  </Badge>
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
                          +{menu.surcharge} Kč
                        </Badge>
                      )}
                    </span>
                    <span className="font-medium">{menu.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Present guests */}
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">Přítomných</span>
            <span className="font-medium">
              {space.presentGuests} / {space.totalGuests}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
