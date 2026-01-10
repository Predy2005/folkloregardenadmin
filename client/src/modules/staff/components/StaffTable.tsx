// typescript
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Pencil, Trash2 } from "lucide-react";
import type { StaffMember } from "@shared/types";

interface StaffTableProps {
  members: StaffMember[];
  resolveRoleLabel: (position: number) => React.ReactNode;
  onEdit: (member: StaffMember) => void;
  onDelete: (id: number) => void;
}

export function StaffTable({
  members,
  resolveRoleLabel,
  onEdit,
  onDelete,
}: StaffTableProps) {
  if (!members || members.length === 0) return null;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Jméno</TableHead>
          <TableHead>Kontakt</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Hodinová sazba</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Akce</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id} data-testid={`row-staff-${member.id}`}>
            <TableCell className="font-medium">
              {member.firstName} {member.lastName}
            </TableCell>
            <TableCell>
              <div className="text-sm">
                <div>{member.email}</div>
                {member.phone && (
                  <div className="text-muted-foreground">{member.phone}</div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">
                {resolveRoleLabel(member.position)}
              </Badge>
            </TableCell>
            <TableCell>
              {member.hourlyRate ? `${member.hourlyRate} Kč/h` : "-"}
            </TableCell>
            <TableCell>
              <Badge variant={member.isActive ? "default" : "secondary"}>
                {member.isActive ? "Aktivní" : "Neaktivní"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <TooltipProvider>
              <div className="flex items-center justify-end gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(member)}
                      data-testid={`button-edit-${member.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Upravit</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(member.id)}
                      data-testid={`button-delete-${member.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Smazat</TooltipContent>
                </Tooltip>
              </div>
              </TooltipProvider>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
