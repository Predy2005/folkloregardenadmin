import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import type { DrinkItem, DrinkCategory, FoodDrinkPairing, ReservationFood } from "@shared/types";
import { DRINK_CATEGORY_LABELS } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Textarea } from "@/shared/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2, Search, Wine, ChevronDown, Power, PowerOff, Link2 } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { useToast } from "@/shared/hooks/use-toast";

const CATEGORIES: DrinkCategory[] = ["BEER", "WINE", "SPIRIT", "SOFT", "COCKTAIL", "OTHER"];

interface DrinkFormData {
  name: string;
  category: DrinkCategory;
  price: string;
  isAlcoholic: boolean;
  isActive: boolean;
  description: string;
}

const defaultDrinkForm: DrinkFormData = {
  name: "",
  category: "OTHER",
  price: "",
  isAlcoholic: false,
  isActive: true,
  description: "",
};

interface PairingFormData {
  foodId: string;
  drinkId: string;
  isDefault: boolean;
  isIncludedInPrice: boolean;
  surcharge: string;
}

const defaultPairingForm: PairingFormData = {
  foodId: "",
  drinkId: "",
  isDefault: false,
  isIncludedInPrice: false,
  surcharge: "0",
};

export default function DrinksPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [drinkDialogOpen, setDrinkDialogOpen] = useState(false);
  const [editingDrink, setEditingDrink] = useState<DrinkItem | null>(null);
  const [drinkForm, setDrinkForm] = useState<DrinkFormData>({ ...defaultDrinkForm });

  const [pairingDialogOpen, setPairingDialogOpen] = useState(false);
  const [pairingForm, setPairingForm] = useState<PairingFormData>({ ...defaultPairingForm });

  const { toast } = useToast();
  const qc = useQueryClient();

  // Data queries
  const { data: drinks, isLoading: drinksLoading } = useQuery<DrinkItem[]>({
    queryKey: ["/api/drinks"],
    queryFn: () => api.get("/api/drinks"),
  });

  const { data: pairings, isLoading: pairingsLoading } = useQuery<FoodDrinkPairing[]>({
    queryKey: ["/api/drinks/pairings"],
    queryFn: () => api.get("/api/drinks/pairings"),
  });

  const { data: foods } = useQuery<ReservationFood[]>({
    queryKey: ["/api/reservation-foods"],
    queryFn: () => api.get("/api/reservation-foods"),
  });

  // Drink mutations
  const createDrinkMutation = useMutation({
    mutationFn: (data: DrinkFormData) => api.post("/api/drinks", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/drinks"] });
      setDrinkDialogOpen(false);
      toast({ title: "Napoj vytvoren" });
    },
    onError: () => toast({ title: "Chyba pri vytvareni napoje", variant: "destructive" }),
  });

  const updateDrinkMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DrinkFormData }) => api.put(`/api/drinks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/drinks"] });
      setDrinkDialogOpen(false);
      setEditingDrink(null);
      toast({ title: "Napoj aktualizovan" });
    },
    onError: () => toast({ title: "Chyba pri aktualizaci napoje", variant: "destructive" }),
  });

  const deleteDrinkMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/drinks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/drinks"] });
      toast({ title: "Napoj smazan" });
    },
    onError: () => toast({ title: "Chyba pri mazani napoje", variant: "destructive" }),
  });

  const bulkDrinkMutation = useMutation({
    mutationFn: (data: { ids: number[]; action: string }) => api.post("/api/drinks/bulk", data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["/api/drinks"] });
      setSelected(new Set());
      const labels: Record<string, string> = { activate: "aktivovano", deactivate: "deaktivovano", delete: "smazano" };
      toast({ title: `Hromadna akce: ${variables.ids.length} napoju ${labels[variables.action]}` });
    },
    onError: () => toast({ title: "Chyba pri hromadne akci", variant: "destructive" }),
  });

  // Pairing mutations
  const createPairingMutation = useMutation({
    mutationFn: (data: PairingFormData) => api.post("/api/drinks/pairings", {
      foodId: Number(data.foodId),
      drinkId: Number(data.drinkId),
      isDefault: data.isDefault,
      isIncludedInPrice: data.isIncludedInPrice,
      surcharge: data.surcharge,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/drinks/pairings"] });
      setPairingDialogOpen(false);
      setPairingForm({ ...defaultPairingForm });
      toast({ title: "Propojeni vytvoreno" });
    },
    onError: () => toast({ title: "Chyba pri vytvareni propojeni", variant: "destructive" }),
  });

  const deletePairingMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/drinks/pairings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/drinks/pairings"] });
      toast({ title: "Propojeni smazano" });
    },
    onError: () => toast({ title: "Chyba pri mazani propojeni", variant: "destructive" }),
  });

  // Filtered drinks
  const filteredDrinks = drinks?.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.description || "").toLowerCase().includes(search.toLowerCase())
  );

  // Handlers
  const openCreateDrink = () => {
    setEditingDrink(null);
    setDrinkForm({ ...defaultDrinkForm });
    setDrinkDialogOpen(true);
  };

  const openEditDrink = (drink: DrinkItem) => {
    setEditingDrink(drink);
    setDrinkForm({
      name: drink.name,
      category: drink.category,
      price: drink.price,
      isAlcoholic: drink.isAlcoholic,
      isActive: drink.isActive,
      description: drink.description || "",
    });
    setDrinkDialogOpen(true);
  };

  const handleDrinkSubmit = () => {
    if (!drinkForm.name.trim()) return;
    if (editingDrink) {
      updateDrinkMutation.mutate({ id: editingDrink.id, data: drinkForm });
    } else {
      createDrinkMutation.mutate(drinkForm);
    }
  };

  const handleDeleteDrink = (id: number) => {
    if (confirm("Opravdu chcete smazat tento napoj?")) {
      deleteDrinkMutation.mutate(id);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filteredDrinks) return;
    if (selected.size === filteredDrinks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredDrinks.map((d) => d.id)));
    }
  };

  const handleBulkAction = (action: string) => {
    if (selected.size === 0) return;
    if (action === "delete" && !confirm(`Opravdu smazat ${selected.size} napoju?`)) return;
    bulkDrinkMutation.mutate({ ids: Array.from(selected), action });
  };

  const handleDeletePairing = (id: number) => {
    if (confirm("Opravdu chcete smazat toto propojeni?")) {
      deletePairingMutation.mutate(id);
    }
  };

  const categoryBadgeVariant = (cat: DrinkCategory) => {
    switch (cat) {
      case "BEER": return "default" as const;
      case "WINE": return "secondary" as const;
      case "SPIRIT": return "destructive" as const;
      case "COCKTAIL": return "outline" as const;
      default: return "outline" as const;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Napoje" description="Sprava napoju a propojeni s jidly">
        <Button onClick={openCreateDrink} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Novy napoj
        </Button>
      </PageHeader>

      {/* Section 1: Drinks CRUD */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wine className="w-5 h-5" />
                Napoje
              </CardTitle>
              <CardDescription>Celkem: {drinks?.length || 0} napoju</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Hromadne ({selected.size})
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkAction("activate")}>
                      <Power className="w-4 h-4 mr-2" />
                      Aktivovat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("deactivate")}>
                      <PowerOff className="w-4 h-4 mr-2" />
                      Deaktivovat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction("delete")} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Smazat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat napoj..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {drinksLoading ? (
            <div className="text-center py-8 text-muted-foreground">Nacitani...</div>
          ) : filteredDrinks && filteredDrinks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredDrinks.length > 0 && selected.size === filteredDrinks.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nazev</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Cena (Kc)</TableHead>
                  <TableHead>Alkoholicky</TableHead>
                  <TableHead>Aktivni</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrinks.map((drink) => (
                  <TableRow key={drink.id}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(drink.id)}
                        onCheckedChange={() => toggleSelect(drink.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{drink.name}</TableCell>
                    <TableCell>
                      <Badge variant={categoryBadgeVariant(drink.category)}>
                        {DRINK_CATEGORY_LABELS[drink.category] || drink.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{drink.price} Kc</TableCell>
                    <TableCell>
                      <Badge variant={drink.isAlcoholic ? "destructive" : "secondary"}>
                        {drink.isAlcoholic ? "Ano" : "Ne"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={drink.isActive ? "default" : "secondary"}>
                        {drink.isActive ? "Aktivni" : "Neaktivni"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDrink(drink)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDrink(drink.id)}>
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
              {search ? "Zadne napoje nenalezeny" : "Zatim zadne napoje"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Food-Drink Pairings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Propojeni jidlo &harr; napoj
              </CardTitle>
              <CardDescription>Celkem: {pairings?.length || 0} propojeni</CardDescription>
            </div>
            <Button
              onClick={() => {
                setPairingForm({ ...defaultPairingForm });
                setPairingDialogOpen(true);
              }}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Pridat propojeni
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pairingsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Nacitani...</div>
          ) : pairings && pairings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jidlo</TableHead>
                  <TableHead>Napoj</TableHead>
                  <TableHead>Vychozi</TableHead>
                  <TableHead>V cene</TableHead>
                  <TableHead>Priplatek</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairings.map((pairing) => (
                  <TableRow key={pairing.id}>
                    <TableCell className="font-medium">{pairing.foodName}</TableCell>
                    <TableCell>
                      {pairing.drinkName}
                      <span className="text-muted-foreground text-xs ml-1">
                        ({pairing.drinkPrice} Kc)
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pairing.isDefault ? "default" : "outline"}>
                        {pairing.isDefault ? "Ano" : "Ne"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pairing.isIncludedInPrice ? "default" : "outline"}>
                        {pairing.isIncludedInPrice ? "Ano" : "Ne"}
                      </Badge>
                    </TableCell>
                    <TableCell>{pairing.surcharge} Kc</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePairing(pairing.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Zatim zadna propojeni
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drink Create/Edit Dialog */}
      <Dialog open={drinkDialogOpen} onOpenChange={setDrinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDrink ? "Upravit napoj" : "Novy napoj"}</DialogTitle>
            <DialogDescription>
              {editingDrink ? "Uprav udaje o napoji" : "Vyplnte udaje pro novy napoj"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nazev *</Label>
              <Input
                value={drinkForm.name}
                onChange={(e) => setDrinkForm({ ...drinkForm, name: e.target.value })}
                placeholder="Nazev napoje"
              />
            </div>
            <div>
              <Label>Kategorie</Label>
              <Select
                value={drinkForm.category}
                onValueChange={(v) => setDrinkForm({ ...drinkForm, category: v as DrinkCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {DRINK_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cena (Kc)</Label>
              <Input
                type="number"
                value={drinkForm.price}
                onChange={(e) => setDrinkForm({ ...drinkForm, price: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isAlcoholic"
                  checked={drinkForm.isAlcoholic}
                  onCheckedChange={(checked) =>
                    setDrinkForm({ ...drinkForm, isAlcoholic: !!checked })
                  }
                />
                <Label htmlFor="isAlcoholic">Alkoholicky</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={drinkForm.isActive}
                  onCheckedChange={(checked) =>
                    setDrinkForm({ ...drinkForm, isActive: !!checked })
                  }
                />
                <Label htmlFor="isActive">Aktivni</Label>
              </div>
            </div>
            <div>
              <Label>Popis</Label>
              <Textarea
                value={drinkForm.description}
                onChange={(e) => setDrinkForm({ ...drinkForm, description: e.target.value })}
                placeholder="Volitelny popis"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDrinkDialogOpen(false)}>
              Zrusit
            </Button>
            <Button
              onClick={handleDrinkSubmit}
              disabled={!drinkForm.name.trim() || createDrinkMutation.isPending || updateDrinkMutation.isPending}
            >
              {editingDrink ? "Ulozit" : "Vytvorit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pairing Create Dialog */}
      <Dialog open={pairingDialogOpen} onOpenChange={setPairingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pridat propojeni jidlo &harr; napoj</DialogTitle>
            <DialogDescription>
              Vyberte jidlo a napoj pro propojeni
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Jidlo</Label>
              <Select
                value={pairingForm.foodId}
                onValueChange={(v) => setPairingForm({ ...pairingForm, foodId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte jidlo" />
                </SelectTrigger>
                <SelectContent>
                  {foods?.map((food) => (
                    <SelectItem key={food.id} value={food.id.toString()}>
                      {food.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Napoj</Label>
              <Select
                value={pairingForm.drinkId}
                onValueChange={(v) => setPairingForm({ ...pairingForm, drinkId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte napoj" />
                </SelectTrigger>
                <SelectContent>
                  {drinks?.filter((d) => d.isActive).map((drink) => (
                    <SelectItem key={drink.id} value={drink.id.toString()}>
                      {drink.name} ({drink.price} Kc)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="pairing-isDefault"
                  checked={pairingForm.isDefault}
                  onCheckedChange={(checked) =>
                    setPairingForm({ ...pairingForm, isDefault: !!checked })
                  }
                />
                <Label htmlFor="pairing-isDefault">Vychozi</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="pairing-isIncludedInPrice"
                  checked={pairingForm.isIncludedInPrice}
                  onCheckedChange={(checked) =>
                    setPairingForm({ ...pairingForm, isIncludedInPrice: !!checked })
                  }
                />
                <Label htmlFor="pairing-isIncludedInPrice">V cene</Label>
              </div>
            </div>
            <div>
              <Label>Priplatek (Kc)</Label>
              <Input
                type="number"
                value={pairingForm.surcharge}
                onChange={(e) => setPairingForm({ ...pairingForm, surcharge: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPairingDialogOpen(false)}>
              Zrusit
            </Button>
            <Button
              onClick={() => createPairingMutation.mutate(pairingForm)}
              disabled={!pairingForm.foodId || !pairingForm.drinkId || createPairingMutation.isPending}
            >
              Vytvorit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
