import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Edit, Trash2, DollarSign, Calendar, Users, Baby, User } from 'lucide-react';
import type { PricingDefault, PricingDateOverride } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';

const defaultPriceSchema = z.object({
  adultPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  childPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  infantPrice: z.number().min(0, 'Cena musí být kladné číslo'),
});

const dateOverrideSchema = z.object({
  date: z.string().min(1, 'Datum je povinné'),
  adultPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  childPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  infantPrice: z.number().min(0, 'Cena musí být kladné číslo'),
  reason: z.string().optional(),
});

type DefaultPriceForm = z.infer<typeof defaultPriceSchema>;
type DateOverrideForm = z.infer<typeof dateOverrideSchema>;

export default function Pricing() {
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<PricingDateOverride | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

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
      reason: '',
    },
  });

  // Update default prices mutation
  const updateDefaultMutation = useMutation({
    mutationFn: (data: DefaultPriceForm) => api.put('/api/pricing/defaults', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pricing/defaults'] });
      toast({ title: 'Výchozí ceny byly úspěšně aktualizovány' });
    },
    onError: () => {
      toast({ title: 'Chyba při aktualizaci výchozích cen', variant: 'destructive' });
    },
  });

  // Create date override mutation
  const createOverrideMutation = useMutation({
    mutationFn: (data: DateOverrideForm) => api.post('/api/pricing/date-overrides', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pricing/date-overrides'] });
      setIsOverrideDialogOpen(false);
      overrideForm.reset();
      toast({ title: 'Cenový přepis byl úspěšně vytvořen' });
    },
    onError: () => {
      toast({ title: 'Chyba při vytváření cenového přepisu', variant: 'destructive' });
    },
  });

  // Update date override mutation
  const updateOverrideMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DateOverrideForm }) =>
      api.put(`/api/pricing/date-overrides/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pricing/date-overrides'] });
      setIsOverrideDialogOpen(false);
      setEditingOverride(null);
      overrideForm.reset();
      toast({ title: 'Cenový přepis byl úspěšně upraven' });
    },
    onError: () => {
      toast({ title: 'Chyba při úpravě cenového přepisu', variant: 'destructive' });
    },
  });

  // Delete date override mutation
  const deleteOverrideMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/pricing/date-overrides/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pricing/date-overrides'] });
      toast({ title: 'Cenový přepis byl úspěšně smazán' });
    },
    onError: () => {
      toast({ title: 'Chyba při mazání cenového přepisu', variant: 'destructive' });
    },
  });

  const handleUpdateDefaults = (data: DefaultPriceForm) => {
    updateDefaultMutation.mutate(data);
  };

  const handleCreateOverride = () => {
    setEditingOverride(null);
    overrideForm.reset({
      date: '',
      adultPrice: defaultPrices?.adultPrice ?? 0,
      childPrice: defaultPrices?.childPrice ?? 0,
      infantPrice: defaultPrices?.infantPrice ?? 0,
      reason: '',
    });
    setIsOverrideDialogOpen(true);
  };

  const handleEditOverride = (override: PricingDateOverride) => {
    setEditingOverride(override);
    overrideForm.reset({
      date: override.date,
      adultPrice: override.adultPrice,
      childPrice: override.childPrice,
      infantPrice: override.infantPrice,
      reason: override.reason || '',
    });
    setIsOverrideDialogOpen(true);
  };

  const handleDeleteOverride = (id: number) => {
    if (confirm('Opravdu chcete smazat tento cenový přepis?')) {
      deleteOverrideMutation.mutate(id);
    }
  };

  const onSubmitOverride = (data: DateOverrideForm) => {
    if (editingOverride) {
      updateOverrideMutation.mutate({ id: editingOverride.id, data });
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Cenník
          </h1>
          <p className="text-muted-foreground mt-1">
            Nastavení cen rezervací na osobu podle typu
          </p>
        </div>
      </div>

      {/* Default Prices Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-purple-600" />
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

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={updateDefaultMutation.isPending}
                    className="bg-gradient-to-r from-purple-600 to-pink-600"
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
              <Calendar className="w-5 h-5 text-purple-600" />
              Datum-specifické ceny
            </CardTitle>
            <Button
              onClick={handleCreateOverride}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
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
                          {override.adultPrice.toFixed(2)} Kč
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {override.childPrice.toFixed(2)} Kč
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {override.infantPrice.toFixed(2)} Kč
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
      <Dialog open={isOverrideDialogOpen} onOpenChange={setIsOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOverride ? 'Upravit cenový přepis' : 'Nový cenový přepis'}
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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOverrideDialogOpen(false)}
                  data-testid="button-cancel-override"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createOverrideMutation.isPending || updateOverrideMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                  data-testid="button-submit-override"
                >
                  {createOverrideMutation.isPending || updateOverrideMutation.isPending
                    ? 'Ukládání...'
                    : editingOverride
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
