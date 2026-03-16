import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { StockItem, Recipe } from "@shared/types";
import { STOCK_UNIT_LABELS } from "@shared/types";
import { api } from "@/shared/lib/api";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Search, Package, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import { useFormDialog } from "@/shared/hooks/useFormDialog";
import { useCrudMutations } from "@/shared/hooks/useCrudMutations";

// --- Autocomplete dropdown component ---
interface Suggestion {
  value: string;
  label: string;
  description?: string;
}

function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  onSelect,
  "data-testid": testId,
}: {
  value: string;
  onChange: (val: string) => void;
  suggestions: Suggestion[];
  placeholder?: string;
  onSelect?: (suggestion: Suggestion) => void;
  "data-testid"?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value) return suggestions.slice(0, 15);
    const lower = value.toLowerCase();
    return suggestions.filter((s) => s.value.toLowerCase().includes(lower)).slice(0, 15);
  }, [value, suggestions]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        data-testid={testId}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md max-h-60 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s.value}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-accent cursor-pointer",
                value === s.value && "bg-accent"
              )}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur before click
                onChange(s.value);
                onSelect?.(s);
                setOpen(false);
              }}
            >
              <div className="font-medium">{s.label}</div>
              {s.description && (
                <div className="text-xs text-muted-foreground">{s.description}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Schema ---
const stockItemSchema = z.object({
  name: z.string().min(1, "Zadejte název položky"),
  description: z.string().optional(),
  unit: z.string().min(1, "Vyberte jednotku"),
  quantityAvailable: z.coerce.number().min(0, "Množství musí být kladné"),
  minQuantity: z.coerce.number().min(0).nullable().optional(),
  pricePerUnit: z.coerce.number().min(0).nullable().optional(),
  supplier: z.string().optional(),
});

type StockItemForm = z.infer<typeof stockItemSchema>;

export default function StockItems() {
  const [search, setSearch] = useState("");
  const dialog = useFormDialog<StockItem>();

  const { data: stockItems, isLoading } = useQuery<StockItem[]>({
    queryKey: ["/api/stock-items"],
    queryFn: () => api.get("/api/stock-items"),
  });

  const { data: recipes } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
    queryFn: () => api.get("/api/recipes"),
  });

  // Build unique ingredient name suggestions from recipes + existing stock items
  const ingredientSuggestions = useMemo((): Suggestion[] => {
    const namesFromRecipes = new Map<string, { recipeName: string; unit?: string }>();
    recipes?.forEach((recipe) => {
      recipe.ingredients?.forEach((ing) => {
        const name = ing.stockItem?.name;
        const unit = ing.stockItem?.unit;
        if (name && !namesFromRecipes.has(name)) {
          namesFromRecipes.set(name, { recipeName: recipe.name, unit });
        }
      });
    });

    const existingNames = new Set(stockItems?.map((si) => si.name) ?? []);

    const suggestions: Suggestion[] = [];

    namesFromRecipes.forEach(({ recipeName, unit }, name) => {
      const exists = existingNames.has(name);
      suggestions.push({
        value: name,
        label: name,
        description: `Receptura: ${recipeName}${unit ? ` (${unit})` : ""}${exists ? " — již ve skladu" : ""}`,
      });
    });

    stockItems?.forEach((si) => {
      if (!namesFromRecipes.has(si.name)) {
        suggestions.push({
          value: si.name,
          label: si.name,
          description: `Skladová položka (${si.unit})`,
        });
      }
    });

    return suggestions.sort((a, b) => a.value.localeCompare(b.value, "cs"));
  }, [recipes, stockItems]);

  // Build unique supplier suggestions from existing stock items
  const supplierSuggestions = useMemo((): Suggestion[] => {
    const suppliers = new Map<string, number>();
    stockItems?.forEach((si) => {
      if (si.supplier) {
        suppliers.set(si.supplier, (suppliers.get(si.supplier) || 0) + 1);
      }
    });
    return Array.from(suppliers.entries())
      .map(([name, count]) => ({
        value: name,
        label: name,
        description: `${count} ${count === 1 ? "položka" : count < 5 ? "položky" : "položek"}`,
      }))
      .sort((a, b) => a.value.localeCompare(b.value, "cs"));
  }, [stockItems]);

  // Unit lookup from ingredient suggestions for auto-fill
  const ingredientUnitMap = useMemo(() => {
    const map = new Map<string, string>();
    recipes?.forEach((recipe) => {
      recipe.ingredients?.forEach((ing) => {
        const name = ing.stockItem?.name;
        const unit = ing.stockItem?.unit;
        if (name && unit && !map.has(name)) map.set(name, unit);
      });
    });
    stockItems?.forEach((si) => {
      if (!map.has(si.name)) map.set(si.name, si.unit);
    });
    return map;
  }, [recipes, stockItems]);

  const form = useForm<StockItemForm>({
    resolver: zodResolver(stockItemSchema),
    defaultValues: {
      name: "",
      description: "",
      unit: "kg",
      quantityAvailable: 0,
      minQuantity: null,
      pricePerUnit: null,
      supplier: "",
    },
  });

  const { createMutation, updateMutation, deleteMutation, isPending } = useCrudMutations<StockItemForm>({
    endpoint: "/api/stock-items",
    queryKey: ["/api/stock-items"],
    entityName: "Položka skladu",
    onCreateSuccess: () => { dialog.close(); form.reset(); },
    onUpdateSuccess: () => dialog.close(),
  });

  const filteredItems = stockItems?.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (item: StockItem) => {
    dialog.openEdit(item);
    form.reset({
      name: item.name,
      description: item.description || "",
      unit: item.unit,
      quantityAvailable: parseFloat(String(item.quantityAvailable)) || 0,
      minQuantity: item.minQuantity != null ? parseFloat(String(item.minQuantity)) : null,
      pricePerUnit: item.pricePerUnit != null ? parseFloat(String(item.pricePerUnit)) : null,
      supplier: item.supplier || "",
    });
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
      <PageHeader title="Sklad" description="Správa skladových položek a surovin">
        <Button
          onClick={() => { dialog.openCreate(); form.reset(); }}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-stock-item"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nová položka
        </Button>
      </PageHeader>

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

      {/* Create/Edit Dialog */}
      <Dialog open={dialog.isOpen} onOpenChange={(open) => { if (!open) dialog.close(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.isEditing ? "Upravit skladovou položku" : "Nová skladová položka"}
            </DialogTitle>
            <DialogDescription>
              {dialog.isEditing ? "Upravte detaily skladové položky" : "Přidejte novou položku do skladu"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) =>
                dialog.isEditing && dialog.editingItem
                  ? updateMutation.mutate({ id: dialog.editingItem.id, data })
                  : createMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název *</FormLabel>
                    <FormControl>
                      <AutocompleteInput
                        value={field.value}
                        onChange={(val) => field.onChange(val)}
                        suggestions={ingredientSuggestions}
                        placeholder={dialog.isEditing ? "Název položky" : "Např. Mouka hladká"}
                        data-testid="input-name"
                        onSelect={(s) => {
                          const unit = ingredientUnitMap.get(s.value);
                          if (unit) form.setValue("unit", unit);
                        }}
                      />
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
                      <Input placeholder="Popis položky" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jednotka *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  control={form.control}
                  name="quantityAvailable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Množství skladem *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimální zásoba</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder=""
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pricePerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cena za jednotku (Kč)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder=""
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dodavatel</FormLabel>
                    <FormControl>
                      <AutocompleteInput
                        value={field.value ?? ""}
                        onChange={(val) => field.onChange(val)}
                        suggestions={supplierSuggestions}
                        placeholder="Název dodavatele"
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
                  onClick={() => dialog.close()}
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {dialog.isEditing
                    ? (isPending ? "Ukládání..." : "Uložit")
                    : (isPending ? "Vytváření..." : "Vytvořit")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
