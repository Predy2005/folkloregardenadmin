import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { queryClient } from '@/shared/lib/queryClient';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/shared/components/ui/form';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Plus, Edit, Trash2, Shield, Lock } from 'lucide-react';
import type { User, Role } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/shared/hooks/use-toast';
import dayjs from 'dayjs';

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

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
    queryKey: ['/api/permissions/users', editingUser?.id, 'roles'],
    queryFn: () => api.get<{ userId: number; username: string; roles: { id: number; name: string; displayName?: string }[] }>(`/api/permissions/users/${editingUser?.id}/roles`),
    enabled: !!editingUser,
  });
  const userRoles = userRolesData?.roles;

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
      // Create user first
      const user = await api.post<User>('/api/users', {
        username: data.username,
        email: data.email,
        password: data.password,
        roles: [], // Empty legacy roles
      });
      // Then assign roles via new API
      await api.put(`/api/permissions/users/${user.id}/roles`, {
        roleIds: data.roleIds,
      });
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: 'Uživatel byl úspěšně vytvořen' });
    },
    onError: (error: any) => {
      toast({
        title: 'Chyba při vytváření uživatele',
        description: error.response?.data?.error || 'Neznámá chyba',
        variant: 'destructive'
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserForm> }) => {
      // Update user basic info
      const updateData: any = {
        username: data.username,
        email: data.email,
      };
      if (data.password) {
        updateData.password = data.password;
      }
      await api.put(`/api/users/${id}`, updateData);

      // Update roles via new API
      if (data.roleIds) {
        await api.put(`/api/permissions/users/${id}/roles`, {
          roleIds: data.roleIds,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/users'] });
      setIsDialogOpen(false);
      setEditingUser(null);
      form.reset();
      toast({ title: 'Uživatel byl úspěšně upraven' });
    },
    onError: (error: any) => {
      toast({
        title: 'Chyba při úpravě uživatele',
        description: error.response?.data?.error || 'Neznámá chyba',
        variant: 'destructive'
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'Uživatel byl úspěšně smazán' });
    },
    onError: (error: any) => {
      toast({
        title: 'Chyba při mazání uživatele',
        description: error.response?.data?.error || 'Neznámá chyba',
        variant: 'destructive'
      });
    },
  });

  const handleCreate = () => {
    setEditingUser(null);
    // Default to VIEWER role if available
    const viewerRole = roles?.find(r => r.name === 'VIEWER');
    form.reset({
      username: '',
      email: '',
      password: '',
      roleIds: viewerRole ? [viewerRole.id] : [],
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    // Form will be updated when userRoles query completes
    form.reset({
      username: user.username,
      email: user.email,
      password: '',
      roleIds: [],
    });
    setIsDialogOpen(true);
  };

  // Update form when userRoles data is loaded
  const currentRoleIds = userRoles?.map(r => r.id) || [];
  if (editingUser && currentRoleIds.length > 0 && form.getValues('roleIds').length === 0) {
    form.setValue('roleIds', currentRoleIds);
  }

  const handleDelete = (user: User) => {
    // Check if user is super admin
    if (user.isSuperAdmin) {
      toast({
        title: 'Nelze smazat super administrátora',
        variant: 'destructive'
      });
      return;
    }
    if (confirm(`Opravdu chcete smazat uživatele "${user.username}"?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const onSubmit = (data: UserForm) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Find role by name for display
  const getRoleDisplay = (roleName: string) => {
    const role = roles?.find(r => r.name === roleName);
    return role?.displayName || roleName;
  };

  const isRoleSystem = (roleName: string) => {
    const role = roles?.find(r => r.name === roleName);
    return role?.isSystem ?? false;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2">Uživatelé</h1>
          <p className="text-muted-foreground">Správa uživatelů systému</p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-user" className="bg-gradient-to-r from-primary to-purple-600">
          <Plus className="w-4 h-4 mr-2" />
          Přidat uživatele
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
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
                {users?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Žádní uživatelé
                    </TableCell>
                  </TableRow>
                ) : (
                  users?.map((user) => (
                    <TableRow key={user.id} className="hover-elevate" data-testid={`row-user-${user.id}`}>
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
                            onClick={() => handleEdit(user)}
                            data-testid={`button-edit-${user.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user)}
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
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingUser ? `Upravit uživatele: ${editingUser.username}` : 'Nový uživatel'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uživatelské jméno</FormLabel>
                    <FormControl>
                      <Input placeholder="uzivatel123" data-testid="input-username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="uzivatel@email.cz" data-testid="input-email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heslo {editingUser && '(ponechte prázdné pro zachování)'}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={editingUser ? 'Nové heslo...' : 'Heslo'}
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roleIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <div className="border rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
                      {roles?.sort((a, b) => b.priority - a.priority).map((role) => {
                        const isSelected = field.value?.includes(role.id);
                        const isSuperAdminRole = role.name === 'SUPER_ADMIN';

                        return (
                          <div key={role.id} className="flex items-start space-x-3 py-1">
                            <Checkbox
                              id={`role-${role.id}`}
                              checked={isSelected}
                              disabled={isSuperAdminRole}
                              onCheckedChange={(checked) => {
                                const newRoleIds = checked
                                  ? [...(field.value || []), role.id]
                                  : field.value?.filter((id) => id !== role.id) || [];
                                field.onChange(newRoleIds);
                              }}
                              data-testid={`checkbox-role-${role.id}`}
                            />
                            <div className="flex-1 min-w-0">
                              <label
                                htmlFor={`role-${role.id}`}
                                className={`text-sm font-medium cursor-pointer flex items-center gap-2 ${isSuperAdminRole ? 'text-muted-foreground' : ''}`}
                              >
                                {role.isSystem && <Lock className="w-3 h-3" />}
                                {role.displayName || role.name}
                              </label>
                              {role.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {role.description}
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {role.priority}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                    <FormDescription>
                      Vyberte role pro uživatele. Role určují oprávnění.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {editingUser?.isSuperAdmin && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Tento uživatel je super administrátor. Některé změny mohou být omezené.
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
                  data-testid="button-save-user"
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Ukládání...'
                    : editingUser
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
