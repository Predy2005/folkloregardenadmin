import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import type { Recipe, StockItem, RecipeIngredient } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Search, ChefHat, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const recipeSchema = z.object({
  name: z.string().min(1, "Zadejte název receptury"),
  description: z.string().optional(),
  portions: z.number().min(1, "Počet porcí musí být alespoň 1"),
});

type RecipeForm = z.infer<typeof recipeSchema>;

export default function Recipes() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const { toast } = useToast();

  const { data: recipes, isLoading } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
  });

  const createForm = useForm<RecipeForm>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      name: "",
      description: "",
      portions: 1,
    },
  });

  const editForm = useForm<RecipeForm>({
    resolver: zodResolver(recipeSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: RecipeForm) => {
      return await api.post("/api/recipes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Úspěch",
        description: "Receptura byla vytvořena",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit recepturu",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: RecipeForm }) => {
      return await api.put(`/api/recipes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      setIsEditOpen(false);
      setEditingRecipe(null);
      toast({
        title: "Úspěch",
        description: "Receptura byla aktualizována",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat recepturu",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/recipes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: "Úspěch",
        description: "Receptura byla smazána",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat recepturu",
        variant: "destructive",
      });
    },
  });

  const filteredRecipes = recipes?.filter((recipe) =>
    recipe.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    editForm.reset({
      name: recipe.name,
      description: recipe.description || "",
      portions: recipe.portions,
    });
    setIsEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tuto recepturu?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleView = (recipe: Recipe) => {
    setViewingRecipe(recipe);
    setIsViewOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Receptury</h1>
          <p className="text-muted-foreground">Správa receptů a ingrediencí</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-recipe"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nová receptura
        </Button>
      </div>

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
                  <TableHead>Ingredience</TableHead>
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
                      {recipe.ingredients?.length || 0} položek
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(recipe)}
                          data-testid={`button-view-${recipe.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(recipe)}
                          data-testid={`button-edit-${recipe.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(recipe.id)}
                          data-testid={`button-delete-${recipe.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nová receptura</DialogTitle>
            <DialogDescription>Vytvořte novou recepturu</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název *</FormLabel>
                    <FormControl>
                      <Input placeholder="Název receptury" data-testid="input-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Popis</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Popis receptury" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="portions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Počet porcí *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {createMutation.isPending ? "Vytváření..." : "Vytvořit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit recepturu</DialogTitle>
            <DialogDescription>Upravte detaily receptury</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) =>
                editingRecipe && updateMutation.mutate({ id: editingRecipe.id, data })
              )}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název *</FormLabel>
                    <FormControl>
                      <Input placeholder="Název receptury" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Popis</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Popis receptury" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="portions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Počet porcí *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {updateMutation.isPending ? "Ukládání..." : "Uložit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
                  <h3 className="font-semibold mb-1">Popis</h3>
                  <p className="text-muted-foreground">{viewingRecipe.description}</p>
                </div>
              )}
              <div>
                <h3 className="font-semibold mb-1">Počet porcí</h3>
                <Badge variant="secondary">{viewingRecipe.portions} ks</Badge>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Ingredience</h3>
                {viewingRecipe.ingredients && viewingRecipe.ingredients.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Surovina</TableHead>
                        <TableHead className="text-right">Množství</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingRecipe.ingredients.map((ing) => (
                        <TableRow key={ing.id}>
                          <TableCell>{ing.stockItem?.name || `ID: ${ing.stockItemId}`}</TableCell>
                          <TableCell className="text-right">
                            {ing.quantityRequired} {ing.stockItem?.unit}
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
