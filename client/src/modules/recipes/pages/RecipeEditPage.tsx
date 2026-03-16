import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/shared/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import type { Recipe, StockItem } from "@shared/types";

const ingredientSchema = z.object({
  stockItemId: z.number().nullable(),
  stockItemName: z.string().optional(),
  quantityRequired: z.coerce.number().min(0, "Množství musí být >= 0"),
  supplier: z.string().optional(),
  pricePerKg: z.coerce.number().optional(),
});

const recipeSchema = z.object({
  name: z.string().min(1, "Zadejte název receptury"),
  portions: z.coerce.number().min(1, "Počet porcí musí být alespoň 1"),
  portionWeight: z.coerce.number().optional(),
  description: z.string().optional(),
  ingredients: z.array(ingredientSchema),
});

type RecipeFormData = z.infer<typeof recipeSchema>;

export default function RecipeEditPage() {
  const [, navigate] = useLocation();
  const [isEditMatch, params] = useRoute("/recipes/:id/edit");
  const isEdit = !!isEditMatch;
  const recipeId = params?.id ? Number(params.id) : null;
  const [newIngredientName, setNewIngredientName] = useState("");

  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      name: "",
      portions: 1,
      portionWeight: undefined,
      description: "",
      ingredients: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients",
  });

  // Load existing recipe in edit mode
  const { data: recipe, isLoading: isLoadingRecipe } = useQuery<Recipe>({
    queryKey: ["/api/recipes", recipeId],
    queryFn: () => api.get<Recipe>(`/api/recipes/${recipeId}`),
    enabled: isEdit && recipeId !== null,
  });

  // Load stock items for dropdown
  const { data: stockItems } = useQuery<StockItem[]>({
    queryKey: ["/api/stock-items"],
    queryFn: () => api.get<StockItem[]>("/api/stock-items"),
  });

  // Populate form when recipe loads
  useEffect(() => {
    if (recipe && isEdit) {
      form.reset({
        name: recipe.name,
        portions: recipe.portions,
        portionWeight: recipe.portionWeight ?? undefined,
        description: recipe.description || "",
        ingredients: (recipe.ingredients || []).map((ing) => ({
          stockItemId: ing.stockItemId,
          stockItemName: ing.stockItem?.name || "",
          quantityRequired: ing.quantityRequired,
          supplier: ing.stockItem?.supplier || "",
          pricePerKg: ing.stockItem?.pricePerUnit ?? undefined,
        })),
      });
    }
  }, [recipe, isEdit, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: RecipeFormData) => api.post("/api/recipes", buildPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      successToast("Receptura vytvořena");
      navigate("/recipes");
    },
    onError: (err: any) => errorToast(err?.response?.data?.error || err.message),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: RecipeFormData) => api.put(`/api/recipes/${recipeId}`, buildPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      successToast("Receptura uložena");
      navigate("/recipes");
    },
    onError: (err: any) => errorToast(err?.response?.data?.error || err.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function buildPayload(data: RecipeFormData) {
    return {
      name: data.name,
      portions: data.portions,
      portionWeight: data.portionWeight || null,
      description: data.description || null,
      ingredients: data.ingredients.map((ing) => ({
        stockItemId: ing.stockItemId || null,
        stockItemName: ing.stockItemName || null,
        quantityRequired: ing.quantityRequired,
      })),
    };
  }

  function handleSubmit(data: RecipeFormData) {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  function handleAddIngredient(stockItemId: number | null, name?: string) {
    append({
      stockItemId,
      stockItemName: name || stockItems?.find((s) => s.id === stockItemId)?.name || "",
      quantityRequired: 0,
      supplier: stockItems?.find((s) => s.id === stockItemId)?.supplier || "",
      pricePerKg: Number(stockItems?.find((s) => s.id === stockItemId)?.pricePerUnit) || undefined,
    });
  }

  function handleAddNewStockItem() {
    const trimmed = newIngredientName.trim();
    if (!trimmed) return;
    append({
      stockItemId: null,
      stockItemName: trimmed,
      quantityRequired: 0,
      supplier: "",
      pricePerKg: undefined,
    });
    setNewIngredientName("");
  }

  // Total weight computation
  const watchedIngredients = form.watch("ingredients");
  const totalWeight = watchedIngredients.reduce(
    (sum, ing) => sum + (Number(ing.quantityRequired) || 0),
    0
  );

  if (isEdit && isLoadingRecipe) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Načítání receptury...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/recipes")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-serif font-bold">
              {isEdit ? `Upravit recepturu: ${recipe?.name || ""}` : "Nová receptura"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEdit ? "Úprava existující receptury" : "Vytvořte novou recepturu"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/recipes")}>
            Zrušit
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isPending}
            className="bg-gradient-to-r from-primary to-purple-600"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Uložit" : "Vytvořit"}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Základní údaje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název receptury *</FormLabel>
                    <FormControl>
                      <Input placeholder="Např. Svíčková na smetaně" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="portions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Počet porcí *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="portionWeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hmotnost 1 porce (g)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Např. 182"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === "" ? undefined : parseFloat(val));
                          }}
                        />
                      </FormControl>
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
                    <FormLabel>Výrobní postup / Recept</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="Popište postup přípravy..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Ingredients Card */}
          <Card>
            <CardHeader>
              <CardTitle>Ingredience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Surovina</TableHead>
                      <TableHead>Dodavatel/Zdroj</TableHead>
                      <TableHead className="text-right">Množství na porci (g/ml)</TableHead>
                      <TableHead className="text-right">Cena za kg/l</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          {form.getValues(`ingredients.${index}.stockItemId`) ? (
                            <span className="text-sm">
                              {stockItems?.find(
                                (s) => s.id === form.getValues(`ingredients.${index}.stockItemId`)
                              )?.name || form.getValues(`ingredients.${index}.stockItemName`)}
                            </span>
                          ) : (
                            <span className="text-sm italic text-muted-foreground">
                              {form.getValues(`ingredients.${index}.stockItemName`) || "—"}
                              <span className="ml-1 text-xs">(nová)</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            {...form.register(`ingredients.${index}.supplier`)}
                            placeholder="Dodavatel"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-right"
                            type="number"
                            step="0.01"
                            min={0}
                            {...form.register(`ingredients.${index}.quantityRequired`, {
                              valueAsNumber: true,
                            })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-right"
                            type="number"
                            step="0.01"
                            min={0}
                            {...form.register(`ingredients.${index}.pricePerKg`, {
                              valueAsNumber: true,
                            })}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Zatím žádné ingredience. Přidejte surovinu z existujících nebo vytvořte novou.
                </p>
              )}

              {/* Summary */}
              {fields.length > 0 && (
                <div className="text-sm text-muted-foreground text-right">
                  Celková hmotnost na porci: <strong>{totalWeight.toFixed(1)} g/ml</strong>
                </div>
              )}

              {/* Add ingredient controls */}
              <div className="flex items-end gap-2 pt-2 border-t">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">
                    Přidat existující surovinu
                  </label>
                  <Select
                    onValueChange={(val) => handleAddIngredient(Number(val))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte surovinu..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stockItems?.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.name} ({item.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Nebo vytvořit novou
                    </label>
                    <Input
                      placeholder="Název nové suroviny"
                      value={newIngredientName}
                      onChange={(e) => setNewIngredientName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddNewStockItem();
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddNewStockItem}
                    disabled={!newIngredientName.trim()}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Přidat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
