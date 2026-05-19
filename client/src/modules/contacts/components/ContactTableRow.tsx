import { TableCell, TableRow } from "@/shared/components/ui/table";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Button } from "@/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Edit, Trash2, Plus } from "lucide-react";
import type { Contact } from "@shared/types";

interface ContactTableRowProps {
  contact: Contact;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (id: number) => void;
  onNewReservation: (contact: Contact) => void;
}

export function ContactTableRow({
  contact,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onNewReservation,
}: ContactTableRowProps) {
  return (
    <TableRow className={isSelected ? "bg-primary/5" : ""}>
      <TableCell className="w-[40px]">
        <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(contact.id)} />
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{contact.name}</span>
          <span className="text-sm text-muted-foreground">{contact.email || "-"}</span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm">{contact.phone || "-"}</TableCell>
      <TableCell className="text-sm">{contact.company || "-"}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5 text-sm">
          <span>{contact.invoiceIc || "-"}</span>
          {contact.invoiceDic && <span className="text-muted-foreground">{contact.invoiceDic}</span>}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{contact.clientComeFrom || "-"}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(contact)}>
                <Edit className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Detail / Upravit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onNewReservation(contact)}>
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Nová rezervace</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(contact.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Smazat</TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}
