import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Users, Utensils, CheckCircle2, Circle } from "lucide-react";
import NationalityBadge from "./NationalityBadge";
import type { WaiterViewTable, WaiterViewGuest } from "./types";

interface WaiterTableListProps {
  tables: WaiterViewTable[];
  unassignedGuests: WaiterViewGuest[];
  onTableClick?: (tableId: number) => void;
}

export default function WaiterTableList({
  tables,
  unassignedGuests,
  onTableClick,
}: WaiterTableListProps) {
  // Group guests by menu for each table
  const getMenuSummary = (guests: WaiterViewGuest[]) => {
    const summary: Record<string, number> = {};
    guests.forEach((g) => {
      const menu = g.menuName || "Bez menu";
      summary[menu] = (summary[menu] || 0) + 1;
    });
    return Object.entries(summary);
  };

  // Get present count for a table
  const getPresentCount = (guests: WaiterViewGuest[]) => {
    return guests.filter((g) => g.isPresent).length;
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {tables.map((table) => (
          <Card
            key={table.id}
            className="cursor-pointer hover:shadow-md transition-shadow touch-manipulation"
            onClick={() => onTableClick?.(table.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="font-bold">Stůl {table.tableNumber}</span>
                  <Badge variant="outline" className="text-xs">
                    {table.spaceName}
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {getPresentCount(table.guests)}/{table.guests.length}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Nationality distribution */}
              <div className="flex flex-wrap gap-1 mb-3">
                {table.guests.map((guest) => (
                  <NationalityBadge
                    key={guest.id}
                    nationality={guest.nationality}
                    size="sm"
                  />
                ))}
              </div>

              {/* Menu summary */}
              <div className="space-y-1">
                {getMenuSummary(table.guests).map(([menu, count]) => (
                  <div
                    key={menu}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Utensils className="h-3 w-3" />
                    <span>
                      {count}× {menu}
                    </span>
                  </div>
                ))}
              </div>

              {/* Guest list */}
              <div className="mt-3 border-t pt-2">
                {table.guests.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center justify-between py-1 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {guest.isPresent ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-300" />
                      )}
                      <span>
                        {guest.firstName} {guest.lastName}
                      </span>
                      <NationalityBadge nationality={guest.nationality} size="sm" />
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {guest.menuName || "-"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Unassigned guests */}
        {unassignedGuests.length > 0 && (
          <Card className="border-dashed border-orange-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-orange-600 flex items-center gap-2">
                Nepřiřazení hosté
                <Badge variant="outline" className="bg-orange-50">
                  {unassignedGuests.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1 mb-3">
                {unassignedGuests.map((guest) => (
                  <NationalityBadge
                    key={guest.id}
                    nationality={guest.nationality}
                    size="sm"
                  />
                ))}
              </div>
              {unassignedGuests.map((guest) => (
                <div
                  key={guest.id}
                  className="flex items-center justify-between py-1 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span>
                      {guest.firstName} {guest.lastName}
                    </span>
                    <NationalityBadge nationality={guest.nationality} size="sm" />
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {guest.menuName || "-"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
