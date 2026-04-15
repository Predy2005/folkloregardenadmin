import type { CashMovementItem } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import {
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Pencil, Trash2,
} from "lucide-react";
import { EmptyState } from "@/shared/components";
import { Badge } from "@/shared/components/ui/badge";
import dayjs from "dayjs";
import { formatCurrency } from "@/shared/lib/formatting";

interface MovementsTabProps {
  movements: CashMovementItem[];
  page: number;
  totalPages: number;
  totalMovements: number;
  onPageChange: (page: number) => void;
  onEdit: (m: CashMovementItem) => void;
  onDelete: (id: number) => void;
}

export function MovementsTab({
  movements,
  page,
  totalPages,
  totalMovements,
  onPageChange,
  onEdit,
  onDelete,
}: MovementsTabProps) {
  return (
    <>
      <MovementTable movements={movements} onEdit={onEdit} onDelete={onDelete} />
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Strana {page} z {totalPages} ({totalMovements} celkem)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function MovementTable({ movements, onEdit, onDelete }: { movements: CashMovementItem[]; onEdit: (m: CashMovementItem) => void; onDelete: (id: number) => void }) {
  if (movements.length === 0) {
    return <EmptyState title="Žádné pohyby" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead>Typ</TableHead>
          <TableHead>Kategorie</TableHead>
          <TableHead className="text-right">Částka</TableHead>
          <TableHead>Popis</TableHead>
          <TableHead className="text-right">Akce</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((m) => (
          <TableRow key={m.id}>
            <TableCell>{dayjs(m.createdAt).format("DD.MM.YYYY HH:mm")}</TableCell>
            <TableCell>
              <Badge variant={m.movementType === "INCOME" ? "default" : "destructive"}>
                {m.movementType === "INCOME" ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {m.movementType === "INCOME" ? "Příjem" : "Výdaj"}
              </Badge>
            </TableCell>
            <TableCell>{m.category || "-"}</TableCell>
            <TableCell className="text-right font-medium">
              <span className={m.movementType === "INCOME" ? "text-green-600" : "text-red-600"}>
                {m.movementType === "INCOME" ? "+" : "-"}{formatCurrency(parseFloat(m.amount), m.currency)}
              </span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{m.description || "-"}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(m)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(m.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
