import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { queryClient } from '@/shared/lib/queryClient';
import { Button } from '@/shared/components/ui/button';
import { Plus } from 'lucide-react';
import type { Role } from '@shared/types';
import { successToast, errorToast } from '@/shared/lib/toast-helpers';
import { useFormDialog } from '@/shared/hooks/useFormDialog';
import { RoleTable, RoleFormDialog } from '../components/roles';
import { PageHeader } from "@/shared/components/PageHeader";

export default function Roles() {
  const dialog = useFormDialog<Role>();

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['/api/roles'],
    queryFn: () => api.get<{ roles: Role[] }>('/api/roles'),
  });
  const roles = rolesData?.roles;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      successToast('Role byla úspěšně smazána');
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const handleCreate = () => {
    dialog.openCreate();
  };

  const handleEdit = (role: Role) => {
    dialog.openEdit(role);
  };

  const handleDelete = (role: Role) => {
    if (role.isSystem) {
      errorToast('Systémové role nelze smazat');
      return;
    }
    if (role.userCount > 0) {
      errorToast(`Role je přiřazena ${role.userCount} uživatelům`);
      return;
    }
    if (confirm(`Opravdu chcete smazat roli "${role.displayName || role.name}"?`)) {
      deleteMutation.mutate(role.id);
    }
  };

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Načítání rolí...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Role" description="Správa rolí a jejich oprávnění">
        <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Přidat roli
        </Button>
      </PageHeader>

      <RoleTable
        roles={roles}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <RoleFormDialog
        isOpen={dialog.isOpen}
        setIsOpen={dialog.setIsOpen}
        editingRole={dialog.editingItem}
        onClose={dialog.close}
      />
    </div>
  );
}
