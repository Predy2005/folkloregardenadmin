import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import type { DrinkItem, DrinkCategory, FoodDrinkPairing, ReservationFood } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Plus } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { useToast } from "@/shared/hooks/use-toast";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { DrinksTable } from "../components/DrinksTable";
import { DrinkDialog, type DrinkFormData } from "../components/DrinkDialog";
import { PairingsSection } from "../components/PairingsSection";
import { PairingDialog, type PairingFormData } from "../components/PairingDialog";
import { useBulkSelection } from "@/shared/hooks/useBulkSelection";

const defaultDrinkForm: DrinkFormData = {
  name: "", category: "OTHER", price: "", isAlcoholic: false, isActive: true, description: "",
};

const defaultPairingForm: PairingFormData = {
  foodId: "", drinkId: "", isDefault: false, isIncludedInPrice: false, surcharge: "0",
};

export default function DrinksPage() {
  const { defaultCurrency } = useCurrency();
  const [drinkCurrency, setDrinkCurrency] = useState(defaultCurrency);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [alcoholicFilter, setAlcoholicFilter] = useState<string>("all");
  const [drinkDialogOpen, setDrinkDialogOpen] = useState(false);
  const [editingDrink, setEditingDrink] = useState<DrinkItem | null>(null);
  const [drinkForm, setDrinkForm] = useState<DrinkFormData>({ ...defaultDrinkForm });
  const [pairingDialogOpen, setPairingDialogOpen] = useState(false);
  const [pairingForm, setPairingForm] = useState<PairingFormData>({ ...defaultPairingForm });

  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: drinks, isLoading: drinksLoading } = useQuery<DrinkItem[]>({
    queryKey: ["/api/drinks"], queryFn: () => api.get("/api/drinks"),
  });
  const { data: pairings, isLoading: pairingsLoading } = useQuery<FoodDrinkPairing[]>({
    queryKey: ["/api/drinks/pairings"], queryFn: () => api.get("/api/drinks/pairings"),
  });
  const { data: foods } = useQuery<ReservationFood[]>({
    queryKey: ["/api/reservation-foods"], queryFn: () => api.get("/api/reservation-foods"),
  });

  const filteredDrinks = drinks?.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || (d.description || "").toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (categoryFilter !== "all" && d.category !== categoryFilter) return false;
    if (statusFilter === "active" && !d.isActive) return false;
    if (statusFilter === "inactive" && d.isActive) return false;
    if (alcoholicFilter === "alcoholic" && !d.isAlcoholic) return false;
    if (alcoholicFilter === "non-alcoholic" && d.isAlcoholic) return false;
    return true;
  });

  const getId = useCallback((d: DrinkItem) => d.id, []);
  const { selectedIds: selected, toggleSelect, toggleSelectAll, clearSelection } = useBulkSelection({ items: filteredDrinks || [], getId });

  const createDrinkMutation = useMutation({
    mutationFn: (data: DrinkFormData) => api.post("/api/drinks", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/drinks"] }); setDrinkDialogOpen(false); toast({ title: "Napoj vytvoren" }); },
    onError: () => toast({ title: "Chyba pri vytvareni napoje", variant: "destructive" }),
  });
  const updateDrinkMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DrinkFormData }) => api.put(`/api/drinks/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/drinks"] }); setDrinkDialogOpen(false); setEditingDrink(null); toast({ title: "Napoj aktualizovan" }); },
    onError: () => toast({ title: "Chyba pri aktualizaci napoje", variant: "destructive" }),
  });
  const deleteDrinkMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/drinks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/drinks"] }); toast({ title: "Napoj smazan" }); },
    onError: () => toast({ title: "Chyba pri mazani napoje", variant: "destructive" }),
  });
  const bulkDrinkMutation = useMutation({
    mutationFn: (data: { ids: number[]; action: string }) => api.post("/api/drinks/bulk", data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["/api/drinks"] }); clearSelection();
      const labels: Record<string, string> = { activate: "aktivovano", deactivate: "deaktivovano", delete: "smazano" };
      toast({ title: `Hromadna akce: ${variables.ids.length} napoju ${labels[variables.action]}` });
    },
    onError: () => toast({ title: "Chyba pri hromadne akci", variant: "destructive" }),
  });
  const createPairingMutation = useMutation({
    mutationFn: (data: PairingFormData) => api.post("/api/drinks/pairings", {
      foodId: Number(data.foodId), drinkId: Number(data.drinkId),
      isDefault: data.isDefault, isIncludedInPrice: data.isIncludedInPrice, surcharge: data.surcharge,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/drinks/pairings"] }); setPairingDialogOpen(false); setPairingForm({ ...defaultPairingForm }); toast({ title: "Propojeni vytvoreno" }); },
    onError: () => toast({ title: "Chyba pri vytvareni propojeni", variant: "destructive" }),
  });
  const deletePairingMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/drinks/pairings/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/drinks/pairings"] }); toast({ title: "Propojeni smazano" }); },
    onError: () => toast({ title: "Chyba pri mazani propojeni", variant: "destructive" }),
  });

  const openCreateDrink = () => { setEditingDrink(null); setDrinkForm({ ...defaultDrinkForm }); setDrinkDialogOpen(true); };
  const openEditDrink = (drink: DrinkItem) => {
    setEditingDrink(drink);
    setDrinkForm({ name: drink.name, category: drink.category, price: drink.price, isAlcoholic: drink.isAlcoholic, isActive: drink.isActive, description: drink.description || "" });
    setDrinkDialogOpen(true);
  };
  const handleDrinkSubmit = () => {
    if (!drinkForm.name.trim()) return;
    if (editingDrink) updateDrinkMutation.mutate({ id: editingDrink.id, data: drinkForm });
    else createDrinkMutation.mutate(drinkForm);
  };
  const handleDeleteDrink = (id: number) => { if (confirm("Opravdu chcete smazat tento napoj?")) deleteDrinkMutation.mutate(id); };
  const handleBulkAction = (action: string) => {
    if (selected.size === 0) return;
    if (action === "delete" && !confirm(`Opravdu smazat ${selected.size} napoju?`)) return;
    bulkDrinkMutation.mutate({ ids: Array.from(selected), action });
  };
  const handleDeletePairing = (id: number) => { if (confirm("Opravdu chcete smazat toto propojeni?")) deletePairingMutation.mutate(id); };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Napoje" description="Sprava napoju a propojeni s jidly">
        <Button onClick={openCreateDrink} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Novy napoj
        </Button>
      </PageHeader>

      <Card>
        <DrinksTable
          drinks={drinks} filteredDrinks={filteredDrinks} isLoading={drinksLoading}
          search={search} setSearch={setSearch} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter} alcoholicFilter={alcoholicFilter} setAlcoholicFilter={setAlcoholicFilter}
          selected={selected} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll}
          onBulkAction={handleBulkAction} onEdit={openEditDrink} onDelete={handleDeleteDrink}
        />
      </Card>

      <PairingsSection
        pairings={pairings} isLoading={pairingsLoading}
        onCreatePairing={() => { setPairingForm({ ...defaultPairingForm }); setPairingDialogOpen(true); }}
        onDeletePairing={handleDeletePairing}
      />

      <DrinkDialog
        isOpen={drinkDialogOpen} onOpenChange={setDrinkDialogOpen} editingDrink={editingDrink}
        form={drinkForm} setForm={setDrinkForm} currency={drinkCurrency} setCurrency={setDrinkCurrency}
        onSubmit={handleDrinkSubmit} isPending={createDrinkMutation.isPending || updateDrinkMutation.isPending}
      />

      <PairingDialog
        isOpen={pairingDialogOpen} onOpenChange={setPairingDialogOpen}
        form={pairingForm} setForm={setPairingForm} foods={foods} drinks={drinks}
        onSubmit={() => createPairingMutation.mutate(pairingForm)} isPending={createPairingMutation.isPending}
      />
    </div>
  );
}
