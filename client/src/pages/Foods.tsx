import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, DollarSign, Calendar, UtensilsCrossed } from 'lucide-react';
import type { ReservationFood, FoodPricingDefault, FoodPricingDateOverride } from '@shared/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import dayjs from 'dayjs';

const foodSchema = z.object({
  name: z.string().min(1, 'Název je povinný'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Cena musí být kladné číslo'),
  isChildrenMenu: z.boolean().default(false),
});

const defaultPriceSchema = z.object({
  price: z.coerce.number().min(0, 'Cena musí být alespoň 0'),
});

const overrideSchema = z.object({
  date: z.string().min(1, 'Datum je povinné'),
  price: z.coerce.number().min(0, 'Cena musí být alespoň 0'),
  reason: z.string().optional(),
});

type FoodForm = z.infer<typeof foodSchema>;
type DefaultPriceForm = z.infer<typeof defaultPriceSchema>;
type OverrideForm = z.infer<typeof overrideSchema>;

export default function Foods() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<ReservationFood | null>(null);
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<FoodPricingDateOverride | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Fetch foods
  const { data: foods, isLoading } = useQuery({
    queryKey: ['/api/reservation-foods'],
    queryFn: () => api.get<ReservationFood[]>('/api/reservation-foods'),
  });

  // Fetch default food pricing
  const { data: defaultPrices, isLoading: isLoadingDefaults } = useQuery<FoodPricingDefault>({
    queryKey: ['/api/food-pricing/defaults'],
  });

  // Fetch date overrides
  const { data: dateOverrides, isLoading: isLoadingOverrides } = useQuery<FoodPricingDateOverride[]>({
    queryKey: ['/api/food-pricing/date-overrides'],
  });

  // Forms
  const form = useForm<FoodForm>({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      isChildrenMenu: false,
    },
  });

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

  // Update default form when data loads
  useEffect(() => {
    if (defaultPrices) {
      defaultForm.reset({
        price: defaultPrices.price,
      });
    }
  }, [defaultPrices, defaultForm]);

  // Food mutations
  const createMutation = useMutation({
    mutationFn: (data: FoodForm) => api.post('/api/reservation-foods', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservation-foods'] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: 'Jídlo bylo úspěšně vytvořeno' });
    },
    onError: () => {
      toast({ title: 'Chyba při vytváření jídla', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FoodForm }) =>
      api.put(`/api/reservation-foods/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservation-foods'] });
      setIsDialogOpen(false);
      setEditingFood(null);
      form.reset();
      toast({ title: 'Jídlo bylo úspěšně upraveno' });
    },
    onError: () => {
      toast({ title: 'Chyba při úpravě jídla', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/reservation-foods/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservation-foods'] });
      toast({ title: 'Jídlo bylo úspěšně smazáno' });
    },
    onError: () => {
      toast({ title: 'Chyba při mazání jídla', variant: 'destructive' });
    },
  });

  // Pricing mutations
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

  // Food event handlers
  const handleCreate = () => {
    setEditingFood(null);
    form.reset({
      name: '',
      description: '',
      price: 0,
      isChildrenMenu: false,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (food: ReservationFood) => {
    setEditingFood(food);
    form.reset({
      name: food.name,
      description: food.description || '',
      price: food.price,
      isChildrenMenu: food.isChildrenMenu,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Opravdu chcete smazat toto jídlo?')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (data: FoodForm) => {
    if (editingFood) {
      updateMutation.mutate({ id: editingFood.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Pricing event handlers
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Načítání jídel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2">Jídla</h1>
          <p className="text-muted-foreground">Správa menu, jídel a cenové konfigurace</p>
        </div>
      </div>

      <Tabs defaultValue="menu" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="menu" data-testid="tab-menu">Menu položky</TabsTrigger>
          <TabsTrigger value="default-price" data-testid="tab-default-price">Výchozí cena</TabsTrigger>
          <TabsTrigger value="price-overrides" data-testid="tab-price-overrides">Cenové přepisy</TabsTrigger>
        </TabsList>

        {/* Menu Items Tab */}
        <TabsContent value="menu" className="space-y-6">
          <div className="flex items-center justify-end">
            <Button onClick={handleCreate} data-testid="button-create-food" className="bg-gradient-to-r from-primary to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Přidat jídlo
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Název</TableHead>
                      <TableHead>Popis</TableHead>
                      <TableHead>Cena</TableHead>
                      <TableHead>Dětské menu</TableHead>
                      <TableHead className="text-right">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {foods?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Žádná jídla
                        </TableCell>
                      </TableRow>
                    ) : (
                      foods?.map((food) => (
                        <TableRow key={food.id} className="hover-elevate" data-testid={`row-food-${food.id}`}>
                          <TableCell className="font-mono text-sm">#{food.id}</TableCell>
                          <TableCell className="font-medium">{food.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                            {food.description || '-'}
                          </TableCell>
                          <TableCell className="font-mono font-medium">{food.price} Kč</TableCell>
                          <TableCell>
                            {food.isChildrenMenu && (
                              <span className="inline-flex items-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 px-2 py-1 text-xs font-medium border border-blue-500/30">
                                Dětské
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(food)}
                                data-testid={`button-edit-${food.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(food.id)}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-${food.id}`}
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
        </TabsContent>

        {/* Default Price Tab */}
        <TabsContent value="default-price">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
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
                                  data-testid="input-food-default-price"
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
                        className="bg-gradient-to-r from-primary to-purple-600"
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
        </TabsContent>

        {/* Price Overrides Tab */}
        <TabsContent value="price-overrides">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Datum-specifické ceny jídel
                </CardTitle>
                <Button
                  onClick={handleCreateOverride}
                  className="bg-gradient-to-r from-primary to-purple-600"
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
        </TabsContent>
      </Tabs>

      {/* Create/Edit Food Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingFood ? 'Upravit jídlo' : 'Nové jídlo'}
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
                      <Input placeholder="Např. Standardní menu" data-testid="input-food-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Popis</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Popis jídla..."
                        data-testid="input-food-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cena (Kč)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        data-testid="input-food-price"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isChildrenMenu"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-children-menu"
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Dětské menu
                    </FormLabel>
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
                  data-testid="button-save-food"
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Ukládání...'
                    : editingFood
                    ? 'Uložit změny'
                    : 'Vytvořit'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
                  className="bg-gradient-to-r from-primary to-purple-600"
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
