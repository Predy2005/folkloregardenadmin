import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { queryClient } from '@/shared/lib/queryClient';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/shared/components/ui/form';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Plus, Edit, Trash2, Shield, Lock, Users, ChevronDown, ChevronRight } from 'lucide-react';
import type { Role, Permission, PermissionGroup } from '@shared/types';
import { PERMISSION_MODULE_LABELS, PERMISSION_ACTION_LABELS } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/shared/hooks/use-toast';
import dayjs from 'dayjs';

const roleSchema = z.object({
  name: z.string().min(2, 'Název musí mít alespoň 2 znaky').regex(/^[A-Z_]+$/, 'Název musí být velkými písmeny (A-Z, _)'),
  displayName: z.string().min(2, 'Zobrazovaný název musí mít alespoň 2 znaky'),
  description: z.string().optional(),
  priority: z.number().min(0).max(100),
  permissions: z.array(z.string()),
});

type RoleForm = z.infer<typeof roleSchema>;

export default function Roles() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['/api/roles'],
    queryFn: () => api.get<{ roles: Role[] }>('/api/roles'),
  });
  const roles = rolesData?.roles;

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

  const createMutation = useMutation({
    mutationFn: (data: RoleForm) => api.post('/api/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: 'Role byla úspěšně vytvořena' });
    },
    onError: (error: any) => {
      toast({
        title: 'Chyba při vytváření role',
        description: error.response?.data?.error || 'Neznámá chyba',
        variant: 'destructive'
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RoleForm> }) =>
      api.put(`/api/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      setIsDialogOpen(false);
      setEditingRole(null);
      form.reset();
      toast({ title: 'Role byla úspěšně upravena' });
    },
    onError: (error: any) => {
      toast({
        title: 'Chyba při úpravě role',
        description: error.response?.data?.error || 'Neznámá chyba',
        variant: 'destructive'
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      toast({ title: 'Role byla úspěšně smazána' });
    },
    onError: (error: any) => {
      toast({
        title: 'Chyba při mazání role',
        description: error.response?.data?.error || 'Neznámá chyba',
        variant: 'destructive'
      });
    },
  });

  const handleCreate = () => {
    setEditingRole(null);
    form.reset({
      name: '',
      displayName: '',
      description: '',
      priority: 0,
      permissions: [],
    });
    setExpandedModules(new Set());
    setIsDialogOpen(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    form.reset({
      name: role.name,
      displayName: role.displayName || '',
      description: role.description || '',
      priority: role.priority,
      permissions: role.permissions || [],
    });
    // Expand modules that have selected permissions
    if (role.permissions && permissionsGrouped) {
      const modulesWithPerms = new Set<string>();
      Object.entries(permissionsGrouped).forEach(([module, perms]) => {
        if (perms.some(p => role.permissions?.includes(p.key))) {
          modulesWithPerms.add(module);
        }
      });
      setExpandedModules(modulesWithPerms);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = (role: Role) => {
    if (role.isSystem) {
      toast({ title: 'Systémové role nelze smazat', variant: 'destructive' });
      return;
    }
    if (role.userCount > 0) {
      toast({
        title: 'Nelze smazat roli',
        description: `Role je přiřazena ${role.userCount} uživatelům`,
        variant: 'destructive'
      });
      return;
    }
    if (confirm(`Opravdu chcete smazat roli "${role.displayName || role.name}"?`)) {
      deleteMutation.mutate(role.id);
    }
  };

  const toggleModule = (module: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(module)) {
      newExpanded.delete(module);
    } else {
      newExpanded.add(module);
    }
    setExpandedModules(newExpanded);
  };

  const toggleAllModulePermissions = (module: string, permissions: Permission[], checked: boolean) => {
    const currentPerms = form.getValues('permissions') || [];
    const modulePermKeys = permissions.map(p => p.key);

    if (checked) {
      // Add all permissions from this module
      const newPerms = Array.from(new Set([...currentPerms, ...modulePermKeys]));
      form.setValue('permissions', newPerms, { shouldDirty: true });
    } else {
      // Remove all permissions from this module
      const newPerms = currentPerms.filter(p => !modulePermKeys.includes(p));
      form.setValue('permissions', newPerms, { shouldDirty: true });
    }
  };

  const isModuleFullySelected = (permissions: Permission[], selectedPerms: string[]) => {
    return permissions.every(p => selectedPerms.includes(p.key));
  };

  const isModulePartiallySelected = (permissions: Permission[], selectedPerms: string[]) => {
    const selected = permissions.filter(p => selectedPerms.includes(p.key));
    return selected.length > 0 && selected.length < permissions.length;
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2">Role</h1>
          <p className="text-muted-foreground">Správa rolí a jejich oprávnění</p>
        </div>
        <Button onClick={handleCreate} className="bg-gradient-to-r from-primary to-purple-600">
          <Plus className="w-4 h-4 mr-2" />
          Přidat roli
        </Button>
      </div>

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
                    <TableRow key={role.id} className="hover-elevate">
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
                                onClick={() => handleEdit(role)}
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
                                onClick={() => handleDelete(role)}
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              {!editingRole?.isSystem && (
                <FormField
                  control={form.control}
                  name="permissions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Oprávnění</FormLabel>
                      <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                        {permissionsGrouped && Object.entries(permissionsGrouped).map(([module, permissions]) => {
                          const isExpanded = expandedModules.has(module);
                          const isFullySelected = isModuleFullySelected(permissions, field.value || []);
                          const isPartiallySelected = isModulePartiallySelected(permissions, field.value || []);

                          return (
                            <div key={module}>
                              <div
                                className="flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 cursor-pointer"
                                onClick={() => toggleModule(module)}
                              >
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={isFullySelected}
                                    className={isPartiallySelected ? 'data-[state=checked]:bg-primary/50' : ''}
                                    onCheckedChange={(checked) => {
                                      toggleAllModulePermissions(module, permissions, !!checked);
                                    }}
                                  />
                                </div>
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                                <span className="font-medium">
                                  {PERMISSION_MODULE_LABELS[module] || module}
                                </span>
                                <Badge variant="outline" className="ml-auto">
                                  {permissions.filter(p => field.value?.includes(p.key)).length}/{permissions.length}
                                </Badge>
                              </div>

                              {isExpanded && (
                                <div className="p-3 pl-12 grid grid-cols-2 md:grid-cols-4 gap-2 bg-background">
                                  {permissions.map((permission) => (
                                    <div key={permission.id} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`perm-${permission.id}`}
                                        checked={field.value?.includes(permission.key)}
                                        onCheckedChange={(checked) => {
                                          const newPerms = checked
                                            ? [...(field.value || []), permission.key]
                                            : field.value?.filter((p) => p !== permission.key) || [];
                                          field.onChange(newPerms);
                                        }}
                                      />
                                      <label
                                        htmlFor={`perm-${permission.id}`}
                                        className="text-sm cursor-pointer"
                                        title={permission.description}
                                      >
                                        {PERMISSION_ACTION_LABELS[permission.action] || permission.action}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
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
                  onClick={() => setIsDialogOpen(false)}
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
                    : editingRole
                    ? 'Uložit změny'
                    : 'Vytvořit'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}