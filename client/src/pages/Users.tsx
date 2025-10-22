import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import type { User } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import dayjs from 'dayjs';

const userSchema = z.object({
  username: z.string().min(3, 'Uživatelské jméno musí mít alespoň 3 znaky'),
  email: z.string().email('Zadejte platný email'),
  password: z.string().min(6, 'Heslo musí mít alespoň 6 znaků').optional(),
  role: z.string().default('ROLE_USER'),
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

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      role: 'ROLE_USER',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: UserForm) => api.post('/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: 'Uživatel byl úspěšně vytvořen' });
    },
    onError: () => {
      toast({ title: 'Chyba při vytváření uživatele', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserForm> }) =>
      api.put(`/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsDialogOpen(false);
      setEditingUser(null);
      form.reset();
      toast({ title: 'Uživatel byl úspěšně upraven' });
    },
    onError: () => {
      toast({ title: 'Chyba při úpravě uživatele', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'Uživatel byl úspěšně smazán' });
    },
    onError: () => {
      toast({ title: 'Chyba při mazání uživatele', variant: 'destructive' });
    },
  });

  const handleCreate = () => {
    setEditingUser(null);
    form.reset({
      username: '',
      email: '',
      password: '',
      role: 'ROLE_USER',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      email: user.email,
      password: '',
      role: user.roles[0] || 'ROLE_USER',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Opravdu chcete smazat tohoto uživatele?')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: UserForm) => {
    if (editingUser) {
      const updateData: any = {
        username: data.username,
        email: data.email,
        role: data.role,
      };
      if (data.password) {
        updateData.password = data.password;
      }
      updateMutation.mutate({ id: editingUser.id, data: updateData });
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
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        {user.roles?.map((role) => (
                          <Badge key={role} variant="outline" className="mr-1">
                            <Shield className="w-3 h-3 mr-1" />
                            {role.replace('ROLE_', '')}
                          </Badge>
                        ))}
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
                            onClick={() => handleDelete(user.id)}
                            className="text-destructive hover:text-destructive"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingUser ? 'Upravit uživatele' : 'Nový uživatel'}
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
