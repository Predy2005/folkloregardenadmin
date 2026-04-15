import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { queryClient } from '@/shared/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import type { DisabledDate } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { successToast, errorToast } from '@/shared/lib/toast-helpers';
import { useFormDialog } from '@/shared/hooks/useFormDialog';
import dayjs from 'dayjs';
import { Badge } from '@/shared/components/ui/badge';
import { PageHeader } from "@/shared/components/PageHeader";

// České státní svátky
// Velikonoční pondělí pro jednotlivé roky (pohyblivý svátek)
const getEasterMonday = (year: number) => {
  const easterMondayDates: Record<number, string> = {
    2025: '2025-04-21',
    2026: '2026-04-06',
    2027: '2027-03-29',
    2028: '2028-04-17',
    2029: '2029-04-02',
    2030: '2030-04-22',
  };
  return easterMondayDates[year] || null;
};

const getCzechHolidays = (year: number) => {
  const holidays = [
    { date: `${year}-01-01`, name: 'Nový rok' },
    { date: `${year}-05-01`, name: 'Svátek práce' },
    { date: `${year}-05-08`, name: 'Den vítězství' },
    { date: `${year}-07-05`, name: 'Den slovanských věrozvěstů Cyrila a Metoděje' },
    { date: `${year}-07-06`, name: 'Den upálení mistra Jana Husa' },
    { date: `${year}-09-28`, name: 'Den české státnosti' },
    { date: `${year}-10-28`, name: 'Den vzniku samostatného československého státu' },
    { date: `${year}-11-17`, name: 'Den boje za svobodu a demokracii' },
    { date: `${year}-12-24`, name: 'Štědrý den' },
    { date: `${year}-12-25`, name: '1. svátek vánoční' },
    { date: `${year}-12-26`, name: '2. svátek vánoční' },
  ];

  // Přidáme velikonoční pondělí pokud existuje pro daný rok
  const easterMonday = getEasterMonday(year);
  if (easterMonday) {
    holidays.splice(1, 0, { date: easterMonday, name: 'Velikonoční pondělí' });
  }

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
};

const disabledDateSchema = z.object({
  dateFrom: z.string().min(1, 'Datum je povinné'),
  dateTo: z.string().optional(),
  reason: z.string().optional(),
  project: z.string().default('reservations'),
});

type DisabledDateForm = z.infer<typeof disabledDateSchema>;

export default function DisabledDates() {
  const dialog = useFormDialog<DisabledDate>();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const czechHolidays = getCzechHolidays(selectedYear);

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
      const payload: { dateFrom: string; reason: string; project: string; dateTo?: string } = {
        dateFrom: data.dateFrom,
        reason: data.reason || '',
        project: data.project || 'reservations',
      };
      if (data.dateTo) {
        payload.dateTo = data.dateTo;
      }
      return api.post('/api/disable-dates', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/disable-dates'] });
      dialog.close();
      form.reset();
      successToast('Blokace byla úspěšně vytvořena');
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DisabledDateForm }) =>
      api.put(`/api/disable-dates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/disable-dates'] });
      dialog.close();
      form.reset();
      successToast('Blokace byla úspěšně upravena');
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/disable-dates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/disable-dates'] });
      successToast('Blokace byla úspěšně smazána');
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const handleCreate = () => {
    form.reset({
      dateFrom: '',
      dateTo: '',
      reason: '',
      project: 'reservations',
    });
    dialog.openCreate();
  };

  const handleEdit = (date: DisabledDate) => {
    form.reset({
      dateFrom: date.dateFrom,
      dateTo: date.dateTo || '',
      reason: date.reason || '',
      project: date.project || 'reservations',
    });
    dialog.openEdit(date);
  };

  const handleDelete = (id: number) => {
    if (confirm('Opravdu chcete smazat tuto blokaci?')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: DisabledDateForm) => {
    if (dialog.editingItem) {
      updateMutation.mutate({ id: dialog.editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAddHoliday = (holiday: { date: string; name: string }) => {
    // Check if holiday already exists
    const exists = disabledDates?.some(
      (d) => d.dateFrom === holiday.date && d.reason === holiday.name
    );

    if (exists) {
      errorToast(`${holiday.name} je již v seznamu blokovaných datumů`);
      return;
    }

    createMutation.mutate({
      dateFrom: holiday.date,
      dateTo: holiday.date,
      reason: holiday.name,
      project: 'reservations',
    });
  };

  const handleAddDateRange = () => {
    const dateFrom = form.getValues('dateFrom');
    const dateTo = form.getValues('dateTo');

    if (!dateFrom) {
      errorToast('Vyplňte alespoň datum "Od"');
      return;
    }

    onSubmit(form.getValues());
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

  // Helper to check if holiday is already blocked
  const isHolidayBlocked = (holidayDate: string, holidayName: string) => {
    return disabledDates?.some(
      (d) => d.dateFrom === holidayDate && d.reason === holidayName
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Blokované termíny" description="Správa blokovaných dat pro rezervace" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Add Form & Holidays */}
        <div className="space-y-6">
          {/* Quick Add Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Přidat blokovaný datum</CardTitle>
              <p className="text-sm text-muted-foreground">
                Zvol datum, kdy nebude možné provést rezervaci
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Vyberte datum</label>
                <Input
                  type="date"
                  value={form.watch('dateFrom')}
                  onChange={(e) => form.setValue('dateFrom', e.target.value)}
                  data-testid="input-quick-date-from"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Důvod (volitelné)</label>
                <Input
                  placeholder="Např. Státní svátek, Údržba..."
                  value={form.watch('reason')}
                  onChange={(e) => form.setValue('reason', e.target.value)}
                  data-testid="input-quick-reason"
                />
              </div>

              <Button
                onClick={handleAddDateRange}
                disabled={createMutation.isPending}
                className="w-full bg-primary hover:bg-primary/90"
                data-testid="button-quick-add"
              >
                <Plus className="w-4 h-4 mr-2" />
                Přidat
              </Button>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Přidat rozsah datumů</label>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Od</label>
                    <Input
                      type="date"
                      value={form.watch('dateFrom')}
                      onChange={(e) => form.setValue('dateFrom', e.target.value)}
                      data-testid="input-range-from"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Do</label>
                    <Input
                      type="date"
                      value={form.watch('dateTo')}
                      onChange={(e) => form.setValue('dateTo', e.target.value)}
                      data-testid="input-range-to"
                    />
                  </div>
                  <Button
                    onClick={handleAddDateRange}
                    disabled={createMutation.isPending}
                    variant="outline"
                    className="w-full"
                    data-testid="button-add-range"
                  >
                    Přidat rozsah
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Czech Holidays */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">České státní svátky</CardTitle>
              <p className="text-sm text-muted-foreground">
                Zvol datum, kdy nebude možné provést rezervaci
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {czechHolidays.map((holiday) => {
                  const isBlocked = isHolidayBlocked(holiday.date, holiday.name);
                  return (
                    <div
                      key={holiday.date}
                      className="flex items-center justify-between p-2 rounded-md hover-elevate"
                      data-testid={`holiday-${holiday.date}`}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {dayjs(holiday.date).format('DD.MM.YYYY')} - {holiday.name}
                        </div>
                      </div>
                      {isBlocked ? (
                        <Badge variant="secondary" className="text-xs">
                          Blokováno
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddHoliday(holiday)}
                          disabled={createMutation.isPending}
                          data-testid={`button-add-holiday-${holiday.date}`}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Disabled Dates Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Seznam blokovaných datumů</CardTitle>
              <p className="text-sm text-muted-foreground">
                Zde jsou všechny datumy, kdy nelze provést rezervaci
              </p>
            </CardHeader>
            <CardContent>
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
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialog.isOpen} onOpenChange={dialog.setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {dialog.isEditing ? 'Upravit blokaci' : 'Nová blokace'}
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
                  onClick={() => dialog.close()}
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-disabled-date"
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
