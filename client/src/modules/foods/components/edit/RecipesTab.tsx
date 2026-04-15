import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { AlertCircle, ChefHat, Edit, Loader2, Plus, Trash2 } from "lucide-react";
import type { MenuRecipe, Recipe } from "@shared/types";
import { COURSE_TYPE_LABELS } from "@shared/types";

interface RecipesTabProps {
  foodId: number;
}

export function RecipesTab({ foodId }: RecipesTabProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [selectedCourseType, setSelectedCourseType] = useState<string>("");
  const [editingMenuRecipeId, setEditingMenuRecipeId] = useState<number | null>(null);

  const { data: menuRecipes, isLoading: isLoadingMenuRecipes, isError: isMenuRecipesError } = useQuery<MenuRecipe[]>({
    queryKey: ["/api/menu-recipes", foodId],
    queryFn: () => api.get<MenuRecipe[]>(`/api/menu-recipes?reservationFoodId=${foodId}`),
  });

  const { data: allRecipes, isLoading: isLoadingRecipes } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
    queryFn: () => api.get<Recipe[]>("/api/recipes"),
  });

  const linkedRecipeIds = new Set(menuRecipes?.map((mr) => mr.recipeId) ?? []);
  const availableRecipes = allRecipes?.filter((r) => !linkedRecipeIds.has(r.id)) ?? [];

  const createMenuRecipeMutation = useMutation({
    mutationFn: (data: { reservationFoodId: number; recipeId: number; courseType?: string }) =>
      api.post("/api/menu-recipes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-recipes", foodId] });
      setSelectedRecipeId("");
      setSelectedCourseType("");
      successToast("Receptura byla přiřazena");
    },
    onError: (err: Error) => errorToast(err.message || "Chyba při přiřazování receptury"),
  });

  const updateMenuRecipeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { portionsPerServing?: number; courseType?: string } }) =>
      api.put(`/api/menu-recipes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-recipes", foodId] });
      setEditingMenuRecipeId(null);
      successToast("Receptura byla aktualizována");
    },
    onError: (err: Error) => errorToast(err.message || "Chyba při aktualizaci receptury"),
  });

  const deleteMenuRecipeMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/menu-recipes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-recipes", foodId] });
      successToast("Receptura byla odebrána");
    },
    onError: (err: Error) => errorToast(err.message || "Chyba při odebírání receptury"),
  });

  return (
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
              if (!selectedRecipeId) return;
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
  );
}
