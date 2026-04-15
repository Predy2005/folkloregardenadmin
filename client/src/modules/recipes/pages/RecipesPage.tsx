import { useRef, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiClient } from "@/shared/lib/api";
import type { Recipe, MenuRecipe } from "@shared/types";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { useAuth } from "@modules/auth";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { ChefHat, Eye, Upload, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { SearchInput, EmptyState } from "@/shared/components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { RecipeViewDialog } from "../components/RecipeViewDialog";

export default function Recipes() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"delete" | null>(null);
  const [menuFilter, setMenuFilter] = useState<string>("all");
  const [ingredientsFilter, setIngredientsFilter] = useState<string>("all");

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filteredRecipes) return;
    if (selectedIds.size === filteredRecipes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecipes.map((r) => r.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const { data: recipes, isLoading } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
    queryFn: () => api.get<Recipe[]>("/api/recipes"),
  });

  // Fetch all menu-recipe links to show which menus use each recipe
  const { data: allMenuRecipes } = useQuery<MenuRecipe[]>({
    queryKey: ["/api/menu-recipes", "all"],
    queryFn: () => api.get<MenuRecipe[]>("/api/menu-recipes?all=1"),
  });

  // Group menu recipes by recipeId
  const menusByRecipe = useMemo(() => {
    const map = new Map<number, string[]>();
    allMenuRecipes?.forEach((mr) => {
      const existing = map.get(mr.recipeId) ?? [];
      const foodName = mr.reservationFood?.name;
      if (foodName && !existing.includes(foodName)) {
        existing.push(foodName);
      }
      map.set(mr.recipeId, existing);
    });
    return map;
  }, [allMenuRecipes]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/recipes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      successToast("Receptura smazána");
    },
    onError: (err: Error) => errorToast(err.message),
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post("/api/recipes/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
      successToast(
        `Import dokončen: ${data.recipes} receptur, ${data.stockItems} nových surovin, ${data.ingredients} ingrediencí`
      );
    },
    onError: (err: Error) => {
      errorToast(err.message);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) =>
      api.delete("/api/recipes/bulk-delete", { data: { ids } }),
    onSuccess: (data: { count: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      successToast(`Smazáno ${data.count} receptur`);
      clearSelection();
      setBulkActionOpen(false);
    },
    onError: (err: Error) => errorToast(err.message),
  });

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
    e.target.value = "";
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tuto recepturu?")) {
      deleteMutation.mutate(id);
    }
  };

  const uniqueMenuNames = useMemo(() => {
    const names = new Set<string>();
    allMenuRecipes?.forEach(mr => {
      if (mr.reservationFood?.name) names.add(mr.reservationFood.name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, "cs"));
  }, [allMenuRecipes]);

  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];
    let result = recipes;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(r => r.name.toLowerCase().includes(term) || r.description?.toLowerCase().includes(term));
    }
    if (menuFilter !== "all") {
      result = result.filter(r => (menusByRecipe.get(r.id) ?? []).includes(menuFilter));
    }
    if (ingredientsFilter !== "all") {
      result = result.filter(r =>
        ingredientsFilter === "with" ? (r.ingredients?.length ?? 0) > 0 : (r.ingredients?.length ?? 0) === 0
      );
    }
    return result;
  }, [recipes, search, menuFilter, ingredientsFilter, menusByRecipe]);

  const handleView = (recipe: Recipe) => {
    setViewingRecipe(recipe);
    setIsViewOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Receptury" description="Správa receptů a ingrediencí">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          onClick={handleImport}
          disabled={importMutation.isPending}
          data-testid="button-import-recipes"
        >
          {importMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {importMutation.isPending ? "Importuji..." : "Import z Excelu"}
        </Button>
        <Button
          onClick={() => navigate("/recipes/new")}
          className="bg-primary hover:bg-primary/90"
          data-testid="button-create-recipe"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nová receptura
        </Button>
      </PageHeader>

      {isSuperAdmin && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Badge variant="secondary">{selectedIds.size} vybráno</Badge>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setBulkActionType("delete");
              setBulkActionOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Smazat
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Zrušit výběr
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="w-5 h-5" />
                Receptury
              </CardTitle>
              <CardDescription>
                Celkem: {recipes?.length || 0} receptur
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Hledat recepturu..."
                className="w-64"
              />
              <Select value={menuFilter} onValueChange={setMenuFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Menu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechna menu</SelectItem>
                  {uniqueMenuNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ingredientsFilter} onValueChange={setIngredientsFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Ingredience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny</SelectItem>
                  <SelectItem value="with">S ingrediencemi</SelectItem>
                  <SelectItem value="without">Bez ingrediencí</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredRecipes && filteredRecipes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  {isSuperAdmin && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filteredRecipes!.length > 0 && selectedIds.size === filteredRecipes!.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Název</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Počet porcí</TableHead>
                  <TableHead>Hmotnost porce</TableHead>
                  <TableHead>Ingredience</TableHead>
                  <TableHead>Menu</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipes.map((recipe) => (
                  <TableRow key={recipe.id} data-testid={`row-recipe-${recipe.id}`}>
                    {isSuperAdmin && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(recipe.id)}
                          onCheckedChange={() => toggleSelect(recipe.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{recipe.name}</TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground max-w-xs truncate">
                        {recipe.description || "-"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{recipe.portions} ks</Badge>
                    </TableCell>
                    <TableCell>
                      {recipe.portionWeight ? `${recipe.portionWeight} g` : "-"}
                    </TableCell>
                    <TableCell>
                      {recipe.ingredients?.length || 0} položek
                    </TableCell>
                    <TableCell>
                      {(menusByRecipe.get(recipe.id) ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {menusByRecipe.get(recipe.id)!.map((name) => (
                            <Badge key={name} variant="outline" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleView(recipe)}
                                data-testid={`button-view-${recipe.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Zobrazit detail</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
                                data-testid={`button-edit-${recipe.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Upravit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(recipe.id)}
                                data-testid={`button-delete-${recipe.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Smazat</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title={search ? "Žádné receptury nenalezeny" : "Zatím žádné receptury"} />
          )}
        </CardContent>
      </Card>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkActionOpen && bulkActionType === "delete"} onOpenChange={setBulkActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hromadné smazání receptur</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat {selectedIds.size} vybraných receptur? Tato akce je nevratná.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionOpen(false)}>
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <RecipeViewDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        recipe={viewingRecipe}
      />
    </div>
  );
}
