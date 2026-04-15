import type { StockItem } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { formatCurrency } from "@/shared/lib/formatting";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/shared/components";

interface StockTableProps {
  items: StockItem[];
  isLoading: boolean;
  search: string;
  isSuperAdmin: boolean;
  selectedIds: Set<number>;
  defaultCurrency: string;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onEdit: (item: StockItem) => void;
  onDelete: (id: number) => void;
}

export function StockTable({
  items,
  isLoading,
  search,
  isSuperAdmin,
  selectedIds,
  defaultCurrency,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
}: StockTableProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Načítání...</div>;
  }

  if (!items || items.length === 0) {
    return <EmptyState title={search ? "Žádné položky nenalezeny" : "Zatím žádné skladové položky"} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {isSuperAdmin && (
            <TableHead className="w-[40px]">
              <Checkbox
                checked={items.length > 0 && items.every(i => selectedIds.has(i.id))}
                onCheckedChange={onToggleSelectAll}
              />
            </TableHead>
          )}
          <TableHead>Název</TableHead>
          <TableHead>Skladem</TableHead>
          <TableHead>Minimum</TableHead>
          <TableHead>Cena/jednotka</TableHead>
          <TableHead>Dodavatel</TableHead>
          <TableHead className="text-right">Akce</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id} data-testid={`row-stock-item-${item.id}`} className={selectedIds.has(item.id) ? 'bg-primary/5' : ''}>
            {isSuperAdmin && (
              <TableCell className="w-[40px]">
                <Checkbox
                  checked={selectedIds.has(item.id)}
                  onCheckedChange={() => onToggleSelect(item.id)}
                />
              </TableCell>
            )}
            <TableCell>
              <div>
                <p className="font-medium">{item.name}</p>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  item.minQuantity && item.quantityAvailable < item.minQuantity
                    ? "destructive"
                    : "secondary"
                }
              >
                {item.quantityAvailable} {item.unit}
              </Badge>
            </TableCell>
            <TableCell>
              {item.minQuantity ? `${item.minQuantity} ${item.unit}` : "-"}
            </TableCell>
            <TableCell>
              {item.pricePerUnit ? `${formatCurrency(item.pricePerUnit, defaultCurrency)}/${item.unit}` : "-"}
            </TableCell>
            <TableCell>{item.supplier || "-"}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(item)}
                  data-testid={`button-edit-${item.id}`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(item.id)}
                  data-testid={`button-delete-${item.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
