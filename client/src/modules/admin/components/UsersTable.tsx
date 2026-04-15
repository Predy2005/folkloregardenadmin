import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Edit, Trash2, Shield, Lock } from 'lucide-react';
import type { User, Role } from '@shared/types';
import dayjs from 'dayjs';

interface UsersTableProps {
  users: User[];
  roles: Role[] | undefined;
  isSuperAdmin: boolean;
  selectedIds: Set<number>;
  isAllSelected: boolean;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  hasFilters: boolean;
}

export function UsersTable({
  users,
  roles,
  isSuperAdmin,
  selectedIds,
  isAllSelected,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  hasFilters,
}: UsersTableProps) {
  const getRoleDisplay = (roleName: string) => {
    const role = roles?.find(r => r.name === roleName);
    return role?.displayName || roleName;
  };

  const isRoleSystem = (roleName: string) => {
    const role = roles?.find(r => r.name === roleName);
    return role?.isSystem ?? false;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {isSuperAdmin && (
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Vybrat vše"
                  data-testid="checkbox-select-all"
                />
              </TableHead>
            )}
            <TableHead>ID</TableHead>
            <TableHead>Uživatelské jméno</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Poslední přihlášení</TableHead>
            <TableHead>IP adresa</TableHead>
            <TableHead className="text-right">Akce</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isSuperAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                {hasFilters
                  ? 'Žádní uživatelé neodpovídají filtru'
                  : 'Žádní uživatelé'}
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id} className="hover-elevate" data-testid={`row-user-${user.id}`}>
                {isSuperAdmin && (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(user.id)}
                      onCheckedChange={() => onToggleSelect(user.id)}
                      aria-label={`Vybrat ${user.username}`}
                      data-testid={`checkbox-select-${user.id}`}
                    />
                  </TableCell>
                )}
                <TableCell className="font-mono text-sm">#{user.id}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {user.isSuperAdmin && (
                      <span title="Super Admin">
                        <Lock className="w-4 h-4 text-amber-500" />
                      </span>
                    )}
                    {user.username}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles?.map((role) => (
                      <Badge
                        key={role}
                        variant={isRoleSystem(role) ? "default" : "outline"}
                        className="mr-1"
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        {getRoleDisplay(role)}
                      </Badge>
                    ))}
                    {(!user.roles || user.roles.length === 0) && (
                      <span className="text-muted-foreground text-sm">Žádné role</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {user.lastLoginAt ? dayjs(user.lastLoginAt).format('DD.MM.YYYY HH:mm') : '-'}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {user.lastLoginIp || '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(user)}
                      data-testid={`button-edit-${user.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(user)}
                      className="text-destructive hover:text-destructive"
                      disabled={user.isSuperAdmin}
                      data-testid={`button-delete-${user.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
