import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import NationalityBadge, { getNationalityColor } from "./NationalityBadge";
import type { WaiterViewTable, WaiterViewGuest } from "./types";

interface WaiterFloorPlanProps {
  tables: WaiterViewTable[];
  unassignedGuests: WaiterViewGuest[];
  nationalityDistribution: Record<string, number>;
  onTableClick?: (tableId: number) => void;
}

export default function WaiterFloorPlan({
  tables,
  unassignedGuests,
  nationalityDistribution,
  onTableClick,
}: WaiterFloorPlanProps) {
  // Get dominant nationality for a table
  const getDominantNationality = (guests: WaiterViewGuest[]) => {
    const counts: Record<string, number> = {};
    guests.forEach((g) => {
      const nat = g.nationality || "unknown";
      counts[nat] = (counts[nat] || 0) + 1;
    });
    let dominant = "unknown";
    let max = 0;
    Object.entries(counts).forEach(([nat, count]) => {
      if (count > max) {
        dominant = nat;
        max = count;
      }
    });
    return dominant;
  };

  // Calculate table position (normalize to percentage)
  const getTableStyle = (table: WaiterViewTable) => {
    // Default positions if not set
    const x = table.positionX ?? Math.random() * 80 + 10;
    const y = table.positionY ?? Math.random() * 80 + 10;
    return {
      left: `${x}%`,
      top: `${y}%`,
    };
  };

  // Sort nationalities by count
  const sortedNationalities = Object.entries(nationalityDistribution).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Legend */}
      <Card className="mx-4 mt-4 mb-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Nacionality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {sortedNationalities.map(([nat, count]) => (
              <div key={nat} className="flex items-center gap-1">
                <NationalityBadge nationality={nat} size="sm" showName />
                <span className="text-sm text-muted-foreground">({count})</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Floor Plan Canvas */}
      <ScrollArea className="flex-1">
        <div className="relative mx-4 mb-4 h-[500px] bg-gray-100 rounded-lg border-2 border-dashed">
          {/* Grid background */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(to right, #ccc 1px, transparent 1px), linear-gradient(to bottom, #ccc 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />

          {/* Tables */}
          {tables.map((table) => {
            const dominantNat = getDominantNationality(table.guests);
            const color = getNationalityColor(dominantNat);
            const hasGuests = table.guests.length > 0;
            const presentCount = table.guests.filter((g) => g.isPresent).length;

            return (
              <div
                key={table.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer
                  transition-transform hover:scale-110 touch-manipulation`}
                style={getTableStyle(table)}
                onClick={() => onTableClick?.(table.id)}
              >
                {/* Table circle */}
                <div
                  className={`relative w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center
                    ${hasGuests ? color.bg : "bg-gray-200"}
                    ${hasGuests ? "border-white shadow-lg" : "border-gray-300"}
                  `}
                >
                  <span
                    className={`font-bold text-lg ${
                      hasGuests ? color.text : "text-gray-500"
                    }`}
                  >
                    {table.tableNumber}
                  </span>
                  <span
                    className={`text-xs ${
                      hasGuests ? color.text : "text-gray-400"
                    }`}
                  >
                    {presentCount}/{table.guests.length}
                  </span>
                </div>

                {/* Nationality badges around table */}
                {hasGuests && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                    {table.guests.slice(0, 4).map((guest, _idx) => (
                      <div
                        key={guest.id}
                        className={`w-3 h-3 rounded-full ${
                          getNationalityColor(guest.nationality).bg
                        } border border-white`}
                        title={`${guest.firstName} ${guest.lastName} (${guest.nationality})`}
                      />
                    ))}
                    {table.guests.length > 4 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        +{table.guests.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty state */}
          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground">
                Žádné stoly nejsou definovány
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Unassigned guests summary */}
      {unassignedGuests.length > 0 && (
        <Card className="mx-4 mb-4 border-orange-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-600">
              Nepřiřazení hosté ({unassignedGuests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {unassignedGuests.map((guest) => (
                <NationalityBadge
                  key={guest.id}
                  nationality={guest.nationality}
                  size="sm"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
