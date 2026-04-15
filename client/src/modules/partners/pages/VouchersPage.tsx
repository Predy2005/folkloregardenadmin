import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import type { Voucher, Partner } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { useAuth } from "@/modules/auth/contexts/AuthContext";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
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
import { Plus, Ticket } from "lucide-react";
import { SearchInput } from "@/shared/components";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import dayjs from "dayjs";
import { useFormDialog } from "@/shared/hooks/useFormDialog";
import { useCrudMutations } from "@/shared/hooks/useCrudMutations";
import { VouchersTable } from "../components/VouchersTable";
import { VoucherDialog } from "../components/VoucherDialog";
import { RedemptionsSection } from "../components/RedemptionsSection";

const voucherSchema = z.object({
  code: z.string().min(3, "Kód musí mít alespoň 3 znaky"),
  discountPercent: z.number().min(0).max(100, "Sleva musí být 0-100%"),
  validFrom: z.string().min(1, "Zadejte datum začátku platnosti"),
  validTo: z.string().min(1, "Zadejte datum konce platnosti"),
  usageLimit: z.number().optional(),
  partnerId: z.number().optional(),
  active: z.boolean().default(true),
});

type VoucherForm = z.infer<typeof voucherSchema>;

export default function Vouchers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [partnerFilter, setPartnerFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  const { isSuperAdmin } = useAuth();
  const dialog = useFormDialog<Voucher>();

  const { data: vouchers, isLoading } = useQuery<Voucher[]>({
    queryKey: ["/api/vouchers"],
  });

  const { data: partners } = useQuery<Partner[]>({
    queryKey: ["/api/partner"],
    queryFn: () => api.get<Partner[]>("/api/partner"),
  });

  const form = useForm<VoucherForm>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      code: "",
      discountPercent: 10,
      validFrom: dayjs().format("YYYY-MM-DD"),
      validTo: dayjs().add(1, "month").format("YYYY-MM-DD"),
      active: true,
    },
  });

  const { createMutation, updateMutation, deleteMutation, isPending } = useCrudMutations<VoucherForm>({
    endpoint: "/api/vouchers",
    queryKey: ["/api/vouchers"],
    entityName: "Voucher",
    onCreateSuccess: () => { dialog.close(); form.reset(); },
    onUpdateSuccess: () => dialog.close(),
    onDeleteSuccess: () => dialog.close(),
  });

  const getVoucherStatus = (voucher: Voucher) => {
    if (!voucher.active) return { label: "Neaktivní", variant: "secondary" as const, key: "inactive" };
    const now = dayjs();
    const validTo = dayjs(voucher.validTo);
    if (validTo.isBefore(now)) return { label: "Vypršel", variant: "destructive" as const, key: "expired" };
    return { label: "Aktivní", variant: "default" as const, key: "active" };
  };

  const filteredVouchers = useMemo(() => {
    return vouchers?.filter((voucher) => {
      const matchesSearch = voucher.code.toLowerCase().includes(search.toLowerCase());
      const status = getVoucherStatus(voucher);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && status.key === "active") ||
        (statusFilter === "inactive" && status.key === "inactive") ||
        (statusFilter === "expired" && status.key === "expired");
      const matchesPartner =
        partnerFilter === "all" ||
        (partnerFilter === "none" && !voucher.partnerId) ||
        (voucher.partnerId && String(voucher.partnerId) === partnerFilter);
      return matchesSearch && matchesStatus && matchesPartner;
    });
  }, [vouchers, search, statusFilter, partnerFilter]);

  const handleEdit = (voucher: Voucher) => {
    dialog.openEdit(voucher);
    form.reset({
      code: voucher.code,
      discountPercent: voucher.discountPercent,
      validFrom: dayjs(voucher.validFrom).format("YYYY-MM-DD"),
      validTo: dayjs(voucher.validTo).format("YYYY-MM-DD"),
      usageLimit: voucher.usageLimit,
      partnerId: voucher.partnerId,
      active: voucher.active,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tento voucher?")) {
      deleteMutation.mutate(id);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    const allIds = (filteredVouchers || []).map(v => v.id);
    if (allIds.every(id => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };
  const clearSelection = () => setSelectedIds(new Set());

  const bulkMutation = useMutation({
    mutationFn: async (data: { ids: number[]; action: string }) => {
      return await api.post('/api/vouchers/bulk', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers"] });
      setBulkActionOpen(false);
      clearSelection();
      successToast(`Hromadná akce provedena`);
    },
    onError: (error: Error) => errorToast(error),
  });

  const executeBulkAction = () => {
    const ids = Array.from(selectedIds);
    if (bulkActionType === 'delete') {
      bulkMutation.mutate({ ids, action: 'delete' });
    } else if (bulkActionType === 'activate') {
      bulkMutation.mutate({ ids, action: 'activate' });
    } else if (bulkActionType === 'deactivate') {
      bulkMutation.mutate({ ids, action: 'deactivate' });
    }
  };

  const handleFormSubmit = (data: VoucherForm) => {
    if (dialog.isEditing && dialog.editingItem) {
      updateMutation.mutate({ id: dialog.editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Vouchery" description="Správa slevových kódů a QR voucherů">
        <Button
          onClick={() => { dialog.openCreate(); form.reset(); }}
          className="bg-primary hover:bg-primary/90"
          data-testid="button-create-voucher"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nový voucher
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                Vouchery
              </CardTitle>
              <CardDescription>
                Celkem: {vouchers?.length || 0} voucherů
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Hledat voucher..."
                className="w-64"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Všechny" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny</SelectItem>
                  <SelectItem value="active">Aktivní</SelectItem>
                  <SelectItem value="inactive">Neaktivní</SelectItem>
                  <SelectItem value="expired">Vypršelé</SelectItem>
                </SelectContent>
              </Select>
              <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Všichni partneři" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všichni partneři</SelectItem>
                  <SelectItem value="none">Bez partnera</SelectItem>
                  {partners?.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id.toString()}>
                      {partner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {isSuperAdmin && selectedIds.size > 0 && (
            <div className="flex items-center gap-2 p-3 mt-4 bg-primary/5 border rounded-lg">
              <Badge variant="secondary">{selectedIds.size} vybráno</Badge>
              <Button size="sm" variant="outline" onClick={() => { setBulkActionType('activate'); setBulkActionOpen(true); }}>
                Aktivovat
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setBulkActionType('deactivate'); setBulkActionOpen(true); }}>
                Deaktivovat
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { setBulkActionType('delete'); setBulkActionOpen(true); }}>
                Smazat
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                Zrušit výběr
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <VouchersTable
            vouchers={filteredVouchers}
            isLoading={isLoading}
            isSuperAdmin={isSuperAdmin}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getVoucherStatus={getVoucherStatus}
            hasFilters={search !== "" || statusFilter !== "all" || partnerFilter !== "all"}
          />
        </CardContent>
      </Card>

      <RedemptionsSection
        isOpen={bulkActionOpen}
        onOpenChange={setBulkActionOpen}
        bulkActionType={bulkActionType}
        selectedCount={selectedIds.size}
        isPending={bulkMutation.isPending}
        onExecute={executeBulkAction}
      />

      <VoucherDialog
        isOpen={dialog.isOpen}
        isEditing={dialog.isEditing}
        editingItemId={dialog.editingItem?.id}
        onClose={dialog.close}
        form={form}
        partners={partners}
        isPending={isPending}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
