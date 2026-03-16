import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiClient } from "@/shared/lib/api";
import type { Recipe, MenuRecipe } from "@shared/types";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
import { Search, ChefHat, Eye, Upload, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";

export default function Recipes() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

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
  const menusByRecipe = new Map<number, string[]>();
  allMenuRecipes?.forEach((mr) => {
    const existing = menusByRecipe.get(mr.recipeId) ?? [];
    const foodName = mr.reservationFood?.name;
    if (foodName && !existing.includes(foodName)) {
      existing.push(foodName);
    }
    menusByRecipe.set(mr.recipeId, existing);
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/recipes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      successToast("Receptura smazána");
    },
    onError: (err: any) => errorToast(err?.response?.data?.error || err.message),
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
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err.message;
      errorToast(msg);
    },
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

  const filteredRecipes = recipes?.filter((recipe) =>
    recipe.name.toLowerCase().includes(search.toLowerCase())
  );

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
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-recipe"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nová receptura
        </Button>
      </PageHeader>

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
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat recepturu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-recipes"
                />
              </div>
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
            <div className="text-center py-8 text-muted-foreground">
              {search ? "Žádné receptury nenalezeny" : "Zatím žádné receptury"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail receptury</DialogTitle>
            <DialogDescription>Informace o receptuře a ingrediencích</DialogDescription>
          </DialogHeader>
          {viewingRecipe && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1">Název</h3>
                <p className="text-muted-foreground">{viewingRecipe.name}</p>
              </div>
              {viewingRecipe.description && (
                <div>
                  <h3 className="font-semibold mb-1">Postup</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{viewingRecipe.description}</p>
                </div>
              )}
              <div className="flex gap-6">
                <div>
                  <h3 className="font-semibold mb-1">Počet porcí</h3>
                  <Badge variant="secondary">{viewingRecipe.portions} ks</Badge>
                </div>
                {viewingRecipe.portionWeight && (
                  <div>
                    <h3 className="font-semibold mb-1">Hmotnost porce</h3>
                    <Badge variant="secondary">{viewingRecipe.portionWeight} g</Badge>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Ingredience</h3>
                {viewingRecipe.ingredients && viewingRecipe.ingredients.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Surovina</TableHead>
                        <TableHead>Dodavatel</TableHead>
                        <TableHead className="text-right">Množství</TableHead>
                        <TableHead className="text-right">Cena za kg/l</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingRecipe.ingredients.map((ing) => (
                        <TableRow key={ing.id}>
                          <TableCell>{ing.stockItem?.name || `ID: ${ing.stockItemId}`}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {ing.stockItem?.supplier || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {ing.quantityRequired} {ing.stockItem?.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            {ing.stockItem?.pricePerUnit ? `${ing.stockItem.pricePerUnit} Kč` : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">Zatím žádné ingredience</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>Zavřít</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
