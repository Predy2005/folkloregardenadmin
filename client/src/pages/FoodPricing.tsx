import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import dayjs from 'dayjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Edit, Trash2, DollarSign, Calendar, UtensilsCrossed } from 'lucide-react';
import type { FoodPricingDefault, FoodPricingDateOverride } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const defaultPriceSchema = z.object({
  price: z.number().min(0, 'Cena musí být alespoň 0'),
});

const overrideSchema = z.object({
  date: z.string().min(1, 'Datum je povinné'),
  price: z.number().min(0, 'Cena musí být alespoň 0'),
  reason: z.string().optional(),
});

type DefaultPriceForm = z.infer<typeof defaultPriceSchema>;
type OverrideForm = z.infer<typeof overrideSchema>;

export default function FoodPricing() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<FoodPricingDateOverride | null>(null);

  // Fetch default prices
  const { data: defaultPrices, isLoading: isLoadingDefaults } = useQuery<FoodPricingDefault>({
    queryKey: ['/api/food-pricing/defaults'],
  });

  // Fetch date overrides
  const { data: dateOverrides, isLoading: isLoadingOverrides } = useQuery<FoodPricingDateOverride[]>({
    queryKey: ['/api/food-pricing/date-overrides'],
  });

  // Forms
  const defaultForm = useForm<DefaultPriceForm>({
    resolver: zodResolver(defaultPriceSchema),
    defaultValues: {
      price: defaultPrices?.price ?? 0,
    },
  });

  const overrideForm = useForm<OverrideForm>({
    resolver: zodResolver(overrideSchema),
    defaultValues: {
      date: '',
      price: 0,
      reason: '',
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (defaultPrices) {
      defaultForm.reset({
        price: defaultPrices.price,
      });
    }
  }, [defaultPrices, defaultForm]);

  // Mutations
  const updateDefaultMutation = useMutation({
    mutationFn: async (data: DefaultPriceForm) => {
      return apiRequest('PUT', '/api/food-pricing/defaults', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-pricing/defaults'] });
      toast({
        title: 'Úspěch',
        description: 'Výchozí cena jídla byla aktualizována',
      });
    },
    onError: () => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se aktualizovat výchozí cenu',
        variant: 'destructive',
      });
    },
  });

  const createOverrideMutation = useMutation({
    mutationFn: async (data: OverrideForm) => {
      return apiRequest('POST', '/api/food-pricing/date-overrides', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-pricing/date-overrides'] });
      setIsOverrideDialogOpen(false);
      toast({
        title: 'Úspěch',
        description: 'Cenový přepis byl vytvořen',
      });
    },
    onError: () => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se vytvořit cenový přepis',
        variant: 'destructive',
      });
    },
  });

  const updateOverrideMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: OverrideForm }) => {
      return apiRequest('PUT', `/api/food-pricing/date-overrides/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-pricing/date-overrides'] });
      setIsOverrideDialogOpen(false);
      toast({
        title: 'Úspěch',
        description: 'Cenový přepis byl aktualizován',
      });
    },
    onError: () => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se aktualizovat cenový přepis',
        variant: 'destructive',
      });
    },
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/food-pricing/date-overrides/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-pricing/date-overrides'] });
      toast({
        title: 'Úspěch',
        description: 'Cenový přepis byl smazán',
      });
    },
    onError: () => {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se smazat cenový přepis',
        variant: 'destructive',
      });
    },
  });

  // Event handlers
  const handleUpdateDefaults = (data: DefaultPriceForm) => {
    updateDefaultMutation.mutate(data);
  };

  const handleCreateOverride = () => {
    setEditingOverride(null);
    overrideForm.reset({
      date: '',
      price: defaultPrices?.price ?? 0,
      reason: '',
    });
    setIsOverrideDialogOpen(true);
  };

  const handleEditOverride = (override: FoodPricingDateOverride) => {
    setEditingOverride(override);
    overrideForm.reset({
      date: override.date,
      price: override.price,
      reason: override.reason || '',
    });
    setIsOverrideDialogOpen(true);
  };

  const handleDeleteOverride = (id: number) => {
    if (confirm('Opravdu chcete smazat tento cenový přepis?')) {
      deleteOverrideMutation.mutate(id);
    }
  };

  const onSubmitOverride = (data: OverrideForm) => {
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
            Ceník jídel
          </h1>
          <p className="text-muted-foreground mt-1">
            Nastavení ceny jídla na osobu
          </p>
        </div>
      </div>

      {/* Default Price Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-purple-600" />
            Výchozí cena jídla
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingDefaults ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : (
            <Form {...defaultForm}>
              <form onSubmit={defaultForm.handleSubmit(handleUpdateDefaults)} className="space-y-4">
                <div className="max-w-sm">
                  <FormField
                    control={defaultForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Cena na osobu
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-food-price"
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
                    data-testid="button-save-food-defaults"
                  >
                    {updateDefaultMutation.isPending ? 'Ukládání...' : 'Uložit výchozí cenu'}
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
              Datum-specifické ceny jídel
            </CardTitle>
            <Button
              onClick={handleCreateOverride}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
              data-testid="button-create-food-override"
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
              data-testid="input-search-food-overrides"
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
                    <TableHead className="text-right">Cena na osobu</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOverrides.map((override) => {
                    const isPast = dayjs(override.date).isBefore(dayjs(), 'day');
                    const isToday = dayjs(override.date).isSame(dayjs(), 'day');
                    return (
                      <TableRow key={override.id} data-testid={`row-food-override-${override.id}`}>
                        <TableCell className="font-mono">
                          {dayjs(override.date).format('DD.MM.YYYY')}
                        </TableCell>
                        <TableCell>{override.reason || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {override.price.toFixed(2)} Kč
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
                              data-testid={`button-edit-food-override-${override.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteOverride(override.id)}
                              data-testid={`button-delete-food-override-${override.id}`}
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
                      <Input type="date" {...field} data-testid="input-food-override-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={overrideForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cena na osobu</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-food-override-price"
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
                control={overrideForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Důvod (volitelné)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="např. Premium datum, Vánoce..."
                        {...field}
                        data-testid="input-food-override-reason"
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
                  onClick={() => setIsOverrideDialogOpen(false)}
                  data-testid="button-cancel-food-override"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createOverrideMutation.isPending || updateOverrideMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                  data-testid="button-submit-food-override"
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
