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
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { DisabledDate } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import dayjs from 'dayjs';

const disabledDateSchema = z.object({
  dateFrom: z.string().min(1, 'Datum je povinné'),
  dateTo: z.string().optional(),
  reason: z.string().optional(),
  project: z.string().default('reservations'),
});

type DisabledDateForm = z.infer<typeof disabledDateSchema>;

export default function DisabledDates() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<DisabledDate | null>(null);
  const { toast } = useToast();

  const { data: disabledDates, isLoading } = useQuery({
    queryKey: ['/api/disable-dates'],
    queryFn: () => api.get<DisabledDate[]>('/api/disable-dates'),
  });

  const form = useForm<DisabledDateForm>({
    resolver: zodResolver(disabledDateSchema),
    defaultValues: {
      dateFrom: '',
      dateTo: '',
      reason: '',
      project: 'reservations',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: DisabledDateForm) => {
      const payload: any = {
        dateFrom: data.dateFrom,
        reason: data.reason,
        project: data.project,
      };
      if (data.dateTo) {
        payload.dateTo = data.dateTo;
      }
      return api.post('/api/disable-dates', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/disable-dates'] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: 'Blokace byla úspěšně vytvořena' });
    },
    onError: () => {
      toast({ title: 'Chyba při vytváření blokace', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DisabledDateForm }) =>
      api.put(`/api/disable-dates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/disable-dates'] });
      setIsDialogOpen(false);
      setEditingDate(null);
      form.reset();
      toast({ title: 'Blokace byla úspěšně upravena' });
    },
    onError: () => {
      toast({ title: 'Chyba při úpravě blokace', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/disable-dates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/disable-dates'] });
      toast({ title: 'Blokace byla úspěšně smazána' });
    },
    onError: () => {
      toast({ title: 'Chyba při mazání blokace', variant: 'destructive' });
    },
  });

  const handleCreate = () => {
    setEditingDate(null);
    form.reset({
      dateFrom: '',
      dateTo: '',
      reason: '',
      project: 'reservations',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (date: DisabledDate) => {
    setEditingDate(date);
    form.reset({
      dateFrom: date.dateFrom,
      dateTo: date.dateTo || '',
      reason: date.reason || '',
      project: date.project || 'reservations',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Opravdu chcete smazat tuto blokaci?')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: DisabledDateForm) => {
    if (editingDate) {
      updateMutation.mutate({ id: editingDate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Načítání blokací...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2">Blokované termíny</h1>
          <p className="text-muted-foreground">Správa blokovaných dat pro rezervace</p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-disabled-date" className="bg-gradient-to-r from-primary to-purple-600">
          <Plus className="w-4 h-4 mr-2" />
          Přidat blokaci
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Datum od</TableHead>
                  <TableHead>Datum do</TableHead>
                  <TableHead>Důvod</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disabledDates?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Žádné blokované termíny
                    </TableCell>
                  </TableRow>
                ) : (
                  disabledDates?.map((date) => (
                    <TableRow key={date.id} className="hover-elevate" data-testid={`row-disabled-date-${date.id}`}>
                      <TableCell className="font-mono text-sm">#{date.id}</TableCell>
                      <TableCell>{dayjs(date.dateFrom).format('DD.MM.YYYY')}</TableCell>
                      <TableCell>
                        {date.dateTo ? dayjs(date.dateTo).format('DD.MM.YYYY') : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {date.reason || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {date.project || 'reservations'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(date)}
                            data-testid={`button-edit-${date.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(date.id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-${date.id}`}
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
              {editingDate ? 'Upravit blokaci' : 'Nová blokace'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="dateFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum od</FormLabel>
                    <FormControl>
                      <Input type="date" data-testid="input-date-from" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum do (volitelné)</FormLabel>
                    <FormControl>
                      <Input type="date" data-testid="input-date-to" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Důvod (volitelné)</FormLabel>
                    <FormControl>
                      <Input placeholder="Např. Svatba" data-testid="input-reason" {...field} />
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
                  data-testid="button-save-disabled-date"
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Ukládání...'
                    : editingDate
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
