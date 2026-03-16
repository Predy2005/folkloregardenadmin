import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { queryClient } from '@/shared/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/shared/components/ui/form';
import { Plus, Edit, Trash2, DollarSign, Calendar, Users, Baby, User } from 'lucide-react';
import { Checkbox } from '@/shared/components/ui/checkbox';
import type { PricingDefault, PricingDateOverride } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { successToast, errorToast } from '@/shared/lib/toast-helpers';
import { formatCurrency } from '@/shared/lib/formatting';
import { useFormDialog } from '@/shared/hooks/useFormDialog';
import { useCrudMutations } from '@/shared/hooks/useCrudMutations';
import dayjs from 'dayjs';
import { Badge } from '@/shared/components/ui/badge';
import { PageHeader } from "@/shared/components/PageHeader";

const defaultPriceSchema = z.object({
  adultPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  childPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  infantPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  includeMeal: z.boolean(),
});

const dateOverrideSchema = z.object({
  date: z.string().min(1, 'Datum je povinné'),
  adultPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  childPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  infantPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  includeMeal: z.boolean(),
  reason: z.string().optional(),
});

type DefaultPriceForm = z.infer<typeof defaultPriceSchema>;
type DateOverrideForm = z.infer<typeof dateOverrideSchema>;

export default function Pricing() {
  const dialog = useFormDialog<PricingDateOverride>();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch default prices
  const { data: defaultPrices, isLoading: isLoadingDefaults } = useQuery({
    queryKey: ['/api/pricing/defaults'],
    queryFn: () => api.get<PricingDefault>('/api/pricing/defaults'),
  });

  // Fetch date overrides
  const { data: dateOverrides, isLoading: isLoadingOverrides } = useQuery({
    queryKey: ['/api/pricing/date-overrides'],
    queryFn: () => api.get<PricingDateOverride[]>('/api/pricing/date-overrides'),
  });

  // Default prices form
  const defaultForm = useForm<DefaultPriceForm>({
    resolver: zodResolver(defaultPriceSchema),
    values: {
      adultPrice: defaultPrices?.adultPrice ?? 0,
      childPrice: defaultPrices?.childPrice ?? 0,
      infantPrice: defaultPrices?.infantPrice ?? 0,
      includeMeal: defaultPrices?.includeMeal ?? false,
    },
  });

  // Date override form
  const overrideForm = useForm<DateOverrideForm>({
    resolver: zodResolver(dateOverrideSchema),
    defaultValues: {
      date: '',
      adultPrice: 0,
      childPrice: 0,
      infantPrice: 0,
      includeMeal: false,
      reason: '',
    },
  });

  // Update default prices mutation (custom, doesn't fit useCrudMutations)
  const updateDefaultMutation = useMutation({
    mutationFn: (data: DefaultPriceForm) => api.put('/api/pricing/defaults', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pricing/defaults'] });
      successToast('Výchozí ceny byly úspěšně aktualizovány');
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  // Date override CRUD mutations
  const { createMutation: createOverrideMutation, updateMutation: updateOverrideMutation, deleteMutation: deleteOverrideMutation } = useCrudMutations<DateOverrideForm>({
    endpoint: '/api/pricing/date-overrides',
    queryKey: ['/api/pricing/date-overrides'],
    entityName: 'Cenový přepis',
    onCreateSuccess: () => { dialog.close(); overrideForm.reset(); },
    onUpdateSuccess: () => { dialog.close(); overrideForm.reset(); },
  });

  const handleUpdateDefaults = (data: DefaultPriceForm) => {
    updateDefaultMutation.mutate(data);
  };

  const handleCreateOverride = () => {
    overrideForm.reset({
      date: '',
      adultPrice: defaultPrices?.adultPrice ?? 0,
      childPrice: defaultPrices?.childPrice ?? 0,
      infantPrice: defaultPrices?.infantPrice ?? 0,
      includeMeal: defaultPrices?.includeMeal ?? false,
      reason: '',
    });
    dialog.openCreate();
  };

  const handleEditOverride = (override: PricingDateOverride) => {
    overrideForm.reset({
      date: override.date,
      adultPrice: override.adultPrice,
      childPrice: override.childPrice,
      infantPrice: override.infantPrice,
      includeMeal: override.includeMeal,
      reason: override.reason || '',
    });
    dialog.openEdit(override);
  };

  const handleDeleteOverride = (id: number) => {
    if (confirm('Opravdu chcete smazat tento cenový přepis?')) {
      deleteOverrideMutation.mutate(id);
    }
  };

  const onSubmitOverride = (data: DateOverrideForm) => {
    if (dialog.editingItem) {
      updateOverrideMutation.mutate({ id: dialog.editingItem.id, data });
    } else {
      createOverrideMutation.mutate(data);
    }
  };

  // Filter date overrides by search term
  const filteredOverrides = dateOverrides?.filter((override) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      override.date.includes(searchLower) ||
      override.reason?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Cenník" description="Nastavení cen rezervací na osobu podle typu" />

      {/* Default Prices Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Výchozí ceny
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingDefaults ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : (
            <Form {...defaultForm}>
              <form onSubmit={defaultForm.handleSubmit(handleUpdateDefaults)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={defaultForm.control}
                    name="adultPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Dospělí
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-adult-price"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              Kč
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={defaultForm.control}
                    name="childPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Děti 3-12 let
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-child-price"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              Kč
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={defaultForm.control}
                    name="infantPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Baby className="w-4 h-4" />
                          Batolata 0-2 roky
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-infant-price"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              Kč
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={defaultForm.control}
                  name="includeMeal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-include-meal"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Cena zahrnuje jídlo
                        </FormLabel>
                        <FormDescription>
                          Pokud je zaškrtnuto, uvedená cena již zahrnuje jídlo. Pokud ne, cena jídla se bude připočítávat zvlášť.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={updateDefaultMutation.isPending}
                    className="bg-gradient-to-r from-primary to-purple-600"
                    data-testid="button-save-defaults"
                  >
                    {updateDefaultMutation.isPending ? 'Ukládání...' : 'Uložit výchozí ceny'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Date Overrides Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Datum-specifické ceny
            </CardTitle>
            <Button
              onClick={handleCreateOverride}
              className="bg-gradient-to-r from-primary to-purple-600"
              data-testid="button-create-override"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nový přepis
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Hledat podle data nebo důvodu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-overrides"
            />
          </div>

          {isLoadingOverrides ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredOverrides && filteredOverrides.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Důvod</TableHead>
                    <TableHead className="text-right">Dospělí</TableHead>
                    <TableHead className="text-right">Děti 3-12</TableHead>
                    <TableHead className="text-right">Batolata 0-2</TableHead>
                    <TableHead>Zahrnuje jídlo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOverrides.map((override) => {
                    const isPast = dayjs(override.date).isBefore(dayjs(), 'day');
                    const isToday = dayjs(override.date).isSame(dayjs(), 'day');
                    return (
                      <TableRow key={override.id} data-testid={`row-override-${override.id}`}>
                        <TableCell className="font-mono">
                          {dayjs(override.date).format('DD.MM.YYYY')}
                        </TableCell>
                        <TableCell>{override.reason || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(override.adultPrice)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(override.childPrice)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(override.infantPrice)}
                        </TableCell>
                        <TableCell>
                          {override.includeMeal ? (
                            <Badge variant="default" className="bg-green-600">
                              Ano
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Ne</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isToday && (
                            <Badge variant="default" className="bg-green-600">
                              Dnes
                            </Badge>
                          )}
                          {isPast && !isToday && (
                            <Badge variant="secondary">Minulost</Badge>
                          )}
                          {!isPast && !isToday && (
                            <Badge variant="default" className="bg-purple-600">
                              Budoucnost
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditOverride(override)}
                              data-testid={`button-edit-override-${override.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteOverride(override.id)}
                              data-testid={`button-delete-override-${override.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Žádné výsledky' : 'Zatím nebyly vytvořeny žádné datum-specifické přepisy'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Override Dialog */}
      <Dialog open={dialog.isOpen} onOpenChange={dialog.setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.isEditing ? 'Upravit cenový přepis' : 'Nový cenový přepis'}
            </DialogTitle>
          </DialogHeader>

          <Form {...overrideForm}>
            <form onSubmit={overrideForm.handleSubmit(onSubmitOverride)} className="space-y-4">
              <FormField
                control={overrideForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-override-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={overrideForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Důvod (volitelné)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="např. Premium datum, Vánoce..."
                        {...field}
                        data-testid="input-override-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={overrideForm.control}
                  name="adultPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dospělí</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-override-adult-price"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            Kč
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={overrideForm.control}
                  name="childPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Děti 3-12</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-override-child-price"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            Kč
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={overrideForm.control}
                  name="infantPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batolata</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-override-infant-price"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            Kč
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={overrideForm.control}
                name="includeMeal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-override-include-meal"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Cena zahrnuje jídlo
                      </FormLabel>
                      <FormDescription>
                        Pokud je zaškrtnuto, uvedená cena již zahrnuje jídlo.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => dialog.close()}
                  data-testid="button-cancel-override"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createOverrideMutation.isPending || updateOverrideMutation.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                  data-testid="button-submit-override"
                >
                  {createOverrideMutation.isPending || updateOverrideMutation.isPending
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
