import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { queryClient } from '@/shared/lib/queryClient';
import { useToggleSet } from '@/shared/hooks/useToggleSet';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/shared/components/ui/form';
import { Lock } from 'lucide-react';
import type { Role, Permission } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { successToast, errorToast } from '@/shared/lib/toast-helpers';
import { PermissionMatrix } from './PermissionMatrix';

const roleSchema = z.object({
  name: z.string().min(2, 'Název musí mít alespoň 2 znaky').regex(/^[A-Z_]+$/, 'Název musí být velkými písmeny (A-Z, _)'),
  displayName: z.string().min(2, 'Zobrazovaný název musí mít alespoň 2 znaky'),
  description: z.string().optional(),
  priority: z.number().min(0).max(100),
  permissions: z.array(z.string()),
});

export type RoleForm = z.infer<typeof roleSchema>;

interface RoleFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editingRole: Role | null;
  onClose: () => void;
}

export function RoleFormDialog({ isOpen, setIsOpen, editingRole, onClose }: RoleFormDialogProps) {
  const expandedModules = useToggleSet<string>();

  const { data: permissionsData } = useQuery({
    queryKey: ['/api/permissions/grouped'],
    queryFn: () => api.get<{ modules: string[], permissions: Record<string, Permission[]> }>('/api/permissions/grouped'),
  });
  const permissionsGrouped = permissionsData?.permissions;

  const form = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      displayName: '',
      description: '',
      priority: 0,
      permissions: [],
    },
  });

  // Reset form when dialog opens/closes or editing role changes
  useEffect(() => {
    if (isOpen && editingRole) {
      form.reset({
        name: editingRole.name,
        displayName: editingRole.displayName || '',
        description: editingRole.description || '',
        priority: editingRole.priority,
        permissions: editingRole.permissions || [],
      });
      // Expand modules that have selected permissions
      if (editingRole.permissions && permissionsGrouped) {
        const modulesWithPerms: string[] = [];
        Object.entries(permissionsGrouped).forEach(([module, perms]) => {
          if (perms.some(p => editingRole.permissions?.includes(p.key))) {
            modulesWithPerms.push(module);
          }
        });
        expandedModules.openAll(modulesWithPerms);
      }
    } else if (isOpen && !editingRole) {
      form.reset({
        name: '',
        displayName: '',
        description: '',
        priority: 0,
        permissions: [],
      });
      expandedModules.closeAll();
    }
  }, [isOpen, editingRole]);

  const createMutation = useMutation({
    mutationFn: (data: RoleForm) => api.post('/api/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      onClose();
      form.reset();
      successToast('Role byla úspěšně vytvořena');
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RoleForm> }) =>
      api.put(`/api/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      onClose();
      form.reset();
      successToast('Role byla úspěšně upravena');
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const onSubmit = (data: RoleForm) => {
    if (editingRole) {
      // For system roles, only allow editing displayName, description
      if (editingRole.isSystem) {
        updateMutation.mutate({
          id: editingRole.id,
          data: {
            displayName: data.displayName,
            description: data.description,
          }
        });
      } else {
        updateMutation.mutate({ id: editingRole.id, data });
      }
    } else {
      createMutation.mutate(data);
    }
  };

  const isEditing = editingRole !== null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {editingRole ? `Upravit roli: ${editingRole.displayName || editingRole.name}` : 'Nová role'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Systémový název</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="CUSTOM_ROLE"
                        {...field}
                        disabled={editingRole?.isSystem}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/[^A-Z_]/g, ''))}
                      />
                    </FormControl>
                    <FormDescription>Velká písmena a podtržítka (např. MANAGER)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zobrazovaný název</FormLabel>
                    <FormControl>
                      <Input placeholder="Manažer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Popis</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Popis role a jejích oprávnění..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorita (0-100)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={editingRole?.isSystem}
                      />
                    </FormControl>
                    <FormDescription>Vyšší priorita = důležitější role</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Permissions editor */}
            {!editingRole?.isSystem && permissionsGrouped && (
              <FormField
                control={form.control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oprávnění</FormLabel>
                    <PermissionMatrix
                      permissionsGrouped={permissionsGrouped}
                      selectedPermissions={field.value || []}
                      onPermissionsChange={(perms) => field.onChange(perms)}
                      expandedModules={expandedModules}
                    />
                    <FormDescription>
                      Vyberte oprávnění pro tuto roli. Kliknutím na modul jej rozbalíte.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {editingRole?.isSystem && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Toto je systémová role. Lze upravit pouze zobrazovaný název a popis.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose()}
              >
                Zrušit
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-gradient-to-r from-primary to-purple-600"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Ukládání...'
                  : isEditing
                  ? 'Uložit změny'
                  : 'Vytvořit'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
