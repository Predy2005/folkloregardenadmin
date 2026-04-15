import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { queryClient } from '@/shared/lib/queryClient';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Plus, Trash2, Filter, Loader2 } from 'lucide-react';
import { SearchInput } from "@/shared/components";
import { useBulkSelection } from "@/shared/hooks/useBulkSelection";
import type { User, Role } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { successToast, errorToast } from '@/shared/lib/toast-helpers';
import { useFormDialog } from '@/shared/hooks/useFormDialog';
import { useAuth } from '@modules/auth';
import { PageHeader } from "@/shared/components/PageHeader";
import { UsersTable } from '../components/UsersTable';
import { UserFormDialog } from '../components/UserFormDialog';

const userSchema = z.object({
  username: z.string().min(3, 'Uživatelské jméno musí mít alespoň 3 znaky'),
  email: z.string().email('Zadejte platný email'),
  password: z.string().optional().refine((val) => !val || val.length >= 6, {
    message: 'Heslo musí mít alespoň 6 znaků',
  }),
  roleIds: z.array(z.number()).min(1, 'Vyberte alespoň jednu roli'),
});

type UserForm = z.infer<typeof userSchema>;

export default function Users() {
  const dialog = useFormDialog<User>();
  const { isSuperAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => api.get<User[]>('/api/users'),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['/api/roles'],
    queryFn: () => api.get<{ roles: Role[] }>('/api/roles'),
  });
  const roles = rolesData?.roles;

  // Get user's assigned role IDs when editing
  const { data: userRolesData } = useQuery({
    queryKey: ['/api/permissions/users', dialog.editingItem?.id, 'roles'],
    queryFn: () => api.get<{ userId: number; username: string; roles: { id: number; name: string; displayName?: string }[] }>(`/api/permissions/users/${dialog.editingItem?.id}/roles`),
    enabled: !!dialog.editingItem,
  });
  const userRoles = userRolesData?.roles;

  // Filter users by search and role
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower);
      const matchesRole =
        roleFilter === 'all' ||
        user.roles?.includes(roleFilter);
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const getId = useCallback((u: User) => u.id, []);
  const { selectedIds, toggleSelect, toggleSelectAll, clearSelection, isAllSelected } = useBulkSelection({ items: filteredUsers, getId });

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      roleIds: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      const user = await api.post<User>('/api/users', {
        username: data.username,
        email: data.email,
        password: data.password,
        roles: [],
      });
      await api.put(`/api/permissions/users/${user.id}/roles`, {
        roleIds: data.roleIds,
      });
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      dialog.close();
      form.reset();
      successToast('Uživatel byl úspěšně vytvořen');
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserForm> }) => {
      const updateData: Record<string, string | undefined> = {
        username: data.username,
        email: data.email,
      };
      if (data.password) {
        updateData.password = data.password;
      }
      await api.put(`/api/users/${id}`, updateData);
      if (data.roleIds) {
        await api.put(`/api/permissions/users/${id}/roles`, {
          roleIds: data.roleIds,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/users'] });
      dialog.close();
      form.reset();
      successToast('Uživatel byl úspěšně upraven');
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      successToast('Uživatel byl úspěšně smazán');
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.delete(`/api/users/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      clearSelection();
      setShowBulkDeleteDialog(false);
      successToast('Vybraní uživatelé byli úspěšně smazáni');
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const handleCreate = () => {
    const viewerRole = roles?.find(r => r.name === 'VIEWER');
    form.reset({
      username: '',
      email: '',
      password: '',
      roleIds: viewerRole ? [viewerRole.id] : [],
    });
    dialog.openCreate();
  };

  const handleEdit = (user: User) => {
    form.reset({
      username: user.username,
      email: user.email,
      password: '',
      roleIds: [],
    });
    dialog.openEdit(user);
  };

  // Update form when userRoles data is loaded
  const currentRoleIds = userRoles?.map(r => r.id) || [];
  if (dialog.editingItem && currentRoleIds.length > 0 && form.getValues('roleIds').length === 0) {
    form.setValue('roleIds', currentRoleIds);
  }

  const handleDelete = (user: User) => {
    if (user.isSuperAdmin) {
      errorToast('Nelze smazat super administrátora');
      return;
    }
    if (confirm(`Opravdu chcete smazat uživatele "${user.username}"?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleBulkDelete = () => {
    const deletableIds = Array.from(selectedIds).filter((id) => {
      const user = users?.find((u) => u.id === id);
      return user && !user.isSuperAdmin;
    });
    if (deletableIds.length === 0) {
      errorToast('Žádní vybraní uživatelé nemohou být smazáni');
      return;
    }
    bulkDeleteMutation.mutate(deletableIds);
  };

  const onSubmit = (data: UserForm) => {
    if (dialog.editingItem) {
      updateMutation.mutate({ id: dialog.editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Načítání uživatelů...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Uživatelé" description="Správa uživatelů systému">
        <Button onClick={handleCreate} data-testid="button-create-user" className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Přidat uživatele
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          {/* Search and filter bar */}
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Hledat podle jména nebo emailu..."
                className="flex-1 min-w-[200px] max-w-sm"
              />
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtry
              </Button>
              <span className="text-sm text-muted-foreground ml-auto">
                {filteredUsers.length} z {users?.length ?? 0} uživatelů
              </span>
            </div>

            {showFilters && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Role:</span>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[200px]" data-testid="select-role-filter">
                      <SelectValue placeholder="Všechny role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Všechny role</SelectItem>
                      {roles?.sort((a, b) => b.priority - a.priority).map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.displayName || role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(search || roleFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setRoleFilter('all');
                    }}
                  >
                    Zrušit filtry
                  </Button>
                )}
              </div>
            )}

            {/* Bulk action bar */}
            {isSuperAdmin && selectedIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <span className="text-sm font-medium">
                  Vybráno: {selectedIds.size}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Smazat
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  Zrušit výběr
                </Button>
              </div>
            )}
          </div>

          <UsersTable
            users={filteredUsers}
            roles={roles}
            isSuperAdmin={isSuperAdmin}
            selectedIds={selectedIds}
            isAllSelected={isAllSelected}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onEdit={handleEdit}
            onDelete={handleDelete}
            hasFilters={!!(search || roleFilter !== 'all')}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <UserFormDialog
        isOpen={dialog.isOpen}
        setIsOpen={dialog.setIsOpen}
        editingItem={dialog.editingItem}
        isEditing={dialog.isEditing}
        form={form}
        roles={roles}
        onSubmit={onSubmit}
        onClose={() => dialog.close()}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat vybrané uživatele</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Opravdu chcete smazat {selectedIds.size} vybraných uživatelů? Tato akce je nevratná.
            {Array.from(selectedIds).some((id) => users?.find((u) => u.id === id)?.isSuperAdmin) && (
              <span className="block mt-2 text-amber-600">
                Super administrátoři budou z operace vynecháni.
              </span>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mazání...
                </>
              ) : (
                'Smazat'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
