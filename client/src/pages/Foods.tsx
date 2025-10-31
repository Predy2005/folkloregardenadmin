import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Calendar, DollarSign, Eye, EyeOff } from 'lucide-react';
import type { ReservationFood, FoodItemPriceOverride, FoodItemAvailability } from '@shared/types';
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

const priceOverrideSchema = z.object({
  dateFrom: z.string().min(1, 'Datum od je povinné'),
  dateTo: z.string().optional(),
  price: z.coerce.number().min(0, 'Cena musí být alespoň 0'),
  reason: z.string().optional(),
});

const availabilitySchema = z.object({
  dateFrom: z.string().min(1, 'Datum od je povinné'),
  dateTo: z.string().optional(),
  available: z.boolean(),
  reason: z.string().optional(),
});

type FoodForm = z.infer<typeof foodSchema>;
type PriceOverrideForm = z.infer<typeof priceOverrideSchema>;
type AvailabilityForm = z.infer<typeof availabilitySchema>;

export default function Foods() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<ReservationFood | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  
  // Price override dialog states
  const [isPriceOverrideDialogOpen, setIsPriceOverrideDialogOpen] = useState(false);
  const [editingPriceOverride, setEditingPriceOverride] = useState<FoodItemPriceOverride | null>(null);
  
  // Availability dialog states
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<FoodItemAvailability | null>(null);
  
  const { toast } = useToast();

  // Fetch foods
  const { data: foods, isLoading } = useQuery({
    queryKey: ['/api/reservation-foods'],
    queryFn: () => api.get<ReservationFood[]>('/api/reservation-foods'),
  });

  // Fetch price overrides for selected food
  const { data: priceOverrides } = useQuery<FoodItemPriceOverride[]>({
    queryKey: ['/api/food-price-overrides', editingFood?.id],
    enabled: !!editingFood,
    queryFn: () => api.get<FoodItemPriceOverride[]>(`/api/food-price-overrides?foodId=${editingFood!.id}`),
  });

  // Fetch availability for selected food
  const { data: availabilities } = useQuery<FoodItemAvailability[]>({
    queryKey: ['/api/food-availability', editingFood?.id],
    enabled: !!editingFood,
    queryFn: () => api.get<FoodItemAvailability[]>(`/api/food-availability?foodId=${editingFood!.id}`),
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

  const priceOverrideForm = useForm<PriceOverrideForm>({
    resolver: zodResolver(priceOverrideSchema),
    defaultValues: {
      dateFrom: '',
      dateTo: '',
      price: 0,
      reason: '',
    },
  });

  const availabilityForm = useForm<AvailabilityForm>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      dateFrom: '',
      dateTo: '',
      available: true,
      reason: '',
    },
  });

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
      toast({ title: 'Jídlo bylo úspěšně aktualizováno' });
    },
    onError: () => {
      toast({ title: 'Chyba při aktualizaci jídla', variant: 'destructive' });
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

  // Price override mutations
  const createPriceOverrideMutation = useMutation({
    mutationFn: (data: PriceOverrideForm & { reservationFoodId: number }) =>
      api.post('/api/food-price-overrides', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-price-overrides', editingFood?.id] });
      setIsPriceOverrideDialogOpen(false);
      priceOverrideForm.reset();
      toast({ title: 'Cenový přepis byl úspěšně vytvořen' });
    },
    onError: () => {
      toast({ title: 'Chyba při vytváření cenového přepisu', variant: 'destructive' });
    },
  });

  const updatePriceOverrideMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PriceOverrideForm }) =>
      api.put(`/api/food-price-overrides/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-price-overrides', editingFood?.id] });
      setIsPriceOverrideDialogOpen(false);
      setEditingPriceOverride(null);
      priceOverrideForm.reset();
      toast({ title: 'Cenový přepis byl úspěšně aktualizován' });
    },
    onError: () => {
      toast({ title: 'Chyba při aktualizaci cenového přepisu', variant: 'destructive' });
    },
  });

  const deletePriceOverrideMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/food-price-overrides/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-price-overrides', editingFood?.id] });
      toast({ title: 'Cenový přepis byl úspěšně smazán' });
    },
    onError: () => {
      toast({ title: 'Chyba při mazání cenového přepisu', variant: 'destructive' });
    },
  });

  // Availability mutations
  const createAvailabilityMutation = useMutation({
    mutationFn: (data: AvailabilityForm & { reservationFoodId: number }) =>
      api.post('/api/food-availability', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-availability', editingFood?.id] });
      setIsAvailabilityDialogOpen(false);
      availabilityForm.reset();
      toast({ title: 'Dostupnost byla úspěšně vytvořena' });
    },
    onError: () => {
      toast({ title: 'Chyba při vytváření dostupnosti', variant: 'destructive' });
    },
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AvailabilityForm }) =>
      api.put(`/api/food-availability/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-availability', editingFood?.id] });
      setIsAvailabilityDialogOpen(false);
      setEditingAvailability(null);
      availabilityForm.reset();
      toast({ title: 'Dostupnost byla úspěšně aktualizována' });
    },
    onError: () => {
      toast({ title: 'Chyba při aktualizaci dostupnosti', variant: 'destructive' });
    },
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/food-availability/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-availability', editingFood?.id] });
      toast({ title: 'Dostupnost byla úspěšně smazána' });
    },
    onError: () => {
      toast({ title: 'Chyba při mazání dostupnosti', variant: 'destructive' });
    },
  });

  // Handlers
  const handleCreate = () => {
    setEditingFood(null);
    form.reset({
      name: '',
      description: '',
      price: 0,
      isChildrenMenu: false,
    });
    setActiveTab('info');
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
    setActiveTab('info');
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

  const handleCreatePriceOverride = () => {
    setEditingPriceOverride(null);
    priceOverrideForm.reset({
      dateFrom: '',
      dateTo: '',
      price: 0,
      reason: '',
    });
    setIsPriceOverrideDialogOpen(true);
  };

  const handleEditPriceOverride = (override: FoodItemPriceOverride) => {
    setEditingPriceOverride(override);
    priceOverrideForm.reset({
      dateFrom: override.dateFrom,
      dateTo: override.dateTo || '',
      price: override.price,
      reason: override.reason || '',
    });
    setIsPriceOverrideDialogOpen(true);
  };

  const onSubmitPriceOverride = (data: PriceOverrideForm) => {
    if (!editingFood) return;
    
    if (editingPriceOverride) {
      updatePriceOverrideMutation.mutate({ id: editingPriceOverride.id, data });
    } else {
      createPriceOverrideMutation.mutate({ ...data, reservationFoodId: editingFood.id });
    }
  };

  const handleCreateAvailability = () => {
    setEditingAvailability(null);
    availabilityForm.reset({
      dateFrom: '',
      dateTo: '',
      available: false,
      reason: '',
    });
    setIsAvailabilityDialogOpen(true);
  };

  const handleEditAvailability = (availability: FoodItemAvailability) => {
    setEditingAvailability(availability);
    availabilityForm.reset({
      dateFrom: availability.dateFrom,
      dateTo: availability.dateTo || '',
      available: availability.available,
      reason: availability.reason || '',
    });
    setIsAvailabilityDialogOpen(true);
  };

  const onSubmitAvailability = (data: AvailabilityForm) => {
    if (!editingFood) return;
    
    if (editingAvailability) {
      updateAvailabilityMutation.mutate({ id: editingAvailability.id, data });
    } else {
      createAvailabilityMutation.mutate({ ...data, reservationFoodId: editingFood.id });
    }
  };

  // Filter foods
  const filteredFoods = foods?.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    food.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Jídla
          </h1>
          <p className="text-muted-foreground mt-1">
            Správa nabídky jídel, cen a dostupnosti
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-food"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nové jídlo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Menu položky</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Hledat jídlo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-foods"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredFoods.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Název</TableHead>
                    <TableHead>Popis</TableHead>
                    <TableHead>Základní cena</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFoods.map((food) => (
                    <TableRow key={food.id} data-testid={`row-food-${food.id}`}>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Žádná jídla nenalezena
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Food Dialog with Tabs */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFood ? 'Upravit jídlo' : 'Nové jídlo'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info" data-testid="tab-info">
                Základní informace
              </TabsTrigger>
              <TabsTrigger value="price-overrides" disabled={!editingFood} data-testid="tab-price-overrides">
                Cenové přepisy
              </TabsTrigger>
              <TabsTrigger value="availability" disabled={!editingFood} data-testid="tab-availability">
                Dostupnost
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="info" className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Název</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-food-name" />
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
                          <Textarea {...field} data-testid="input-food-description" />
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
                        <FormLabel className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Základní cena
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

                  <FormField
                    control={form.control}
                    name="isChildrenMenu"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-children-menu"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Dětské menu</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel-food"
                    >
                      Zrušit
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="bg-gradient-to-r from-primary to-purple-600"
                      data-testid="button-save-food"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? 'Ukládání...'
                        : editingFood
                        ? 'Uložit změny'
                        : 'Vytvořit jídlo'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>

            {/* Price Overrides Tab */}
            <TabsContent value="price-overrides" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Nastavte speciální ceny pro konkrétní dny nebo období
                </p>
                <Button
                  onClick={handleCreatePriceOverride}
                  size="sm"
                  className="bg-gradient-to-r from-primary to-purple-600"
                  data-testid="button-create-price-override"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nový přepis
                </Button>
              </div>

              {priceOverrides && priceOverrides.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum od</TableHead>
                        <TableHead>Datum do</TableHead>
                        <TableHead>Cena</TableHead>
                        <TableHead>Důvod</TableHead>
                        <TableHead className="text-right">Akce</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {priceOverrides.map((override) => (
                        <TableRow key={override.id} data-testid={`row-price-override-${override.id}`}>
                          <TableCell>{dayjs(override.dateFrom).format('DD.MM.YYYY')}</TableCell>
                          <TableCell>{override.dateTo ? dayjs(override.dateTo).format('DD.MM.YYYY') : '-'}</TableCell>
                          <TableCell className="font-mono font-medium">{override.price} Kč</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {override.reason || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPriceOverride(override)}
                                data-testid={`button-edit-price-override-${override.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deletePriceOverrideMutation.mutate(override.id)}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-price-override-${override.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  Žádné cenové přepisy
                </div>
              )}
            </TabsContent>

            {/* Availability Tab */}
            <TabsContent value="availability" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Nastavte dostupnost jídla pro konkrétní dny nebo období
                </p>
                <Button
                  onClick={handleCreateAvailability}
                  size="sm"
                  className="bg-gradient-to-r from-primary to-purple-600"
                  data-testid="button-create-availability"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nové pravidlo
                </Button>
              </div>

              {availabilities && availabilities.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum od</TableHead>
                        <TableHead>Datum do</TableHead>
                        <TableHead>Stav</TableHead>
                        <TableHead>Důvod</TableHead>
                        <TableHead className="text-right">Akce</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availabilities.map((availability) => (
                        <TableRow key={availability.id} data-testid={`row-availability-${availability.id}`}>
                          <TableCell>{dayjs(availability.dateFrom).format('DD.MM.YYYY')}</TableCell>
                          <TableCell>{availability.dateTo ? dayjs(availability.dateTo).format('DD.MM.YYYY') : '-'}</TableCell>
                          <TableCell>
                            {availability.available ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 px-2 py-1 text-xs font-medium border border-green-500/30">
                                <Eye className="w-3 h-3" />
                                Dostupné
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 px-2 py-1 text-xs font-medium border border-red-500/30">
                                <EyeOff className="w-3 h-3" />
                                Skryté
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {availability.reason || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditAvailability(availability)}
                                data-testid={`button-edit-availability-${availability.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAvailabilityMutation.mutate(availability.id)}
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-availability-${availability.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  Žádná pravidla dostupnosti
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Price Override Dialog */}
      <Dialog open={isPriceOverrideDialogOpen} onOpenChange={setIsPriceOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPriceOverride ? 'Upravit cenový přepis' : 'Nový cenový přepis'}
            </DialogTitle>
          </DialogHeader>

          <Form {...priceOverrideForm}>
            <form onSubmit={priceOverrideForm.handleSubmit(onSubmitPriceOverride)} className="space-y-4">
              <FormField
                control={priceOverrideForm.control}
                name="dateFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum od</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-override-date-from" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={priceOverrideForm.control}
                name="dateTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum do (volitelné)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-override-date-to" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={priceOverrideForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cena</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-override-price"
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
                control={priceOverrideForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Důvod (volitelné)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Např. Vánoce - Premium datum" data-testid="input-override-reason" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPriceOverrideDialogOpen(false)}
                  data-testid="button-cancel-price-override"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createPriceOverrideMutation.isPending || updatePriceOverrideMutation.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                  data-testid="button-save-price-override"
                >
                  {createPriceOverrideMutation.isPending || updatePriceOverrideMutation.isPending
                    ? 'Ukládání...'
                    : editingPriceOverride
                    ? 'Uložit změny'
                    : 'Vytvořit přepis'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Availability Dialog */}
      <Dialog open={isAvailabilityDialogOpen} onOpenChange={setIsAvailabilityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAvailability ? 'Upravit dostupnost' : 'Nové pravidlo dostupnosti'}
            </DialogTitle>
          </DialogHeader>

          <Form {...availabilityForm}>
            <form onSubmit={availabilityForm.handleSubmit(onSubmitAvailability)} className="space-y-4">
              <FormField
                control={availabilityForm.control}
                name="dateFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum od</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-availability-date-from" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={availabilityForm.control}
                name="dateTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum do (volitelné)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-availability-date-to" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={availabilityForm.control}
                name="available"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-availability"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Jídlo je dostupné v tomto období</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={availabilityForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Důvod (volitelné)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Např. Není k dispozici v pátek" data-testid="input-availability-reason" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAvailabilityDialogOpen(false)}
                  data-testid="button-cancel-availability"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createAvailabilityMutation.isPending || updateAvailabilityMutation.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                  data-testid="button-save-availability"
                >
                  {createAvailabilityMutation.isPending || updateAvailabilityMutation.isPending
                    ? 'Ukládání...'
                    : editingAvailability
                    ? 'Uložit změny'
                    : 'Vytvořit pravidlo'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
