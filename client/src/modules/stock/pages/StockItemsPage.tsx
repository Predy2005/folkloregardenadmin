import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { StockItem, Recipe } from "@shared/types";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useAuth } from "@/modules/auth/contexts/AuthContext";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, AlertTriangle, Loader2, ClipboardList } from "lucide-react";
import { useLocation } from "wouter";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { useFormDialog } from "@/shared/hooks/useFormDialog";
import { useCrudMutations } from "@/shared/hooks/useCrudMutations";
import type { Suggestion } from "@/shared/components/AutocompleteInput";
import { StockFilters } from "../components/StockFilters";
import { StockTable } from "../components/StockTable";
import { StockFormDialog } from "../components/StockFormDialog";
import { useBulkSelection } from "@/shared/hooks/useBulkSelection";

// --- Schema (exported for StockFormDialog) ---
export const stockItemSchema = z.object({
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
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [stockLevelFilter, setStockLevelFilter] = useState<string>("all");
  const { isSuperAdmin } = useAuth();
  const { defaultCurrency } = useCurrency();
  const [currency, setCurrency] = useState(defaultCurrency);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'supplier' | 'delete' | null>(null);
  const [bulkSupplierValue, setBulkSupplierValue] = useState("");
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
        suggestions.push({ value: si.name, label: si.name, description: `Skladová položka (${si.unit})` });
      }
    });
    return suggestions.sort((a, b) => a.value.localeCompare(b.value, "cs"));
  }, [recipes, stockItems]);

  const supplierSuggestions = useMemo((): Suggestion[] => {
    const suppliers = new Map<string, number>();
    stockItems?.forEach((si) => {
      if (si.supplier) suppliers.set(si.supplier, (suppliers.get(si.supplier) || 0) + 1);
    });
    return Array.from(suppliers.entries())
      .map(([name, count]) => ({
        value: name, label: name,
        description: `${count} ${count === 1 ? "položka" : count < 5 ? "položky" : "položek"}`,
      }))
      .sort((a, b) => a.value.localeCompare(b.value, "cs"));
  }, [stockItems]);

  const uniqueSuppliers = useMemo(() => {
    const suppliers = new Set<string>();
    stockItems?.forEach((si) => { if (si.supplier) suppliers.add(si.supplier); });
    return Array.from(suppliers).sort((a, b) => a.localeCompare(b, "cs"));
  }, [stockItems]);

  const ingredientUnitMap = useMemo(() => {
    const map = new Map<string, string>();
    recipes?.forEach((recipe) => {
      recipe.ingredients?.forEach((ing) => {
        const name = ing.stockItem?.name;
        const unit = ing.stockItem?.unit;
        if (name && unit && !map.has(name)) map.set(name, unit);
      });
    });
    stockItems?.forEach((si) => { if (!map.has(si.name)) map.set(si.name, si.unit); });
    return map;
  }, [recipes, stockItems]);

  const form = useForm<StockItemForm>({
    resolver: zodResolver(stockItemSchema),
    defaultValues: { name: "", description: "", unit: "kg", quantityAvailable: 0, minQuantity: null, pricePerUnit: null, supplier: "" },
  });

  const { createMutation, updateMutation, deleteMutation, isPending } = useCrudMutations<StockItemForm>({
    endpoint: "/api/stock-items",
    queryKey: ["/api/stock-items"],
    entityName: "Položka skladu",
    onCreateSuccess: () => { dialog.close(); form.reset(); },
    onUpdateSuccess: () => dialog.close(),
  });

  const filteredItems = stockItems?.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesUnit = unitFilter === "all" || item.unit === unitFilter;
    const matchesSupplier = supplierFilter === "all" || (item.supplier || "") === supplierFilter;
    const isLowStock = item.minQuantity && item.quantityAvailable < item.minQuantity;
    const matchesStockLevel = stockLevelFilter === "all" || (stockLevelFilter === "low" && isLowStock) || (stockLevelFilter === "sufficient" && !isLowStock);
    return matchesSearch && matchesUnit && matchesSupplier && matchesStockLevel;
  });

  const getId = useCallback((item: StockItem) => item.id, []);
  const { selectedIds, toggleSelect, toggleSelectAll, clearSelection } = useBulkSelection({ items: filteredItems || [], getId });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { ids: number[]; updates: Record<string, string | boolean> }) => await api.put('/api/stock-items/bulk-update', data),
    onSuccess: (data: { count: number }) => { queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] }); setBulkActionOpen(false); clearSelection(); setBulkSupplierValue(""); successToast(`Aktualizováno ${data.count} položek`); },
    onError: (error: Error) => errorToast(error),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => await api.delete('/api/stock-items/bulk-delete', { data: { ids } }),
    onSuccess: (data: { count: number }) => { queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] }); setBulkActionOpen(false); clearSelection(); successToast(`Smazáno ${data.count} položek`); },
    onError: (error: Error) => errorToast(error),
  });

  const executeBulkAction = () => {
    const ids = Array.from(selectedIds);
    if (bulkActionType === 'delete') bulkDeleteMutation.mutate(ids);
    else if (bulkActionType === 'supplier') bulkUpdateMutation.mutate({ ids, updates: { supplier: bulkSupplierValue } });
  };

  const handleEdit = (item: StockItem) => {
    dialog.openEdit(item);
    form.reset({
      name: item.name, description: item.description || "", unit: item.unit,
      quantityAvailable: parseFloat(String(item.quantityAvailable)) || 0,
      minQuantity: item.minQuantity != null ? parseFloat(String(item.minQuantity)) : null,
      pricePerUnit: item.pricePerUnit != null ? parseFloat(String(item.pricePerUnit)) : null,
      supplier: item.supplier || "",
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tuto skladovou položku?")) deleteMutation.mutate(id);
  };

  const lowStockItems = stockItems?.filter((item) => item.minQuantity && item.quantityAvailable < item.minQuantity);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Sklad" description="Správa skladových položek a surovin">
        <Button variant="outline" onClick={() => navigate("/stock/receive")}>
          <ClipboardList className="w-4 h-4 mr-2" />
          Příjem zboží
        </Button>
        <Button onClick={() => { dialog.openCreate(); form.reset(); }} className="bg-primary hover:bg-primary/90" data-testid="button-create-stock-item">
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
            <CardDescription>{lowStockItems.length} položek má zásoby pod minimem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-card rounded-lg border">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Skladem: {item.quantityAvailable} {item.unit} (minimum: {item.minQuantity} {item.unit})</p>
                  </div>
                  <Badge variant="destructive">Nízké zásoby</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <StockFilters
          search={search} setSearch={setSearch}
          unitFilter={unitFilter} setUnitFilter={setUnitFilter}
          supplierFilter={supplierFilter} setSupplierFilter={setSupplierFilter}
          stockLevelFilter={stockLevelFilter} setStockLevelFilter={setStockLevelFilter}
          uniqueSuppliers={uniqueSuppliers} totalCount={stockItems?.length || 0}
          isSuperAdmin={isSuperAdmin} selectedIds={selectedIds}
          onBulkChangeSupplier={() => { setBulkActionType('supplier'); setBulkSupplierValue(''); setBulkActionOpen(true); }}
          onBulkDelete={() => { setBulkActionType('delete'); setBulkActionOpen(true); }}
          onClearSelection={clearSelection}
        />
        <CardContent>
          <StockTable
            items={filteredItems || []} isLoading={isLoading} search={search}
            isSuperAdmin={isSuperAdmin} selectedIds={selectedIds} defaultCurrency={defaultCurrency}
            onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll}
            onEdit={handleEdit} onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionOpen} onOpenChange={(open) => { setBulkActionOpen(open); if (!open) setBulkSupplierValue(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkActionType === 'delete' ? `Smazat ${selectedIds.size} položek?` : `Změnit dodavatele (${selectedIds.size} položek)`}
            </DialogTitle>
            <DialogDescription>
              {bulkActionType === 'delete' ? 'Tato akce je nevratná.' : 'Zadejte nového dodavatele pro všechny označené položky.'}
            </DialogDescription>
          </DialogHeader>
          {bulkActionType === 'supplier' && (
            <div className="py-4">
              <Input placeholder="Název dodavatele" value={bulkSupplierValue} onChange={(e) => setBulkSupplierValue(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkActionOpen(false); setBulkSupplierValue(''); }}>Zrušit</Button>
            <Button
              variant={bulkActionType === 'delete' ? 'destructive' : 'default'}
              onClick={executeBulkAction}
              disabled={bulkUpdateMutation.isPending || bulkDeleteMutation.isPending || (bulkActionType === 'supplier' && !bulkSupplierValue)}
            >
              {(bulkUpdateMutation.isPending || bulkDeleteMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bulkActionType === 'delete' ? 'Smazat' : 'Aplikovat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StockFormDialog
        isOpen={dialog.isOpen} isEditing={dialog.isEditing} editingItem={dialog.editingItem}
        form={form} isPending={isPending} currency={currency} setCurrency={setCurrency}
        ingredientSuggestions={ingredientSuggestions} supplierSuggestions={supplierSuggestions} ingredientUnitMap={ingredientUnitMap}
        onClose={() => dialog.close()}
        onSubmit={(data) => dialog.isEditing && dialog.editingItem ? updateMutation.mutate({ id: dialog.editingItem.id, data }) : createMutation.mutate(data)}
      />
    </div>
  );
}
