import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Cashbox, CashMovementItem, CashboxClosureItem, FilteredMovementsResponse, CashboxTransfer, Event, CashboxAuditLogEntry } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/shared/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/shared/components/ui/tabs";
import {
  Plus, Lock, Unlock, TrendingUp, TrendingDown, EyeOff, Eye, Wallet, AlertTriangle,
  Filter, X, ChevronLeft, ChevronRight, ArrowRightLeft, Pencil, Trash2, Download, ClipboardCheck,
} from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import dayjs from "dayjs";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { usePermissions } from "@/modules/auth/hooks/use-permissions";
import { CategoryCombobox } from "@/shared/components/CategoryCombobox";
import { useAllTransfers, useTransferToEvent, useCancelTransfer, useApproveClosureTransfer } from "../hooks/useCashboxTransfers";

interface CashboxFilters {
  dateFrom: string;
  dateTo: string;
  category: string;
  movementType: string;
  currency: string;
}

const emptyFilters: CashboxFilters = {
  dateFrom: "",
  dateTo: "",
  category: "",
  movementType: "",
  currency: "",
};

function invalidateMainCashbox() {
  queryClient.invalidateQueries({ queryKey: ["/api/cashbox/main"] });
  queryClient.invalidateQueries({ queryKey: ["/api/cashbox/main/movements"] });
  queryClient.invalidateQueries({ queryKey: ["/api/cashbox/main/closures"] });
  queryClient.invalidateQueries({ queryKey: ["/api/cashbox"] });
}

export default function CashboxPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [movementType, setMovementType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [actualCash, setActualCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [editingMovement, setEditingMovement] = useState<CashMovementItem | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustBalance, setAdjustBalance] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [cashboxNotes, setCashboxNotes] = useState("");
  const { hasPermission, isSuperAdmin } = usePermissions();

  const { data: allTransfers } = useAllTransfers();
  const cancelTransferMutation = useCancelTransfer();
  const approveClosureMutation = useApproveClosureTransfer();

  const editMovementMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.put(`/api/cashbox/main/movement/${id}`, data),
    onSuccess: () => {
      invalidateMainCashbox();
      setEditingMovement(null);
      successToast("Pohyb upraven");
    },
    onError: (e: Error) => errorToast(e),
  });

  const deleteMovementMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/cashbox/main/movement/${id}`),
    onSuccess: () => {
      invalidateMainCashbox();
      successToast("Pohyb smazán");
    },
    onError: (e: Error) => errorToast(e),
  });

  const adjustBalanceMutation = useMutation({
    mutationFn: (data: { newBalance: number; reason: string }) =>
      api.post('/api/cashbox/main/adjust-balance', data),
    onSuccess: () => {
      invalidateMainCashbox();
      setAdjustOpen(false);
      setAdjustBalance("");
      setAdjustReason("");
      successToast("Zůstatek kasy upraven");
    },
    onError: (e: Error) => errorToast(e),
  });

  const updateNotesMutation = useMutation({
    mutationFn: (data: { notes: string }) =>
      api.put('/api/cashbox/main/info', data),
    onSuccess: () => {
      invalidateMainCashbox();
      setNotesOpen(false);
      successToast("Poznámky uloženy");
    },
    onError: (e: Error) => errorToast(e),
  });

  // Filters
  const [filters, setFilters] = useState<CashboxFilters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const { data: cashbox, isLoading } = useQuery<Cashbox | null>({
    queryKey: ["/api/cashbox/main"],
    queryFn: async () => {
      try {
        return await api.get<Cashbox>("/api/cashbox/main");
      } catch {
        return null;
      }
    },
    retry: false,
  });

  // Filtered movements query
  const { data: movementsData } = useQuery<FilteredMovementsResponse>({
    queryKey: ["/api/cashbox/main/movements", filters, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.category) params.set("category", filters.category);
      if (filters.movementType) params.set("movementType", filters.movementType);
      if (filters.currency) params.set("currency", filters.currency);
      params.set("page", String(page));
      params.set("limit", "50");
      return api.get(`/api/cashbox/main/movements?${params.toString()}`);
    },
    enabled: !!cashbox,
  });

  const { data: closures } = useQuery<CashboxClosureItem[]>({
    queryKey: ["/api/cashbox/main/closures"],
    queryFn: () => api.get<CashboxClosureItem[]>("/api/cashbox/main/closures").catch(() => []),
    retry: false,
    enabled: !!cashbox,
  });

  const { data: auditLogs } = useQuery<CashboxAuditLogEntry[]>({
    queryKey: ["/api/cashbox/main/audit-log"],
    queryFn: () => api.get<CashboxAuditLogEntry[]>("/api/cashbox/main/audit-log"),
    enabled: !!cashbox,
  });

  const { data: hiddenStatus } = useQuery<{ hidden: boolean }>({
    queryKey: ["/api/cashbox/main/hidden-status"],
    queryFn: () => api.get<{ hidden: boolean }>("/api/cashbox/main/hidden-status"),
  });

  const initMutation = useMutation({
    mutationFn: (initialBalance: number) => api.post("/api/cashbox/main", { initialBalance }),
    onSuccess: () => { invalidateMainCashbox(); successToast("Hlavní kasa inicializována"); },
    onError: (e: Error) => errorToast(e),
  });

  const addMovementMutation = useMutation({
    mutationFn: (data: { movementType: string; amount: string; category: string; description: string }) =>
      api.post("/api/cashbox/main/movement", data),
    onSuccess: () => {
      invalidateMainCashbox();
      successToast("Pohyb přidán");
      setAddOpen(false);
      setAmount(""); setDescription(""); setCategory("");
    },
    onError: (e: Error) => errorToast(e),
  });

  const lockMutation = useMutation({
    mutationFn: () => api.post("/api/cashbox/main/lock"),
    onSuccess: () => { invalidateMainCashbox(); successToast("Kasa zamčena"); },
    onError: (e: Error) => errorToast(e),
  });

  const reopenMutation = useMutation({
    mutationFn: () => api.post("/api/cashbox/main/reopen"),
    onSuccess: () => { invalidateMainCashbox(); successToast("Kasa odemčena"); },
    onError: (e: Error) => errorToast(e),
  });

  const closeMutation = useMutation({
    mutationFn: (data: { actualCash: number; notes?: string }) =>
      api.post('/api/cashbox/main/close', data),
    onSuccess: () => {
      invalidateMainCashbox();
      setCloseOpen(false);
      setActualCash("");
      setCloseNotes("");
      successToast("Denní uzávěrka dokončena");
    },
    onError: (e: Error) => errorToast(e),
  });

  const hideMutation = useMutation({
    mutationFn: () => api.post("/api/cashbox/main/hide"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashbox/main/hidden-status"] });
      invalidateMainCashbox();
      successToast("Hlavní kasa skryta");
    },
    onError: (e: Error) => errorToast(e),
  });

  const unhideMutation = useMutation({
    mutationFn: () => api.post("/api/cashbox/main/unhide"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashbox/main/hidden-status"] });
      invalidateMainCashbox();
      successToast("Hlavní kasa odkryta");
    },
    onError: (e: Error) => errorToast(e),
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const clearFilters = () => {
    setFilters(emptyFilters);
    setPage(1);
  };

  const updateFilter = (key: keyof CashboxFilters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Načítání...</div>;
  }

  // Not initialized or hidden
  if (!cashbox) {
    // If hidden, show unhide option for super admin
    if (hiddenStatus?.hidden) {
      return (
        <div className="p-6 space-y-6">
          <PageHeader title="Hlavní kasa" description="Globální pokladna firmy" />
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <EyeOff className="w-5 h-5" />
                Kasa je skrytá
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Hlavní kasa byla nouzově skryta. Pro zobrazení je potřeba ji odkrýt.
              </p>
              {isSuperAdmin && (
                <Button onClick={() => unhideMutation.mutate()} disabled={unhideMutation.isPending}>
                  <Eye className="w-4 h-4 mr-2" /> Odkrýt hlavní kasu
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Hlavní kasa" description="Globální pokladna firmy" />
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Inicializace hlavní kasy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Hlavní kasa ještě nebyla vytvořena. Zadejte počáteční stav.
            </p>
            <div>
              <Label>Počáteční stav (Kč)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button
              onClick={() => initMutation.mutate(parseFloat(amount) || 0)}
              disabled={initMutation.isPending}
            >
              Vytvořit hlavní kasu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentBalance = parseFloat(cashbox.currentBalance);
  const initialBalance = parseFloat(cashbox.initialBalance);
  const allMovements = movementsData?.movements ?? [];
  const totalMovements = movementsData?.total ?? 0;
  const totalPages = movementsData?.totalPages ?? 0;

  // Use backend-computed summary (from ALL movements, not just paginated subset)
  const incomeTotal = parseFloat((cashbox as any).totalIncome ?? "0");
  const expenseTotal = parseFloat((cashbox as any).totalExpense ?? "0");
  const isLocked = !!cashbox.lockedBy;
  const currencyLabel = cashbox.currency || 'Kč';

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Hlavní kasa" description="Globální pokladna firmy">
        <div className="flex items-center gap-2">
          {isLocked ? (
            hasPermission("cashbox.reopen") && (
              <Button variant="outline" onClick={() => reopenMutation.mutate()} disabled={reopenMutation.isPending}>
                <Unlock className="w-4 h-4 mr-2" /> Odemknout
              </Button>
            )
          ) : (
            <Button variant="outline" onClick={() => lockMutation.mutate()} disabled={lockMutation.isPending}>
              <Lock className="w-4 h-4 mr-2" /> Zamknout
            </Button>
          )}
          {isSuperAdmin && (
            hiddenStatus?.hidden ? (
              <Button variant="outline" onClick={() => unhideMutation.mutate()} disabled={unhideMutation.isPending}>
                <Eye className="w-4 h-4 mr-2" /> Odkrýt
              </Button>
            ) : (
              <Button variant="destructive" size="sm" onClick={() => hideMutation.mutate()} disabled={hideMutation.isPending}>
                <EyeOff className="w-4 h-4 mr-2" /> Nouzové skrytí
              </Button>
            )
          )}
          {isSuperAdmin && (
            <Button variant="outline" onClick={() => {
              setAdjustBalance(String(currentBalance));
              setAdjustReason("");
              setAdjustOpen(true);
            }}>
              <Wallet className="w-4 h-4 mr-2" /> Korekce zůstatku
            </Button>
          )}
          <Button variant="outline" onClick={() => {
            setCashboxNotes((cashbox as any).notes || "");
            setNotesOpen(true);
          }}>
            <AlertTriangle className="w-4 h-4 mr-2" /> Poznámky
          </Button>
          <Button variant="outline" onClick={() => {
            const params = new URLSearchParams();
            if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
            if (filters.dateTo) params.set('dateTo', filters.dateTo);
            if (filters.category) params.set('category', filters.category);
            if (filters.movementType) params.set('movementType', filters.movementType);
            window.open(`${import.meta.env.VITE_API_BASE_URL || ''}/api/cashbox/main/export?${params.toString()}`, '_blank');
          }}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          {!isLocked && (
            <>
              <Button variant="outline" onClick={() => setCloseOpen(true)}>
                <ClipboardCheck className="w-4 h-4 mr-2" /> Denní uzávěrka
              </Button>
              <Button variant="outline" onClick={() => setTransferOpen(true)}>
                <ArrowRightLeft className="w-4 h-4 mr-2" /> Převod na event
              </Button>
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Přidat pohyb
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      {isLocked && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-300">Kasa je zamčená — pohyby nelze přidávat.</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Počáteční stav</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{initialBalance.toLocaleString("cs-CZ")} {currencyLabel}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Příjmy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{incomeTotal.toLocaleString("cs-CZ")} {currencyLabel}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Výdaje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{expenseTotal.toLocaleString("cs-CZ")} {currencyLabel}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Zůstatek</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${currentBalance >= 0 ? "text-primary" : "text-red-600"}`}>
              {currentBalance.toLocaleString("cs-CZ")} {currencyLabel}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cashbox notes */}
      {(cashbox as any).notes && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Poznámky k pokladně</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
              setCashboxNotes((cashbox as any).notes || "");
              setNotesOpen(true);
            }}>
              <Pencil className="w-3 h-3 mr-1" /> Upravit
            </Button>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">{(cashbox as any).notes}</p>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filtry
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" /> Vymazat filtry
            </Button>
          )}
          {activeFilterCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {totalMovements} výsledků
            </span>
          )}
        </div>

        {showFilters && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs">Datum od</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter("dateFrom", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Datum do</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter("dateTo", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Typ pohybu</Label>
                  <Select value={filters.movementType || "ALL"} onValueChange={(v) => updateFilter("movementType", v === "ALL" ? "" : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Vše</SelectItem>
                      <SelectItem value="INCOME">Příjem</SelectItem>
                      <SelectItem value="EXPENSE">Výdaj</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Kategorie</Label>
                  <CategoryCombobox
                    value={filters.category}
                    onChange={(v) => updateFilter("category", v)}
                    type={filters.movementType === "INCOME" ? "INCOME" : "EXPENSE"}
                    placeholder="Vše"
                  />
                </div>
                <div>
                  <Label className="text-xs">Měna</Label>
                  <Select value={filters.currency || "ALL"} onValueChange={(v) => updateFilter("currency", v === "ALL" ? "" : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Vše</SelectItem>
                      <SelectItem value="CZK">CZK</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.dateFrom && (
              <Badge variant="outline" className="gap-1">
                Od: {filters.dateFrom}
                <button type="button" onClick={() => updateFilter("dateFrom", "")}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filters.dateTo && (
              <Badge variant="outline" className="gap-1">
                Do: {filters.dateTo}
                <button type="button" onClick={() => updateFilter("dateTo", "")}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filters.movementType && (
              <Badge variant="outline" className="gap-1">
                {filters.movementType === "INCOME" ? "Příjem" : "Výdaj"}
                <button type="button" onClick={() => updateFilter("movementType", "")}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filters.category && (
              <Badge variant="outline" className="gap-1">
                {filters.category}
                <button type="button" onClick={() => updateFilter("category", "")}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {filters.currency && (
              <Badge variant="outline" className="gap-1">
                {filters.currency}
                <button type="button" onClick={() => updateFilter("currency", "")}><X className="w-3 h-3" /></button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="movements">
        <TabsList>
          <TabsTrigger value="movements">
            <Wallet className="w-4 h-4 mr-1" /> Pohyby ({totalMovements})
          </TabsTrigger>
          <TabsTrigger value="transfers">
            <ArrowRightLeft className="w-4 h-4 mr-1" /> Převody na eventy ({allTransfers?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="closures">
            Historie uzávěrek ({closures?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="audit">
            Audit log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="movements">
          <MovementTable
            movements={allMovements}
            onEdit={(m) => {
              setEditingMovement(m);
              setEditAmount(m.amount);
              setEditCategory(m.category || "");
              setEditDescription(m.description || "");
            }}
            onDelete={(id) => {
              if (confirm("Opravdu smazat tento pohyb? Změna se projeví v zůstatku.")) {
                deleteMovementMutation.mutate(id);
              }
            }}
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Strana {page} z {totalPages} ({totalMovements} celkem)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transfers">
          {allTransfers && allTransfers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead>Vytvořil</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTransfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{dayjs(t.initiatedAt).format("DD.MM.YYYY HH:mm")}</TableCell>
                    <TableCell className="font-medium">{t.eventName}</TableCell>
                    <TableCell className="text-right font-medium">
                      {parseFloat(t.amount).toLocaleString("cs-CZ")} {t.currency}
                    </TableCell>
                    <TableCell>
                      <TransferStatusBadge status={t.status} />
                    </TableCell>
                    <TableCell>{t.initiatedByName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{t.description || "-"}</TableCell>
                    <TableCell>
                      {t.status === 'PENDING' && (
                        <div className="flex items-center gap-1">
                          {isSuperAdmin && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Schválit převod ${parseFloat(t.amount).toLocaleString("cs-CZ")} ${t.currency} z eventu "${t.eventName}" do hlavní kasy?`)) {
                                  approveClosureMutation.mutate(t.id);
                                }
                              }}
                              disabled={approveClosureMutation.isPending}
                            >
                              Schválit
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm("Opravdu zrušit tento převod?")) {
                                cancelTransferMutation.mutate(t.id, {
                                  onSuccess: () => successToast("Převod zrušen"),
                                  onError: (e: Error) => errorToast(e),
                                });
                              }
                            }}
                            disabled={cancelTransferMutation.isPending}
                          >
                            Zrušit
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Žádné převody na eventy</div>
          )}
        </TabsContent>

        <TabsContent value="closures">
          {closures && closures.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Očekáváno</TableHead>
                  <TableHead className="text-right">Skutečnost</TableHead>
                  <TableHead className="text-right">Rozdíl</TableHead>
                  <TableHead>Poznámky</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closures.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{dayjs(c.closedAt).format("DD.MM.YYYY HH:mm")}</TableCell>
                    <TableCell className="text-right">{parseFloat(c.expectedCash).toLocaleString("cs-CZ")} {currencyLabel}</TableCell>
                    <TableCell className="text-right">{parseFloat(c.actualCash).toLocaleString("cs-CZ")} {currencyLabel}</TableCell>
                    <TableCell className={`text-right font-medium ${parseFloat(c.difference) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {parseFloat(c.difference) >= 0 ? "+" : ""}{parseFloat(c.difference).toLocaleString("cs-CZ")} {currencyLabel}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{c.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Žádné uzávěrky</div>
          )}
        </TabsContent>

        <TabsContent value="audit">
          {auditLogs && auditLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Uživatel</TableHead>
                  <TableHead>Akce</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{dayjs(log.createdAt).format("DD.MM.YYYY HH:mm:ss")}</TableCell>
                    <TableCell className="text-sm">{log.userName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md truncate">{log.description || "-"}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{log.ipAddress || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Žádné záznamy v audit logu</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Transfer to Event Dialog */}
      <TransferToEventDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />

      {/* Add Movement Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Přidat pohyb</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Typ</Label>
                <Select value={movementType} onValueChange={(v) => setMovementType(v as "INCOME" | "EXPENSE")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Příjem</SelectItem>
                    <SelectItem value="EXPENSE">Výdaj</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kategorie</Label>
                <CategoryCombobox
                  value={category}
                  onChange={setCategory}
                  type={movementType}
                  placeholder="Vyberte nebo napište..."
                />
              </div>
            </div>
            <div>
              <Label>Částka (Kč)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
              />
            </div>
            <div>
              <Label>Popis</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Popis pohybu"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Zrušit</Button>
            <Button
              onClick={() => {
                if (!amount || parseFloat(amount) <= 0) return;
                addMovementMutation.mutate({
                  movementType,
                  amount,
                  category,
                  description,
                });
              }}
              disabled={addMovementMutation.isPending}
            >
              {addMovementMutation.isPending ? "Ukládání..." : "Přidat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Movement Dialog */}
      <Dialog open={!!editingMovement} onOpenChange={(open) => { if (!open) setEditingMovement(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit pohyb</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Částka (Kč)</Label>
              <Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
            </div>
            <div>
              <Label>Kategorie</Label>
              <CategoryCombobox
                value={editCategory}
                onChange={setEditCategory}
                type={editingMovement?.movementType === "INCOME" ? "INCOME" : "EXPENSE"}
                placeholder="Vyberte nebo napište..."
              />
            </div>
            <div>
              <Label>Popis</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMovement(null)}>Zrušit</Button>
            <Button
              onClick={() => {
                if (editingMovement) {
                  editMovementMutation.mutate({
                    id: editingMovement.id,
                    data: { amount: editAmount, category: editCategory, description: editDescription },
                  });
                }
              }}
              disabled={editMovementMutation.isPending}
            >
              {editMovementMutation.isPending ? "Ukládám..." : "Uložit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Adjustment Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Korekce zůstatku kasy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Aktuální zůstatek v systému</span>
              <span className="text-lg font-bold">{currentBalance.toLocaleString("cs-CZ")} {currencyLabel}</span>
            </div>
            <div>
              <Label>Skutečný zůstatek ({currencyLabel})</Label>
              <Input
                type="number"
                step="0.01"
                value={adjustBalance}
                onChange={(e) => setAdjustBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {adjustBalance && parseFloat(adjustBalance) !== currentBalance && (
              <div className="flex justify-between items-center p-3 rounded-lg border">
                <span className="text-sm text-muted-foreground">Korekce</span>
                {(() => {
                  const diff = parseFloat(adjustBalance) - currentBalance;
                  return (
                    <span className={`text-lg font-bold ${diff > 0 ? "text-green-600" : "text-red-600"}`}>
                      {diff >= 0 ? "+" : ""}{diff.toLocaleString("cs-CZ")} {currencyLabel}
                    </span>
                  );
                })()}
              </div>
            )}
            <div>
              <Label>Důvod korekce (povinné)</Label>
              <Textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Např.: Inventura hotovosti, opraven chybný zápis, ..."
                className="min-h-[80px]"
              />
            </div>
            <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950 p-3 rounded border border-amber-200 dark:border-amber-800">
              Korekce vytvoří vyrovnávací pohyb (příjem nebo výdaj) s kategorií KOREKCE.
              Vše se zaloguje do audit logu včetně důvodu a původního zůstatku.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Zrušit</Button>
            <Button
              onClick={() => {
                if (!adjustBalance || !adjustReason.trim()) return;
                adjustBalanceMutation.mutate({
                  newBalance: parseFloat(adjustBalance),
                  reason: adjustReason.trim(),
                });
              }}
              disabled={adjustBalanceMutation.isPending || !adjustBalance || !adjustReason.trim() || parseFloat(adjustBalance) === currentBalance}
            >
              {adjustBalanceMutation.isPending ? "Ukládám..." : "Provést korekci"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Poznámky k pokladně</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={cashboxNotes}
              onChange={(e) => setCashboxNotes(e.target.value)}
              placeholder="Poznámky pro účetní, interní informace k pokladně..."
              className="min-h-[150px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesOpen(false)}>Zrušit</Button>
            <Button
              onClick={() => updateNotesMutation.mutate({ notes: cashboxNotes })}
              disabled={updateNotesMutation.isPending}
            >
              {updateNotesMutation.isPending ? "Ukládám..." : "Uložit poznámky"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Close / Reconciliation Dialog */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Denní uzávěrka</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Očekávaný zůstatek</span>
              <span className="text-lg font-bold">{currentBalance.toLocaleString("cs-CZ")} Kč</span>
            </div>
            <div>
              <Label>Skutečně napočítaná hotovost (Kč)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {actualCash && (
              <div className="flex justify-between items-center p-3 rounded-lg border">
                <span className="text-sm text-muted-foreground">Rozdíl</span>
                {(() => {
                  const diff = parseFloat(actualCash) - currentBalance;
                  return (
                    <span className={`text-lg font-bold ${diff === 0 ? "text-green-600" : diff > 0 ? "text-blue-600" : "text-red-600"}`}>
                      {diff >= 0 ? "+" : ""}{diff.toLocaleString("cs-CZ")} Kč
                    </span>
                  );
                })()}
              </div>
            )}
            <div>
              <Label>Poznámky (volitelné)</Label>
              <Textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Denní uzávěrka"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Zrušit</Button>
            <Button
              onClick={() => {
                if (!actualCash || parseFloat(actualCash) < 0) return;
                closeMutation.mutate({
                  actualCash: parseFloat(actualCash),
                  notes: closeNotes || undefined,
                });
              }}
              disabled={closeMutation.isPending || !actualCash}
            >
              {closeMutation.isPending ? "Uzavírám..." : "Potvrdit uzávěrku"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MovementTable({ movements, onEdit, onDelete }: { movements: CashMovementItem[]; onEdit: (m: CashMovementItem) => void; onDelete: (id: number) => void }) {
  if (movements.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">Žádné pohyby</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead>Typ</TableHead>
          <TableHead>Kategorie</TableHead>
          <TableHead className="text-right">Částka</TableHead>
          <TableHead>Popis</TableHead>
          <TableHead className="text-right">Akce</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((m) => (
          <TableRow key={m.id}>
            <TableCell>{dayjs(m.createdAt).format("DD.MM.YYYY HH:mm")}</TableCell>
            <TableCell>
              <Badge variant={m.movementType === "INCOME" ? "default" : "destructive"}>
                {m.movementType === "INCOME" ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {m.movementType === "INCOME" ? "Příjem" : "Výdaj"}
              </Badge>
            </TableCell>
            <TableCell>{m.category || "-"}</TableCell>
            <TableCell className="text-right font-medium">
              <span className={m.movementType === "INCOME" ? "text-green-600" : "text-red-600"}>
                {m.movementType === "INCOME" ? "+" : "-"}{parseFloat(m.amount).toLocaleString("cs-CZ")} {m.currency || 'Kč'}
              </span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{m.description || "-"}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(m)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(m.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TransferStatusBadge({ status }: { status: CashboxTransfer["status"] }) {
  switch (status) {
    case "PENDING":
      return <Badge variant="outline" className="text-amber-600 border-amber-300">Čekající</Badge>;
    case "CONFIRMED":
      return <Badge variant="outline" className="text-green-600 border-green-300">Potvrzený</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">Odmítnutý</Badge>;
    case "CANCELLED":
      return <Badge variant="outline" className="text-gray-500 border-gray-300">Zrušeno</Badge>;
  }
}

function TransferToEventDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [eventId, setEventId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    queryFn: () => api.get<Event[]>("/api/events"),
    enabled: open,
  });

  const upcomingEvents = (events || []).filter(e =>
    dayjs(e.eventDate).isAfter(dayjs().subtract(1, 'day')) &&
    e.status !== 'CANCELLED'
  );

  const transferMutation = useTransferToEvent();

  const handleSubmit = () => {
    if (!eventId || !amount || parseFloat(amount) <= 0) return;
    transferMutation.mutate(
      {
        eventId: parseInt(eventId),
        amount: parseFloat(amount),
        description: description || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setEventId("");
          setAmount("");
          setDescription("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Převod na event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte event" />
              </SelectTrigger>
              <SelectContent>
                {upcomingEvents.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name} — {dayjs(e.eventDate).format("DD.MM.YYYY")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Částka (Kč)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50000"
            />
          </div>
          <div>
            <Label>Popis (volitelné)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Popis převodu"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!eventId || !amount || parseFloat(amount) <= 0 || transferMutation.isPending}
          >
            {transferMutation.isPending ? "Převádím..." : "Převést"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
