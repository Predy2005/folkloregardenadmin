import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Edit, Trash2, Shield, Lock, Users } from 'lucide-react';
import type { Role } from '@shared/types';

interface RoleTableProps {
  roles: Role[] | undefined;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RoleTable({ roles, onEdit, onDelete }: RoleTableProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Název</TableHead>
                <TableHead>Zobrazovaný název</TableHead>
                <TableHead>Popis</TableHead>
                <TableHead className="text-center">Priorita</TableHead>
                <TableHead className="text-center">Uživatelů</TableHead>
                <TableHead className="text-center">Práv</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Žádné role
                  </TableCell>
                </TableRow>
              ) : (
                roles?.map((role) => (
                  <RoleTableRow
                    key={role.id}
                    role={role}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface RoleTableRowProps {
  role: Role;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

function RoleTableRow({ role, onEdit, onDelete }: RoleTableRowProps) {
  return (
    <TableRow className="hover-elevate">
      <TableCell>
        <div className="flex items-center gap-2">
          {role.isSystem && <Lock className="w-4 h-4 text-muted-foreground" />}
          <span className="font-mono text-sm">{role.name}</span>
        </div>
      </TableCell>
      <TableCell className="font-medium">
        <Badge variant={role.isSystem ? "default" : "outline"}>
          <Shield className="w-3 h-3 mr-1" />
          {role.displayName || role.name}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
        {role.description || '-'}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="secondary">{role.priority}</Badge>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span>{role.userCount}</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        {role.permissions?.length || 0}
      </TableCell>
      <TableCell className="text-right">
        <TooltipProvider>
          <div className="flex items-center justify-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(role)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upravit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(role)}
                  className="text-destructive hover:text-destructive"
                  disabled={role.isSystem || role.userCount > 0}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {role.isSystem ? 'Systémovou roli nelze smazat' : role.userCount > 0 ? 'Role má přiřazené uživatele' : 'Smazat'}
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
}
