import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import type { StockItem } from "@shared/types";
import { STOCK_UNIT_LABELS } from "@shared/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Search, Package, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const stockItemSchema = z.object({
  name: z.string().min(1, "Zadejte název položky"),
  description: z.string().optional(),
  unit: z.string().min(1, "Vyberte jednotku"),
  quantityAvailable: z.number().min(0, "Množství musí být kladné"),
  minQuantity: z.number().min(0).optional(),
  pricePerUnit: z.number().min(0).optional(),
  supplier: z.string().optional(),
});

type StockItemForm = z.infer<typeof stockItemSchema>;

export default function StockItems() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const { toast } = useToast();

  const { data: stockItems, isLoading } = useQuery<StockItem[]>({
    queryKey: ["/api/stock-items"],
  });

  const createForm = useForm<StockItemForm>({
    resolver: zodResolver(stockItemSchema),
    defaultValues: {
      name: "",
      description: "",
      unit: "kg",
      quantityAvailable: 0,
      minQuantity: 0,
      pricePerUnit: 0,
      supplier: "",
    },
  });

  const editForm = useForm<StockItemForm>({
    resolver: zodResolver(stockItemSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: StockItemForm) => {
      return await api.post("/api/stock-items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Úspěch",
        description: "Skladová položka byla vytvořena",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit skladovou položku",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: StockItemForm }) => {
      return await api.put(`/api/stock-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
      setIsEditOpen(false);
      setEditingItem(null);
      toast({
        title: "Úspěch",
        description: "Skladová položka byla aktualizována",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat skladovou položku",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/stock-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
      toast({
        title: "Úspěch",
        description: "Skladová položka byla smazána",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat skladovou položku",
        variant: "destructive",
      });
    },
  });

  const filteredItems = stockItems?.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (item: StockItem) => {
    setEditingItem(item);
    editForm.reset({
      name: item.name,
      description: item.description || "",
      unit: item.unit,
      quantityAvailable: item.quantityAvailable,
      minQuantity: item.minQuantity || 0,
      pricePerUnit: item.pricePerUnit || 0,
      supplier: item.supplier || "",
    });
    setIsEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tuto skladovou položku?")) {
      deleteMutation.mutate(id);
    }
  };

  const lowStockItems = stockItems?.filter(
    (item) => item.minQuantity && item.quantityAvailable < item.minQuantity
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Sklad</h1>
          <p className="text-muted-foreground">Správa skladových položek a surovin</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-stock-item"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nová položka
        </Button>
      </div>

      {lowStockItems && lowStockItems.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="w-5 h-5" />
              Nízké zásoby
            </CardTitle>
            <CardDescription>
              {lowStockItems.length} položek má zásoby pod minimem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-card rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Skladem: {item.quantityAvailable} {item.unit} (minimum: {item.minQuantity} {item.unit})
                    </p>
                  </div>
                  <Badge variant="destructive">Nízké zásoby</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Skladové položky
              </CardTitle>
              <CardDescription>
                Celkem: {stockItems?.length || 0} položek
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat položku..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-stock-items"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredItems && filteredItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead>Skladem</TableHead>
                  <TableHead>Minimum</TableHead>
                  <TableHead>Cena/jednotka</TableHead>
                  <TableHead>Dodavatel</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} data-testid={`row-stock-item-${item.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.minQuantity && item.quantityAvailable < item.minQuantity
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {item.quantityAvailable} {item.unit}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.minQuantity ? `${item.minQuantity} ${item.unit}` : "-"}
                    </TableCell>
                    <TableCell>
                      {item.pricePerUnit ? `${item.pricePerUnit} Kč/${item.unit}` : "-"}
                    </TableCell>
                    <TableCell>{item.supplier || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          data-testid={`button-delete-${item.id}`}
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
              {search ? "Žádné položky nenalezeny" : "Zatím žádné skladové položky"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nová skladová položka</DialogTitle>
            <DialogDescription>Přidejte novou položku do skladu</DialogDescription>
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
                      <Input
                        placeholder="Např. Mouka hladká"
                        data-testid="input-name"
                        {...field}
                      />
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
                      <Input placeholder="Popis položky" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jednotka *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-unit">
                            <SelectValue placeholder="Vyberte jednotku" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(STOCK_UNIT_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="quantityAvailable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Množství skladem *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="minQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimální zásoba</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="pricePerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cena za jednotku (Kč)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createForm.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dodavatel</FormLabel>
                    <FormControl>
                      <Input placeholder="Název dodavatele" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
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
            <DialogTitle>Upravit skladovou položku</DialogTitle>
            <DialogDescription>Upravte detaily skladové položky</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) =>
                editingItem && updateMutation.mutate({ id: editingItem.id, data })
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
                      <Input placeholder="Název položky" {...field} />
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
                      <Input placeholder="Popis položky" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jednotka *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte jednotku" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(STOCK_UNIT_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="quantityAvailable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Množství skladem *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="minQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimální zásoba</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="pricePerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cena za jednotku (Kč)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dodavatel</FormLabel>
                    <FormControl>
                      <Input placeholder="Název dodavatele" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                >
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
    </div>
  );
}
