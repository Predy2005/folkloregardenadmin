import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { useToast } from "@/shared/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/shared/components/ui/form";
import { ArrowLeft, DollarSign, Edit, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import type { FoodItemAvailability, FoodItemPriceOverride, ReservationFood } from "@shared/types";
import dayjs from "dayjs";
import { useState } from "react";

const foodSchema = z.object({
  name: z.string().min(1, "Název je povinný"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Cena musí být kladné číslo"),
  surcharge: z.coerce.number().min(0, "Příplatek musí být kladné číslo"),
  isChildrenMenu: z.boolean().default(false),
  externalId: z.string().optional(),
});

const priceOverrideSchema = z.object({
  dateFrom: z.string().min(1, "Datum od je povinné"),
  dateTo: z.string().optional(),
  price: z.coerce.number().min(0, "Cena musí být alespoň 0"),
  reason: z.string().optional(),
});

const availabilitySchema = z.object({
  dateFrom: z.string().min(1, "Datum od je povinné"),
  dateTo: z.string().optional(),
  available: z.boolean(),
  reason: z.string().optional(),
});

type FoodForm = z.infer<typeof foodSchema>;
type PriceOverrideForm = z.infer<typeof priceOverrideSchema>;
type AvailabilityForm = z.infer<typeof availabilitySchema>;

export default function FoodEdit() {
  const [, navigate] = useLocation();
  const [isEditMatch, params] = useRoute("/foods/:id/edit");
  const isEdit = !!isEditMatch;
  const foodId = params?.id ? Number(params.id) : null;
  const { toast } = useToast();

  // Dialog states
  const [isPriceOverrideDialogOpen, setIsPriceOverrideDialogOpen] = useState(false);
  const [editingPriceOverride, setEditingPriceOverride] = useState<FoodItemPriceOverride | null>(null);
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<FoodItemAvailability | null>(null);

  // Forms
  const form = useForm<FoodForm>({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      surcharge: 0,
      isChildrenMenu: false,
      externalId: "",
    },
  });

  const priceOverrideForm = useForm<PriceOverrideForm>({
    resolver: zodResolver(priceOverrideSchema),
    defaultValues: { dateFrom: "", dateTo: "", price: 0, reason: "" },
  });

  const availabilityForm = useForm<AvailabilityForm>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: { dateFrom: "", dateTo: "", available: false, reason: "" },
  });

  // Fetch food data
  const { data: food, isLoading } = useQuery({
    enabled: isEdit && !!foodId,
    queryKey: ["/api/reservation-foods", foodId],
    queryFn: async () => {
      const foods = await api.get<ReservationFood[]>("/api/reservation-foods");
      return foods.find((f) => f.id === foodId);
    },
  });

  // Fetch price overrides
  const { data: priceOverrides } = useQuery<FoodItemPriceOverride[]>({
    queryKey: ["/api/food-price-overrides", foodId],
    enabled: isEdit && !!foodId,
    queryFn: () => api.get<FoodItemPriceOverride[]>(`/api/food-price-overrides?foodId=${foodId}`),
  });

  // Fetch availability
  const { data: availabilities } = useQuery<FoodItemAvailability[]>({
    queryKey: ["/api/food-availability", foodId],
    enabled: isEdit && !!foodId,
    queryFn: () => api.get<FoodItemAvailability[]>(`/api/food-availability?foodId=${foodId}`),
  });

  // Load food data into form
  useEffect(() => {
    if (isEdit && food) {
      form.reset({
        name: food.name,
        description: food.description || "",
        price: food.price,
        surcharge: food.surcharge || 0,
        isChildrenMenu: food.isChildrenMenu,
        externalId: food.externalId || "",
      });
    }
  }, [isEdit, food, form]);

  // Food mutations
  const createMutation = useMutation({
    mutationFn: (data: FoodForm) => api.post("/api/reservation-foods", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservation-foods"] });
      toast({ title: "Jídlo bylo úspěšně vytvořeno" });
      navigate("/foods");
    },
    onError: () => {
      toast({ title: "Chyba při vytváření jídla", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FoodForm) => api.put(`/api/reservation-foods/${foodId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservation-foods"] });
      toast({ title: "Jídlo bylo úspěšně aktualizováno" });
    },
    onError: () => {
      toast({ title: "Chyba při aktualizaci jídla", variant: "destructive" });
    },
  });

  // Price override mutations
  const createPriceOverrideMutation = useMutation({
    mutationFn: (data: PriceOverrideForm & { reservationFoodId: number }) =>
      api.post("/api/food-price-overrides", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-price-overrides", foodId] });
      setIsPriceOverrideDialogOpen(false);
      priceOverrideForm.reset();
      toast({ title: "Cenový přepis byl úspěšně vytvořen" });
    },
    onError: () => {
      toast({ title: "Chyba při vytváření cenového přepisu", variant: "destructive" });
    },
  });

  const updatePriceOverrideMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PriceOverrideForm }) =>
      api.put(`/api/food-price-overrides/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-price-overrides", foodId] });
      setIsPriceOverrideDialogOpen(false);
      setEditingPriceOverride(null);
      priceOverrideForm.reset();
      toast({ title: "Cenový přepis byl úspěšně aktualizován" });
    },
    onError: () => {
      toast({ title: "Chyba při aktualizaci cenového přepisu", variant: "destructive" });
    },
  });

  const deletePriceOverrideMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/food-price-overrides/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-price-overrides", foodId] });
      toast({ title: "Cenový přepis byl úspěšně smazán" });
    },
    onError: () => {
      toast({ title: "Chyba při mazání cenového přepisu", variant: "destructive" });
    },
  });

  // Availability mutations
  const createAvailabilityMutation = useMutation({
    mutationFn: (data: AvailabilityForm & { reservationFoodId: number }) =>
      api.post("/api/food-availability", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-availability", foodId] });
      setIsAvailabilityDialogOpen(false);
      availabilityForm.reset();
      toast({ title: "Dostupnost byla úspěšně vytvořena" });
    },
    onError: () => {
      toast({ title: "Chyba při vytváření dostupnosti", variant: "destructive" });
    },
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AvailabilityForm }) =>
      api.put(`/api/food-availability/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-availability", foodId] });
      setIsAvailabilityDialogOpen(false);
      setEditingAvailability(null);
      availabilityForm.reset();
      toast({ title: "Dostupnost byla úspěšně aktualizována" });
    },
    onError: () => {
      toast({ title: "Chyba při aktualizaci dostupnosti", variant: "destructive" });
    },
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/food-availability/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-availability", foodId] });
      toast({ title: "Dostupnost byla úspěšně smazána" });
    },
    onError: () => {
      toast({ title: "Chyba při mazání dostupnosti", variant: "destructive" });
    },
  });

  // Handlers
  const onSubmit = (data: FoodForm) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCreatePriceOverride = () => {
    setEditingPriceOverride(null);
    priceOverrideForm.reset({ dateFrom: "", dateTo: "", price: 0, reason: "" });
    setIsPriceOverrideDialogOpen(true);
  };

  const handleEditPriceOverride = (override: FoodItemPriceOverride) => {
    setEditingPriceOverride(override);
    priceOverrideForm.reset({
      dateFrom: override.dateFrom,
      dateTo: override.dateTo || "",
      price: override.price,
      reason: override.reason || "",
    });
    setIsPriceOverrideDialogOpen(true);
  };

  const onSubmitPriceOverride = (data: PriceOverrideForm) => {
    if (!foodId) return;
    if (editingPriceOverride) {
      updatePriceOverrideMutation.mutate({ id: editingPriceOverride.id, data });
    } else {
      createPriceOverrideMutation.mutate({ ...data, reservationFoodId: foodId });
    }
  };

  const handleCreateAvailability = () => {
    setEditingAvailability(null);
    availabilityForm.reset({ dateFrom: "", dateTo: "", available: false, reason: "" });
    setIsAvailabilityDialogOpen(true);
  };

  const handleEditAvailability = (availability: FoodItemAvailability) => {
    setEditingAvailability(availability);
    availabilityForm.reset({
      dateFrom: availability.dateFrom,
      dateTo: availability.dateTo || "",
      available: availability.available,
      reason: availability.reason || "",
    });
    setIsAvailabilityDialogOpen(true);
  };

  const onSubmitAvailability = (data: AvailabilityForm) => {
    if (!foodId) return;
    if (editingAvailability) {
      updateAvailabilityMutation.mutate({ id: editingAvailability.id, data });
    } else {
      createAvailabilityMutation.mutate({ ...data, reservationFoodId: foodId });
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Načítání jídla...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/foods")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEdit ? `Upravit: ${food?.name}` : "Nové jídlo"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEdit ? "Úprava existujícího jídla" : "Vytvoření nového jídla do nabídky"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/foods")}>
            Zrušit
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Ukládání..."
              : isEdit
              ? "Uložit změny"
              : "Vytvořit jídlo"}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">Základní informace</TabsTrigger>
          <TabsTrigger value="price-overrides" disabled={!isEdit}>
            Cenové přepisy
          </TabsTrigger>
          <TabsTrigger value="availability" disabled={!isEdit}>
            Dostupnost
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Základní informace</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Název jídla *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Např. Speciální menu - Kachna" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="externalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Externí ID</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="ID z externího systému" />
                          </FormControl>
                          <FormDescription>
                            ID pro propojení s externím rezervačním systémem
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Popis</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Popis jídla, alergeny, ingredience..." rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                min={0}
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                Kč
                              </span>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Cena jídla pokud se prodává samostatně
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="surcharge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Příplatek
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min={0}
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                Kč
                              </span>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Příplatek k základní ceně rezervace (0 = v ceně, 75 = +75 Kč k ceně)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isChildrenMenu"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-3 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Dětské menu</FormLabel>
                          <FormDescription>
                            Označí toto jídlo jako dětské menu
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price Overrides Tab */}
        <TabsContent value="price-overrides">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cenové přepisy</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nastavte speciální ceny pro konkrétní dny nebo období
                  </p>
                </div>
                <Button onClick={handleCreatePriceOverride}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nový přepis
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
                        <TableRow key={override.id}>
                          <TableCell>{dayjs(override.dateFrom).format("DD.MM.YYYY")}</TableCell>
                          <TableCell>
                            {override.dateTo ? dayjs(override.dateTo).format("DD.MM.YYYY") : "-"}
                          </TableCell>
                          <TableCell className="font-mono font-medium">{override.price} Kč</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {override.reason || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPriceOverride(override)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deletePriceOverrideMutation.mutate(override.id)}
                                className="text-destructive hover:text-destructive"
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dostupnost</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nastavte dostupnost jídla pro konkrétní dny nebo období
                  </p>
                </div>
                <Button onClick={handleCreateAvailability}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nové pravidlo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
                        <TableRow key={availability.id}>
                          <TableCell>{dayjs(availability.dateFrom).format("DD.MM.YYYY")}</TableCell>
                          <TableCell>
                            {availability.dateTo ? dayjs(availability.dateTo).format("DD.MM.YYYY") : "-"}
                          </TableCell>
                          <TableCell>
                            {availability.available ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 text-green-600 px-2 py-1 text-xs font-medium border border-green-500/30">
                                <Eye className="w-3 h-3" />
                                Dostupné
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 text-red-600 px-2 py-1 text-xs font-medium border border-red-500/30">
                                <EyeOff className="w-3 h-3" />
                                Skryté
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {availability.reason || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditAvailability(availability)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAvailabilityMutation.mutate(availability.id)}
                                className="text-destructive hover:text-destructive"
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Price Override Dialog */}
      <Dialog open={isPriceOverrideDialogOpen} onOpenChange={setIsPriceOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPriceOverride ? "Upravit cenový přepis" : "Nový cenový přepis"}
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
                      <Input type="date" {...field} />
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
                      <Input type="date" {...field} />
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
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                      <Input {...field} placeholder="Např. Vánoce - Premium datum" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPriceOverrideDialogOpen(false)}>
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createPriceOverrideMutation.isPending || updatePriceOverrideMutation.isPending}
                >
                  {createPriceOverrideMutation.isPending || updatePriceOverrideMutation.isPending
                    ? "Ukládání..."
                    : editingPriceOverride
                    ? "Uložit změny"
                    : "Vytvořit přepis"}
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
              {editingAvailability ? "Upravit dostupnost" : "Nové pravidlo dostupnosti"}
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
                      <Input type="date" {...field} />
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
                      <Input type="date" {...field} />
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
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
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
                      <Input {...field} placeholder="Např. Není k dispozici v pátek" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAvailabilityDialogOpen(false)}>
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createAvailabilityMutation.isPending || updateAvailabilityMutation.isPending}
                >
                  {createAvailabilityMutation.isPending || updateAvailabilityMutation.isPending
                    ? "Ukládání..."
                    : editingAvailability
                    ? "Uložit změny"
                    : "Vytvořit pravidlo"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
