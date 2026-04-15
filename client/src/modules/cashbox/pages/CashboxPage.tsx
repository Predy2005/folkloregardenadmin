import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Cashbox, CashMovementItem, CashboxClosureItem, FilteredMovementsResponse, CashboxAuditLogEntry } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/shared/components/ui/tabs";
import {
  Plus, Lock, Unlock, EyeOff, Eye, Wallet, AlertTriangle,
  ArrowRightLeft, Download, ClipboardCheck, Pencil,
} from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { api } from "@/shared/lib/api";
import { getCurrencySymbol } from "@/shared/lib/formatting";
import { invalidateCashboxQueries } from "@/shared/lib/query-helpers";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { usePermissions } from "@/modules/auth/hooks/use-permissions";
import { useAllTransfers } from "../hooks/useCashboxTransfers";

import { CashboxSummaryCards } from "../components/CashboxSummaryCards";
import { CashboxInitForm } from "../components/CashboxInitForm";
import { CashboxFilters, emptyFilters } from "../components/CashboxFilters";
import type { CashboxFiltersState } from "../components/CashboxFilters";
import { MovementsTab } from "../components/MovementsTab";
import { TransfersTab } from "../components/TransfersTab";
import { ClosuresTab } from "../components/ClosuresTab";
import { AuditLogTab } from "../components/AuditLogTab";
import { AddMovementDialog } from "../dialogs/AddMovementDialog";
import { EditMovementDialog } from "../dialogs/EditMovementDialog";
import { AdjustBalanceDialog } from "../dialogs/AdjustBalanceDialog";
import { DailyCloseDialog } from "../dialogs/DailyCloseDialog";
import { TransferToEventDialog } from "../dialogs/TransferToEventDialog";
import { NotesDialog } from "../dialogs/NotesDialog";


export default function CashboxPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<CashMovementItem | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const { hasPermission, isSuperAdmin } = usePermissions();

  const { data: allTransfers } = useAllTransfers();

  const deleteMovementMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/cashbox/main/movement/${id}`),
    onSuccess: () => {
      invalidateCashboxQueries();
      successToast("Pohyb smazán");
    },
    onError: (e: Error) => errorToast(e),
  });

  // Filters
  const [filters, setFilters] = useState<CashboxFiltersState>(emptyFilters);
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

  const lockMutation = useMutation({
    mutationFn: () => api.post("/api/cashbox/main/lock"),
    onSuccess: () => { invalidateCashboxQueries(); successToast("Kasa zamčena"); },
    onError: (e: Error) => errorToast(e),
  });

  const reopenMutation = useMutation({
    mutationFn: () => api.post("/api/cashbox/main/reopen"),
    onSuccess: () => { invalidateCashboxQueries(); successToast("Kasa odemčena"); },
    onError: (e: Error) => errorToast(e),
  });

  const hideMutation = useMutation({
    mutationFn: () => api.post("/api/cashbox/main/hide"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashbox/main/hidden-status"] });
      invalidateCashboxQueries();
      successToast("Hlavní kasa skryta");
    },
    onError: (e: Error) => errorToast(e),
  });

  const unhideMutation = useMutation({
    mutationFn: () => api.post("/api/cashbox/main/unhide"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashbox/main/hidden-status"] });
      invalidateCashboxQueries();
      successToast("Hlavní kasa odkryta");
    },
    onError: (e: Error) => errorToast(e),
  });

  const updateFilter = (key: keyof CashboxFiltersState, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setPage(1);
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Načítání...</div>;
  }

  // Not initialized or hidden
  if (!cashbox) {
    return <CashboxInitForm isHidden={!!hiddenStatus?.hidden} isSuperAdmin={isSuperAdmin} />;
  }

  const currentBalance = parseFloat(cashbox.currentBalance);
  const initialBalance = parseFloat(cashbox.initialBalance);
  const allMovements = movementsData?.movements ?? [];
  const totalMovements = movementsData?.total ?? 0;
  const totalPages = movementsData?.totalPages ?? 0;

  // Use backend-computed summary (from ALL movements, not just paginated subset)
  const incomeTotal = parseFloat(cashbox.totalIncome ?? "0");
  const expenseTotal = parseFloat(cashbox.totalExpense ?? "0");
  const isLocked = !!cashbox.lockedBy;
  const currencyLabel = getCurrencySymbol(cashbox.currency || 'CZK');

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
            <Button variant="outline" onClick={() => setAdjustOpen(true)}>
              <Wallet className="w-4 h-4 mr-2" /> Korekce zůstatku
            </Button>
          )}
          <Button variant="outline" onClick={() => setNotesOpen(true)}>
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

      <CashboxSummaryCards
        initialBalance={initialBalance}
        incomeTotal={incomeTotal}
        expenseTotal={expenseTotal}
        currentBalance={currentBalance}
        currencyLabel={currencyLabel}
      />

      {/* Cashbox notes */}
      {cashbox.notes && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Poznámky k pokladně</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setNotesOpen(true)}>
              <Pencil className="w-3 h-3 mr-1" /> Upravit
            </Button>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">{cashbox.notes}</p>
        </div>
      )}

      <CashboxFilters
        filters={filters}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onUpdateFilter={updateFilter}
        onClearFilters={clearFilters}
        totalMovements={totalMovements}
      />

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
          <MovementsTab
            movements={allMovements}
            page={page}
            totalPages={totalPages}
            totalMovements={totalMovements}
            onPageChange={setPage}
            onEdit={(m) => setEditingMovement(m)}
            onDelete={(id) => {
              if (confirm("Opravdu smazat tento pohyb? Změna se projeví v zůstatku.")) {
                deleteMovementMutation.mutate(id);
              }
            }}
          />
        </TabsContent>

        <TabsContent value="transfers">
          <TransfersTab isSuperAdmin={isSuperAdmin} />
        </TabsContent>

        <TabsContent value="closures">
          <ClosuresTab closures={closures ?? []} currencyLabel={currencyLabel} />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTab auditLogs={auditLogs ?? []} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TransferToEventDialog open={transferOpen} onOpenChange={setTransferOpen} />
      <AddMovementDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditMovementDialog movement={editingMovement} onClose={() => setEditingMovement(null)} />
      <AdjustBalanceDialog open={adjustOpen} onOpenChange={setAdjustOpen} currentBalance={currentBalance} currencyLabel={currencyLabel} />
      <DailyCloseDialog open={closeOpen} onOpenChange={setCloseOpen} currentBalance={currentBalance} currency={cashbox.currency || 'CZK'} />
      <NotesDialog open={notesOpen} onOpenChange={setNotesOpen} initialNotes={cashbox.notes || ""} />
    </div>
  );
}
