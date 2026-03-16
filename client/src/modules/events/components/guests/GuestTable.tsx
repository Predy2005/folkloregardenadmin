import type { EventGuest } from "@shared/types";
import { GUEST_TYPE_LABELS } from "./constants";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";

export interface GuestTableProps {
  guests: EventGuest[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectGroup: (guests: EventGuest[]) => void;
  onEdit: (guest: EventGuest) => void;
  onDelete: (id: number) => void;
  showCheckboxes?: boolean;
}

export default function GuestTable({
  guests,
  selectedIds,
  onToggleSelect,
  onToggleSelectGroup,
  onEdit,
  onDelete,
  showCheckboxes = true,
}: GuestTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showCheckboxes && (
            <TableHead className="w-[40px]">
              <Checkbox
                checked={guests.length > 0 && guests.every((g) => selectedIds.has(g.id))}
                onCheckedChange={() => onToggleSelectGroup(guests)}
              />
            </TableHead>
          )}
          <TableHead>Jméno</TableHead>
          <TableHead>Příjmení</TableHead>
          <TableHead>Typ</TableHead>
          <TableHead>Národnost</TableHead>
          <TableHead>Platící</TableHead>
          <TableHead>Přítomen</TableHead>
          <TableHead className="w-[80px]">Akce</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {guests.map((g) => (
          <TableRow
            key={g.id}
            className={selectedIds.has(g.id) ? "bg-primary/5" : ""}
          >
            {showCheckboxes && (
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(g.id)}
                  onCheckedChange={() => onToggleSelect(g.id)}
                />
              </TableCell>
            )}
            <TableCell className="font-medium">{g.firstName || "-"}</TableCell>
            <TableCell>{g.lastName || "-"}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {GUEST_TYPE_LABELS[g.type] || g.type}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {g.nationality || "-"}
            </TableCell>
            <TableCell>
              <Badge
                variant={g.isPaid ? "default" : "secondary"}
                className="text-xs"
              >
                {g.isPaid ? "Ano" : "Ne"}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={g.isPresent ? "default" : "outline"}
                className="text-xs"
              >
                {g.isPresent ? "Ano" : "Ne"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(g)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDelete(g.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
