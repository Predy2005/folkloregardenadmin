import { UtensilsCrossed } from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatting";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import type { ReservationGuestData } from "@shared/types";

interface ReservationMenuBreakdownProps {
  menuBreakdown: NonNullable<ReservationGuestData["menuBreakdown"]>;
}

export function ReservationMenuBreakdown({ menuBreakdown }: ReservationMenuBreakdownProps) {
  const totalSurcharge = menuBreakdown.reduce(
    (sum, m) => sum + m.surcharge * m.count,
    0
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
        <UtensilsCrossed className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Menu</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jídlo</TableHead>
            <TableHead className="text-right w-20">Počet</TableHead>
            <TableHead className="text-right w-24">Příplatek</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {menuBreakdown.map((menu, idx) => (
            <TableRow key={menu.menuId || idx}>
              <TableCell className="font-medium">{menu.menuName}</TableCell>
              <TableCell className="text-right">{menu.count}</TableCell>
              <TableCell className="text-right">
                {menu.surcharge > 0 ? (
                  <span className="text-green-600">+{formatCurrency(menu.surcharge)}</span>
                ) : (
                  <span className="text-muted-foreground">v ceně</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {totalSurcharge > 0 && (
            <TableRow className="bg-muted/30">
              <TableCell className="font-medium">Celkem příplatky</TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right font-bold text-green-600">
                +{formatCurrency(totalSurcharge)}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
