import type { CashboxClosureItem } from "@shared/types";
import { formatNumber } from "@/shared/lib/formatting";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { EmptyState } from "@/shared/components";
import dayjs from "dayjs";

interface ClosuresTabProps {
  closures: CashboxClosureItem[];
  currencyLabel: string;
}

export function ClosuresTab({ closures, currencyLabel }: ClosuresTabProps) {
  if (closures.length === 0) {
    return <EmptyState title="Žádné uzávěrky" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead className="text-right">Očekáváno</TableHead>
          <TableHead className="text-right">Skutečnost</TableHead>
          <TableHead className="text-right">Rozdíl</TableHead>
          <TableHead>Poznámky</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {closures.map((c) => (
          <TableRow key={c.id}>
            <TableCell>{dayjs(c.closedAt).format("DD.MM.YYYY HH:mm")}</TableCell>
            <TableCell className="text-right">{formatNumber(parseFloat(c.expectedCash))} {currencyLabel}</TableCell>
            <TableCell className="text-right">{formatNumber(parseFloat(c.actualCash))} {currencyLabel}</TableCell>
            <TableCell className={`text-right font-medium ${parseFloat(c.difference) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {parseFloat(c.difference) >= 0 ? "+" : ""}{formatNumber(parseFloat(c.difference))} {currencyLabel}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{c.notes || "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
