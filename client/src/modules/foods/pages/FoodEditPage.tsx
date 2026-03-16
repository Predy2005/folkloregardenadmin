import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { ArrowLeft, DollarSign, Edit, Eye, EyeOff, Plus, Trash2, ChefHat, Loader2, AlertCircle } from "lucide-react";
import type { FoodItemAvailability, FoodItemPriceOverride, ReservationFood, MenuRecipe, Recipe } from "@shared/types";
import { COURSE_TYPE_LABELS } from "@shared/types";
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
    queryKey: ["/api/food-pricing/overrides", foodId],
    enabled: isEdit && !!foodId,
    queryFn: () => api.get<FoodItemPriceOverride[]>(`/api/food-pricing/overrides?foodId=${foodId}`),
  });

  // Fetch availability
  const { data: availabilities } = useQuery<FoodItemAvailability[]>({
    queryKey: ["/api/food-pricing/availability", foodId],
    enabled: isEdit && !!foodId,
    queryFn: () => api.get<FoodItemAvailability[]>(`/api/food-pricing/availability?foodId=${foodId}`),
  });

  // Fetch menu recipes (linked recipes for this food)
  const { data: menuRecipes, isLoading: isLoadingMenuRecipes, isError: isMenuRecipesError } = useQuery<MenuRecipe[]>({
    queryKey: ["/api/menu-recipes", foodId],
    enabled: isEdit && !!foodId,
    queryFn: () => api.get<MenuRecipe[]>(`/api/menu-recipes?reservationFoodId=${foodId}`),
  });

  // Fetch all recipes for the dropdown
  const { data: allRecipes, isLoading: isLoadingRecipes } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
    enabled: isEdit && !!foodId,
    queryFn: () => api.get<Recipe[]>("/api/recipes"),
  });

  // State for adding new recipe link
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [selectedCourseType, setSelectedCourseType] = useState<string>("");
  const [editingMenuRecipeId, setEditingMenuRecipeId] = useState<number | null>(null);

  // Menu recipe mutations
  const createMenuRecipeMutation = useMutation({
    mutationFn: (data: { reservationFoodId: number; recipeId: number; courseType?: string }) =>
      api.post("/api/menu-recipes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-recipes", foodId] });
      setSelectedRecipeId("");
      setSelectedCourseType("");
      successToast("Receptura byla přiřazena");
    },
    onError: (err: any) => errorToast(err?.response?.data?.error || "Chyba při přiřazování receptury"),
  });

  const updateMenuRecipeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { portionsPerServing?: number; courseType?: string } }) =>
      api.put(`/api/menu-recipes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-recipes", foodId] });
      setEditingMenuRecipeId(null);
      successToast("Receptura byla aktualizována");
    },
    onError: (err: any) => errorToast(err?.response?.data?.error || "Chyba při aktualizaci receptury"),
  });

  const deleteMenuRecipeMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/menu-recipes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-recipes", foodId] });
      successToast("Receptura byla odebrána");
    },
    onError: (err: any) => errorToast(err?.response?.data?.error || "Chyba při odebírání receptury"),
  });

  // Filter out already-linked recipes from dropdown
  const linkedRecipeIds = new Set(menuRecipes?.map((mr) => mr.recipeId) ?? []);
  const availableRecipes = allRecipes?.filter((r) => !linkedRecipeIds.has(r.id)) ?? [];

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
      successToast("Jídlo bylo úspěšně vytvořeno");
      navigate("/foods");
    },
    onError: () => {
      errorToast("Chyba při vytváření jídla");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FoodForm) => api.put(`/api/reservation-foods/${foodId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservation-foods"] });
      successToast("Jídlo bylo úspěšně aktualizováno");
    },
    onError: () => {
      errorToast("Chyba při aktualizaci jídla");
    },
  });

  // Price override mutations
  const createPriceOverrideMutation = useMutation({
    mutationFn: (data: PriceOverrideForm & { reservationFoodId: number }) =>
      api.post("/api/food-pricing/overrides", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-pricing/overrides", foodId] });
      setIsPriceOverrideDialogOpen(false);
      priceOverrideForm.reset();
      successToast("Cenový přepis byl úspěšně vytvořen");
    },
    onError: () => {
      errorToast("Chyba při vytváření cenového přepisu");
    },
  });

  const updatePriceOverrideMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PriceOverrideForm }) =>
      api.put(`/api/food-pricing/overrides/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-pricing/overrides", foodId] });
      setIsPriceOverrideDialogOpen(false);
      setEditingPriceOverride(null);
      priceOverrideForm.reset();
      successToast("Cenový přepis byl úspěšně aktualizován");
    },
    onError: () => {
      errorToast("Chyba při aktualizaci cenového přepisu");
    },
  });

  const deletePriceOverrideMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/food-pricing/overrides/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-pricing/overrides", foodId] });
      successToast("Cenový přepis byl úspěšně smazán");
    },
    onError: () => {
      errorToast("Chyba při mazání cenového přepisu");
    },
  });

  // Availability mutations
  const createAvailabilityMutation = useMutation({
    mutationFn: (data: AvailabilityForm & { reservationFoodId: number }) =>
      api.post("/api/food-pricing/availability", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-pricing/availability", foodId] });
      setIsAvailabilityDialogOpen(false);
      availabilityForm.reset();
      successToast("Dostupnost byla úspěšně vytvořena");
    },
    onError: () => {
      errorToast("Chyba při vytváření dostupnosti");
    },
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AvailabilityForm }) =>
      api.put(`/api/food-pricing/availability/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-pricing/availability", foodId] });
      setIsAvailabilityDialogOpen(false);
      setEditingAvailability(null);
      availabilityForm.reset();
      successToast("Dostupnost byla úspěšně aktualizována");
    },
    onError: () => {
      errorToast("Chyba při aktualizaci dostupnosti");
    },
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/food-pricing/availability/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-pricing/availability", foodId] });
      successToast("Dostupnost byla úspěšně smazána");
    },
    onError: () => {
      errorToast("Chyba při mazání dostupnosti");
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
          <TabsTrigger value="recipes" disabled={!isEdit}>
            <ChefHat className="w-4 h-4 mr-1" />
            Receptury
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

        {/* Recipes Tab */}
        <TabsContent value="recipes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="w-5 h-5" />
                    Receptury
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Propojte receptury, které tvoří toto menu (předkrm, polévka, hlavní chod, příloha, dezert)
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isMenuRecipesError && (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-md text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Chyba při načítání propojených receptur. Zkuste obnovit stránku.
                </div>
              )}

              {/* Add recipe form */}
              <div className="flex items-end gap-3 p-4 bg-muted/30 rounded-lg border">
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium">Receptura</label>
                  <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingRecipes ? "Načítání..." : "Vyberte recepturu..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRecipes.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40 space-y-1">
                  <label className="text-sm font-medium">Typ chodu</label>
                  <Select value={selectedCourseType} onValueChange={setSelectedCourseType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COURSE_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => {
                    if (!foodId || !selectedRecipeId) return;
                    createMenuRecipeMutation.mutate({
                      reservationFoodId: foodId,
                      recipeId: Number(selectedRecipeId),
                      courseType: selectedCourseType || undefined,
                    });
                  }}
                  disabled={!selectedRecipeId || createMenuRecipeMutation.isPending}
                >
                  {createMenuRecipeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-1" />
                  )}
                  Přidat
                </Button>
              </div>

              {/* Linked recipes table */}
              {isLoadingMenuRecipes ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Načítání receptur...
                </div>
              ) : menuRecipes && menuRecipes.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receptura</TableHead>
                        <TableHead>Typ chodu</TableHead>
                        <TableHead className="text-right">Porcí na porci menu</TableHead>
                        <TableHead className="text-right">Akce</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {menuRecipes.map((mr) => (
                        <TableRow key={mr.id}>
                          <TableCell className="font-medium">
                            {mr.recipe?.name || `Receptura #${mr.recipeId}`}
                          </TableCell>
                          <TableCell>
                            {editingMenuRecipeId === mr.id ? (
                              <Select
                                value={mr.courseType || ""}
                                onValueChange={(val) =>
                                  updateMenuRecipeMutation.mutate({
                                    id: mr.id,
                                    data: { courseType: val || undefined },
                                  })
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Vyberte..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(COURSE_TYPE_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm">
                                {mr.courseType
                                  ? COURSE_TYPE_LABELS[mr.courseType] || mr.courseType
                                  : "-"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {editingMenuRecipeId === mr.id ? (
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                defaultValue={mr.portionsPerServing}
                                className="w-24 ml-auto"
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (val && val !== mr.portionsPerServing) {
                                    updateMenuRecipeMutation.mutate({
                                      id: mr.id,
                                      data: { portionsPerServing: val },
                                    });
                                  }
                                }}
                              />
                            ) : (
                              mr.portionsPerServing
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setEditingMenuRecipeId(
                                    editingMenuRecipeId === mr.id ? null : mr.id
                                  )
                                }
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMenuRecipeMutation.mutate(mr.id)}
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
                  Žádné receptury propojeny s tímto menu
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
