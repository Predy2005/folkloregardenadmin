import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { queryClient } from '@/shared/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form';
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { ReservationType } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { successToast, errorToast } from '@/shared/lib/toast-helpers';
import { useFormDialog } from '@/shared/hooks/useFormDialog';
import { PageHeader } from '@/shared/components/PageHeader';

const reservationTypeSchema = z.object({
  name: z.string().min(1, 'Název je povinný'),
  code: z.string().min(1, 'Kód je povinný').regex(/^[a-z0-9_]+$/, 'Kód musí obsahovat pouze malá písmena, čísla a podtržítka'),
  color: z.string().min(1, 'Barva je povinná'),
  sortOrder: z.coerce.number().int().min(0),
  note: z.string().optional().default(''),
});

type ReservationTypeForm = z.infer<typeof reservationTypeSchema>;

export default function ReservationTypesPage() {
  const dialog = useFormDialog<ReservationType>();

  const { data: types, isLoading } = useQuery({
    queryKey: ['/api/reservation-types'],
    queryFn: () => api.get<ReservationType[]>('/api/reservation-types'),
  });

  const form = useForm<ReservationTypeForm>({
    resolver: zodResolver(reservationTypeSchema),
    defaultValues: {
      name: '',
      code: '',
      color: '#3b82f6',
      sortOrder: 0,
      note: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ReservationTypeForm) => api.post('/api/reservation-types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservation-types'] });
      dialog.close();
      form.reset();
      successToast('Druh rezervace byl úspěšně vytvořen');
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ReservationTypeForm> }) =>
      api.put(`/api/reservation-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservation-types'] });
      dialog.close();
      form.reset();
      successToast('Druh rezervace byl úspěšně upraven');
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/reservation-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservation-types'] });
      successToast('Druh rezervace byl úspěšně smazán');
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const handleCreate = () => {
    form.reset({
      name: '',
      code: '',
      color: '#3b82f6',
      sortOrder: (types?.length ?? 0),
      note: '',
    });
    dialog.openCreate();
  };

  const handleEdit = (type: ReservationType) => {
    form.reset({
      name: type.name,
      code: type.code,
      color: type.color,
      sortOrder: type.sortOrder,
      note: type.note || '',
    });
    dialog.openEdit(type);
  };

  const handleDelete = (type: ReservationType) => {
    if (type.isSystem) {
      errorToast('Systémové druhy nelze smazat');
      return;
    }
    if (confirm(`Opravdu chcete smazat druh "${type.name}"?`)) {
      deleteMutation.mutate(type.id);
    }
  };

  const onSubmit = (data: ReservationTypeForm) => {
    if (dialog.editingItem) {
      // code cannot be changed on edit
      const { code: _code, ...updateData } = data;
      updateMutation.mutate({ id: dialog.editingItem.id, data: updateData });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Načítání druhů rezervací...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Druhy rezervací" description="Správa druhů/typů rezervací">
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nový druh
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seznam druhů</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Barva</TableHead>
                  <TableHead>Název</TableHead>
                  <TableHead>Kód</TableHead>
                  <TableHead className="text-center">Pořadí</TableHead>
                  <TableHead>Poznámka</TableHead>
                  <TableHead className="text-center">Systémový</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Žádné druhy rezervací
                    </TableCell>
                  </TableRow>
                ) : (
                  types?.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell>
                        <div
                          className="w-6 h-6 rounded-full border"
                          style={{ backgroundColor: type.color }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{type.code}</TableCell>
                      <TableCell className="text-center">{type.sortOrder}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{type.note || '-'}</TableCell>
                      <TableCell className="text-center">
                        {type.isSystem ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Systémový
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(type)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(type)}
                            disabled={type.isSystem}
                            className="text-destructive hover:text-destructive disabled:opacity-30"
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
      <Dialog open={dialog.isOpen} onOpenChange={dialog.setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {dialog.isEditing ? 'Upravit druh rezervace' : 'Nový druh rezervace'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název</FormLabel>
                    <FormControl>
                      <Input placeholder="Např. Voucher" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kód</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Např. voucher"
                        {...field}
                        disabled={dialog.isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barva</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={field.value}
                          onChange={field.onChange}
                          className="w-10 h-10 rounded border cursor-pointer"
                        />
                        <Input {...field} className="flex-1" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pořadí</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poznámka</FormLabel>
                    <FormControl>
                      <Input placeholder="Např. HOTEL interior" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => dialog.close()}>
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Ukládání...'
                    : dialog.isEditing
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
