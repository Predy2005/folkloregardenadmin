import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Utensils } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { api } from "@/shared/lib/api";
import type { EventGuest } from "@shared/types";

interface FoodsCardProps {
  readonly eventId: number;
}

interface MenuRow {
  readonly menuName: string;
  readonly total: number;
  readonly paying: number;
  readonly free: number;
}

/**
 * Souhrn jídel akce — co všechno se vaří + kolik kusů. Zdroj dat:
 * `/api/events/{id}/guests` (jeden fetch, FE agreguje). Host s typem `infant` /
 * `driver` / `guide` jde do `free` sloupce — neplatí, ale kuchyně pro ně vaří
 * (pokud má vybrané menu). Hosté bez `menuName` se ignorují (nemusí jíst).
 */
export function FoodsCard({ eventId }: Readonly<FoodsCardProps>) {
  const { data: guests, isLoading } = useQuery<EventGuest[]>({
    queryKey: ["event-guests", eventId],
    queryFn: () => api.get(`/api/events/${eventId}/guests`),
  });

  const { rows, totalDishes } = useMemo(() => {
    const buckets = new Map<string, { total: number; paying: number; free: number }>();
    let total = 0;

    (guests ?? []).forEach((g) => {
      const menuName = (g as EventGuest & { menuName?: string | null }).menuName;
      if (!menuName) return;
      const bucket = buckets.get(menuName) ?? { total: 0, paying: 0, free: 0 };
      bucket.total += 1;
      total += 1;
      const isFree = g.type === "infant" || g.type === "driver" || g.type === "guide";
      if (isFree) bucket.free += 1;
      else bucket.paying += 1;
      buckets.set(menuName, bucket);
    });

    const sorted: MenuRow[] = Array.from(buckets.entries())
      .map(([menuName, info]) => ({ menuName, ...info }))
      .sort((a, b) => b.total - a.total);

    return { rows: sorted, totalDishes: total };
  }, [guests]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Jídla
          </div>
          <Badge variant="secondary" className="text-xs">
            {totalDishes} ks · {rows.length} druhů
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="h-16 bg-muted rounded-lg animate-pulse" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Žádné menu zatím přiřazené hostům.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => (
              <li
                key={row.menuName}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="font-medium truncate pr-3">{row.menuName}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {row.free > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({row.paying} plat. + {row.free} zdarma)
                    </span>
                  )}
                  <Badge variant="outline" className="font-mono">
                    {row.total}×
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
