import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateInvoiceQueries } from "@/shared/lib/query-helpers";
import { usePagination } from "@/shared/hooks/usePagination";
import { useBulkSelection } from "@/shared/hooks/useBulkSelection";
import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import type { Invoice } from "@shared/types";
import { PageHeader } from "@/shared/components/PageHeader";
import { useAuth } from "@/modules/auth/contexts/AuthContext";
import { InvoiceSummaryCards } from "../components/InvoiceSummaryCards";
import { InvoiceFilters } from "../components/InvoiceFilters";
import { InvoicesTable } from "../components/InvoicesTable";
import { InvoiceDetailModal } from "../components/InvoiceDetailModal";
import { InvoiceBulkActionBar, InvoiceBulkDialog } from "../components/InvoiceBulkActions";

export default function Invoices() {
  const [, navigate] = useLocation();
  const { isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'status' | 'delete' | null>(null);
  const [bulkStatus, setBulkStatus] = useState("");

  // Fetch invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["/api/invoices"],
    queryFn: () => api.get<Invoice[]>("/api/invoices"),
  });

  // Status mutations
  const sendMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/invoices/${id}/send`),
    onSuccess: () => {
      invalidateInvoiceQueries();
      successToast("Faktura byla označena jako odeslaná");
    },
    onError: (error: Error) => errorToast(error),
  });

  const payMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/invoices/${id}/pay`),
    onSuccess: () => {
      invalidateInvoiceQueries();
      successToast("Faktura byla označena jako zaplacená");
    },
    onError: (error: Error) => errorToast(error),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/invoices/${id}/cancel`),
    onSuccess: () => {
      invalidateInvoiceQueries();
      successToast("Faktura byla stornována");
    },
    onError: (error: Error) => errorToast(error),
  });

  // Bulk mutations
  const bulkUpdateMutation = useMutation({
    mutationFn: (data: { ids: number[]; updates: Record<string, string | boolean> }) =>
      api.put('/api/invoices/bulk-update', data),
    onSuccess: (data: { count: number }) => {
      invalidateInvoiceQueries();
      setBulkActionOpen(false);
      clearSelection();
      successToast(`Aktualizováno ${data.count} faktur`);
    },
    onError: (error: Error) => errorToast(error),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) =>
      api.delete('/api/invoices/bulk-delete', { data: { ids } }),
    onSuccess: (data: { count: number }) => {
      invalidateInvoiceQueries();
      setBulkActionOpen(false);
      clearSelection();
      successToast(`Smazáno ${data.count} faktur`);
    },
    onError: (error: Error) => errorToast(error),
  });

  // Credit note mutation
  const createCreditNoteMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/invoices/${id}/credit-note`),
    onSuccess: () => {
      invalidateInvoiceQueries();
      successToast("Dobropis vytvořen");
    },
    onError: (error: Error) => errorToast(error),
  });

  // PDF export
  const handleExportPdf = async (invoiceId: number, invoiceNumber: string) => {
    try {
      const response = await api.get(`/api/invoices/${invoiceId}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faktura-${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      errorToast('Chyba při stahování PDF');
    }
  };

  const handleBulkExportPdf = async () => {
    const ids = Array.from(selectedIds);
    try {
      const response = await api.post('/api/invoices/bulk-pdf', { ids }, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'faktury-export.zip';
      a.click();
      URL.revokeObjectURL(url);
      successToast(`Exportováno ${ids.length} faktur`);
    } catch {
      errorToast('Chyba při exportu faktur');
    }
  };

  // Filter invoices
  const filtered = useMemo(() => {
    return (invoices || []).filter((invoice) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(search) ||
        invoice.customer.name.toLowerCase().includes(search) ||
        (invoice.customer.company?.toLowerCase().includes(search) ?? false) ||
        (invoice.customer.ico?.toLowerCase().includes(search) ?? false) ||
        (invoice.variableSymbol?.toLowerCase().includes(search) ?? false);

      if (!matchesSearch) return false;

      if (statusFilter !== "all" && invoice.status !== statusFilter) return false;
      if (typeFilter !== "all" && invoice.invoiceType !== typeFilter) return false;

      if (dateFrom) {
        const invoiceDate = dayjs(invoice.issueDate);
        if (invoiceDate.isBefore(dayjs(dateFrom), "day")) return false;
      }
      if (dateTo) {
        const invoiceDate = dayjs(invoice.issueDate);
        if (invoiceDate.isAfter(dayjs(dateTo), "day")) return false;
      }

      if (amountMin) {
        const min = parseFloat(amountMin);
        if (!isNaN(min) && parseFloat(invoice.total) < min) return false;
      }
      if (amountMax) {
        const max = parseFloat(amountMax);
        if (!isNaN(max) && parseFloat(invoice.total) > max) return false;
      }

      return true;
    });
  }, [invoices, searchTerm, statusFilter, typeFilter, dateFrom, dateTo, amountMin, amountMax]);

  // Pagination
  const { page, pageSize, setPage, setPageSize, paginatedData, totalPages, totalItems } = usePagination(filtered);

  // Selection
  const { selectedIds, toggleSelect, toggleSelectAll, clearSelection } = useBulkSelection({
    items: paginatedData,
    getId: (i) => i.id,
  });

  const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all" || !!dateFrom || !!dateTo || !!amountMin || !!amountMax;

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setSearchTerm("");
    setPage(1);
  };

  const handleBulkConfirm = () => {
    const ids = Array.from(selectedIds);
    if (bulkActionType === 'delete') {
      bulkDeleteMutation.mutate(ids);
    } else if (bulkActionType === 'status' && bulkStatus) {
      bulkUpdateMutation.mutate({ ids, updates: { status: bulkStatus } });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Faktury" description="Správa a přehled vystavených faktur">
        <Button
          onClick={() => navigate("/invoices/new")}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nová faktura
        </Button>
      </PageHeader>

      {invoices && invoices.length > 0 && (
        <InvoiceSummaryCards invoices={invoices} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Seznam faktur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceFilters
            searchTerm={searchTerm}
            onSearchChange={(v) => { setSearchTerm(v); setPage(1); }}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            statusFilter={statusFilter}
            onStatusFilterChange={(v) => { setStatusFilter(v); setPage(1); }}
            typeFilter={typeFilter}
            onTypeFilterChange={(v) => { setTypeFilter(v); setPage(1); }}
            dateFrom={dateFrom}
            onDateFromChange={(v) => { setDateFrom(v); setPage(1); }}
            dateTo={dateTo}
            onDateToChange={(v) => { setDateTo(v); setPage(1); }}
            amountMin={amountMin}
            onAmountMinChange={(v) => { setAmountMin(v); setPage(1); }}
            amountMax={amountMax}
            onAmountMaxChange={(v) => { setAmountMax(v); setPage(1); }}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />

          {isSuperAdmin && selectedIds.size > 0 && (
            <InvoiceBulkActionBar
              selectedCount={selectedIds.size}
              onChangeStatus={() => { setBulkActionType('status'); setBulkStatus(''); setBulkActionOpen(true); }}
              onExportPdf={handleBulkExportPdf}
              onDelete={() => { setBulkActionType('delete'); setBulkActionOpen(true); }}
              onClearSelection={clearSelection}
            />
          )}

          <InvoicesTable
            paginatedData={paginatedData}
            isLoading={isLoading}
            isSuperAdmin={isSuperAdmin}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onViewDetail={setSelectedInvoice}
            onExportPdf={handleExportPdf}
            onNavigateEdit={(id) => navigate(`/invoices/${id}/edit`)}
            onSend={(id) => sendMutation.mutate(id)}
            sendPending={sendMutation.isPending}
            onPay={(id) => payMutation.mutate(id)}
            payPending={payMutation.isPending}
            onCancel={(id) => cancelMutation.mutate(id)}
            cancelPending={cancelMutation.isPending}
            onCreateCreditNote={(id) => createCreditNoteMutation.mutate(id)}
            creditNotePending={createCreditNoteMutation.isPending}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

      <InvoiceBulkDialog
        open={bulkActionOpen}
        onOpenChange={(open) => { setBulkActionOpen(open); if (!open) setBulkStatus(''); }}
        actionType={bulkActionType}
        selectedCount={selectedIds.size}
        bulkStatus={bulkStatus}
        onBulkStatusChange={setBulkStatus}
        onConfirm={handleBulkConfirm}
        isPending={bulkUpdateMutation.isPending || bulkDeleteMutation.isPending}
      />
    </div>
  );
}
