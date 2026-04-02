import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateInvoiceQueries } from "@/shared/lib/query-helpers";
import { usePagination } from "@/shared/hooks/usePagination";
import { PAGE_SIZE_OPTIONS } from "@/shared/lib/constants";
import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Separator } from "@/shared/components/ui/separator";
import {
  Search,
  Eye,
  Send,
  Check,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  QrCode,
  FileText,
  Loader2,
  Plus,
  Pencil,
  Download,
  Trash2,
  FileX,
} from "lucide-react";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import type { Invoice, InvoiceStatus, InvoiceType } from "@shared/types";
import { INVOICE_TYPE_LABELS } from "@shared/types";
import { PageHeader } from "@/shared/components/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { useAuth } from "@/modules/auth/contexts/AuthContext";

const STATUS_OPTIONS = [
  { value: "all", label: "Všechny statusy" },
  { value: "DRAFT", label: "Koncept" },
  { value: "SENT", label: "Odesláno" },
  { value: "PAID", label: "Zaplaceno" },
  { value: "CANCELLED", label: "Stornováno" },
] as const;

const TYPE_OPTIONS = [
  { value: "all", label: "Všechny typy" },
  { value: "DEPOSIT", label: "Zálohové faktury" },
  { value: "FINAL", label: "Ostré faktury" },
  { value: "PARTIAL", label: "Částečné faktury" },
  { value: "CREDIT_NOTE", label: "Dobropisy" },
] as const;

export default function Invoices() {
  const [, navigate] = useLocation();
  const { isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
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
  });

  const payMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/invoices/${id}/pay`),
    onSuccess: () => {
      invalidateInvoiceQueries();
      successToast("Faktura byla označena jako zaplacená");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/invoices/${id}/cancel`),
    onSuccess: () => {
      invalidateInvoiceQueries();
      successToast("Faktura byla stornována");
    },
  });

  // Bulk mutations
  const bulkUpdateMutation = useMutation({
    mutationFn: (data: { ids: number[]; updates: Record<string, any> }) =>
      api.put('/api/invoices/bulk-update', data),
    onSuccess: (data: any) => {
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
    onSuccess: (data: any) => {
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
      // Text search
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(search) ||
        invoice.customer.name.toLowerCase().includes(search) ||
        (invoice.customer.company?.toLowerCase().includes(search) ?? false);

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== "all" && invoice.status !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== "all" && invoice.invoiceType !== typeFilter) {
        return false;
      }

      // Date range filter
      if (dateFrom) {
        const invoiceDate = dayjs(invoice.issueDate);
        const fromDate = dayjs(dateFrom);
        if (invoiceDate.isBefore(fromDate, "day")) {
          return false;
        }
      }

      if (dateTo) {
        const invoiceDate = dayjs(invoice.issueDate);
        const toDate = dayjs(dateTo);
        if (invoiceDate.isAfter(toDate, "day")) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, searchTerm, statusFilter, typeFilter, dateFrom, dateTo]);

  // Pagination
  const { page, pageSize, setPage, setPageSize, paginatedData, totalPages, totalItems } = usePagination(filtered);

  // Selection helpers
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    const allIds = paginatedData.map(i => i.id);
    if (allIds.every(id => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };
  const clearSelection = () => setSelectedIds(new Set());

  const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
    setPage(1);
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Celkem nezaplaceno</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {invoices.filter(i => i.status === 'SENT').reduce((sum, i) => sum + parseFloat(i.total), 0).toLocaleString('cs-CZ')} Kč
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Po splatnosti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {invoices.filter(i => i.status === 'SENT' && dayjs(i.dueDate).isBefore(dayjs())).length} faktur
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Zaplaceno tento měsíc</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {invoices.filter(i => i.status === 'PAID' && dayjs(i.paidAt).isAfter(dayjs().startOf('month'))).reduce((sum, i) => sum + parseFloat(i.total), 0).toLocaleString('cs-CZ')} Kč
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Koncepty</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoices.filter(i => i.status === 'DRAFT').length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Seznam faktur
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and filters */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Hledat faktury..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4" />
                </Button>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-1" />
                    Zrušit filtry
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Zobrazit:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg border">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                      setStatusFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Typ faktury</Label>
                  <Select
                    value={typeFilter}
                    onValueChange={(v) => {
                      setTypeFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Datum od</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Datum do</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bulk action bar */}
          {isSuperAdmin && selectedIds.size > 0 && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 border rounded-lg mb-4">
              <Badge variant="secondary">{selectedIds.size} vybráno</Badge>
              <Button size="sm" variant="outline" onClick={() => { setBulkActionType('status'); setBulkStatus(''); setBulkActionOpen(true); }}>
                Změnit status
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkExportPdf}>
                <Download className="w-4 h-4 mr-1" />
                Export PDF
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { setBulkActionType('delete'); setBulkActionOpen(true); }}>
                <Trash2 className="w-4 h-4 mr-1" />
                Smazat
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                Zrušit výběr
              </Button>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isSuperAdmin && (
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={paginatedData.length > 0 && paginatedData.every(i => selectedIds.has(i.id))}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                      )}
                      <TableHead>Číslo faktury</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Odběratel</TableHead>
                      <TableHead>Datum vystavení</TableHead>
                      <TableHead>Splatnost</TableHead>
                      <TableHead className="text-right">Částka</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isSuperAdmin ? 9 : 8} className="text-center py-8 text-muted-foreground">
                          Žádné faktury
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((invoice) => (
                        <TableRow key={invoice.id} className={selectedIds.has(invoice.id) ? 'bg-primary/5' : ''}>
                          {isSuperAdmin && (
                            <TableCell className="w-[40px]">
                              <Checkbox
                                checked={selectedIds.has(invoice.id)}
                                onCheckedChange={() => toggleSelect(invoice.id)}
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-mono font-medium">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                invoice.invoiceType === "DEPOSIT"
                                  ? "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                  : invoice.invoiceType === "FINAL"
                                  ? "border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400"
                                  : invoice.invoiceType === "CREDIT_NOTE"
                                  ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400"
                                  : "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                              }
                            >
                              {invoice.invoiceType === "DEPOSIT" ? "Záloha" : invoice.invoiceType === "FINAL" ? "Ostrá" : invoice.invoiceType === "CREDIT_NOTE" ? "Dobropis" : "Částečná"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{invoice.customer.name}</span>
                              {invoice.customer.company && (
                                <span className="text-sm text-muted-foreground">
                                  {invoice.customer.company}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{dayjs(invoice.issueDate).format("DD.MM.YYYY")}</TableCell>
                          <TableCell>
                            <span
                              className={
                                dayjs(invoice.dueDate).isBefore(dayjs()) &&
                                invoice.status !== "PAID" &&
                                invoice.status !== "CANCELLED"
                                  ? "text-destructive font-medium"
                                  : ""
                              }
                            >
                              {dayjs(invoice.dueDate).format("DD.MM.YYYY")}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {parseFloat(invoice.total).toLocaleString("cs-CZ")} {invoice.currency}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={invoice.status}
                              type="invoice"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <TooltipProvider>
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setSelectedInvoice(invoice)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Zobrazit detail</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleExportPdf(invoice.id, invoice.invoiceNumber)}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Stáhnout PDF</TooltipContent>
                              </Tooltip>
                              {invoice.status === "DRAFT" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Upravit</TooltipContent>
                                </Tooltip>
                              )}
                              {(invoice.status === "SENT" || invoice.status === "PAID") && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600"
                                      onClick={() => createCreditNoteMutation.mutate(invoice.id)}
                                      disabled={createCreditNoteMutation.isPending}
                                    >
                                      <FileX className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Vystavit dobropis</TooltipContent>
                                </Tooltip>
                              )}
                              {(invoice.status === "DRAFT" || invoice.status === "SENT" || invoice.status === "PAID") && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => sendMutation.mutate(invoice.id)}
                                      disabled={sendMutation.isPending}
                                    >
                                      <Send className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{invoice.status === "PAID" ? "Znovu odeslat" : "Odeslat"}</TooltipContent>
                                </Tooltip>
                              )}
                              {(invoice.status === "DRAFT" || invoice.status === "SENT") && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-green-600"
                                        onClick={() => payMutation.mutate(invoice.id)}
                                        disabled={payMutation.isPending}
                                      >
                                        <Check className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Označit jako zaplaceno</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() => cancelMutation.mutate(invoice.id)}
                                        disabled={cancelMutation.isPending}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Stornovat</TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 mt-4">
                  <div className="text-sm text-muted-foreground">
                    Zobrazeno {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} z {totalItems} faktur
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm px-2">
                      Strana <strong>{page}</strong> z <strong>{totalPages || 1}</strong>
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage(totalPages)}
                      disabled={page >= totalPages}
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle>Faktura {selectedInvoice?.invoiceNumber}</DialogTitle>
              {selectedInvoice && (
                <Badge
                  variant="outline"
                  className={
                    selectedInvoice.invoiceType === "DEPOSIT"
                      ? "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      : selectedInvoice.invoiceType === "FINAL"
                      ? "border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400"
                      : selectedInvoice.invoiceType === "CREDIT_NOTE"
                      ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400"
                      : "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                  }
                >
                  {INVOICE_TYPE_LABELS[selectedInvoice.invoiceType]}
                </Badge>
              )}
            </div>
            <DialogDescription>Detail faktury</DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Datum vystavení</p>
                  <p className="font-medium">
                    {dayjs(selectedInvoice.issueDate).format("DD.MM.YYYY")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Datum splatnosti</p>
                  <p className="font-medium">
                    {dayjs(selectedInvoice.dueDate).format("DD.MM.YYYY")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Variabilní symbol</p>
                  <p className="font-mono font-medium">{selectedInvoice.variableSymbol}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge
                    status={selectedInvoice.status}
                    type="invoice"
                  />
                </div>
                {selectedInvoice.originalInvoiceId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Dobropis k faktuře</p>
                    <p className="font-mono font-medium">#{selectedInvoice.originalInvoiceId}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Supplier and Customer */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Dodavatel</h4>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{selectedInvoice.supplier.name}</p>
                    <p>{selectedInvoice.supplier.street}</p>
                    <p>
                      {selectedInvoice.supplier.zipcode} {selectedInvoice.supplier.city}
                    </p>
                    <p className="text-muted-foreground">IČO: {selectedInvoice.supplier.ico}</p>
                    {selectedInvoice.supplier.dic && (
                      <p className="text-muted-foreground">DIČ: {selectedInvoice.supplier.dic}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Odběratel</h4>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{selectedInvoice.customer.name}</p>
                    {selectedInvoice.customer.company && (
                      <p>{selectedInvoice.customer.company}</p>
                    )}
                    {selectedInvoice.customer.street && <p>{selectedInvoice.customer.street}</p>}
                    {(selectedInvoice.customer.zipcode || selectedInvoice.customer.city) && (
                      <p>
                        {selectedInvoice.customer.zipcode} {selectedInvoice.customer.city}
                      </p>
                    )}
                    {selectedInvoice.customer.ico && (
                      <p className="text-muted-foreground">IČO: {selectedInvoice.customer.ico}</p>
                    )}
                    {selectedInvoice.customer.dic && (
                      <p className="text-muted-foreground">DIČ: {selectedInvoice.customer.dic}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div>
                <h4 className="font-semibold mb-3">Položky</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Popis</TableHead>
                      <TableHead className="text-right">Množství</TableHead>
                      <TableHead className="text-right">Cena/ks</TableHead>
                      <TableHead className="text-right">Celkem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono">
                          {item.unitPrice.toLocaleString("cs-CZ")} Kč
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.total.toLocaleString("cs-CZ")} Kč
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Základ</span>
                    <span className="font-mono">
                      {parseFloat(selectedInvoice.subtotal).toLocaleString("cs-CZ")} Kč
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">DPH {selectedInvoice.vatRate}%</span>
                    <span className="font-mono">
                      {parseFloat(selectedInvoice.vatAmount).toLocaleString("cs-CZ")} Kč
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Celkem</span>
                    <span className="font-mono text-lg">
                      {parseFloat(selectedInvoice.total).toLocaleString("cs-CZ")}{" "}
                      {selectedInvoice.currency}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              {selectedInvoice.qrPaymentData && (
                <>
                  <Separator />
                  <div className="flex items-center gap-4">
                    <QrCode className="w-24 h-24 text-muted-foreground" />
                    <div>
                      <h4 className="font-semibold mb-1">QR platba</h4>
                      <p className="text-sm text-muted-foreground">
                        Naskenujte QR kód pro rychlou platbu
                      </p>
                      <p className="text-xs font-mono mt-2 text-muted-foreground break-all">
                        {selectedInvoice.qrPaymentData}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Bank details */}
              {selectedInvoice.supplier.bankAccount && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Bankovní spojení</h4>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">Číslo účtu:</span>{" "}
                        <span className="font-mono">{selectedInvoice.supplier.bankAccount}</span>
                      </p>
                      {selectedInvoice.supplier.iban && (
                        <p>
                          <span className="text-muted-foreground">IBAN:</span>{" "}
                          <span className="font-mono">{selectedInvoice.supplier.iban}</span>
                        </p>
                      )}
                      {selectedInvoice.supplier.swift && (
                        <p>
                          <span className="text-muted-foreground">SWIFT:</span>{" "}
                          <span className="font-mono">{selectedInvoice.supplier.swift}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionOpen} onOpenChange={(open) => { setBulkActionOpen(open); if (!open) setBulkStatus(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkActionType === 'delete' ? `Smazat ${selectedIds.size} faktur?` : `Hromadná změna (${selectedIds.size} faktur)`}
            </DialogTitle>
            <DialogDescription>
              {bulkActionType === 'delete' ? 'Tato akce je nevratná.' : 'Vyberte nový status pro všechny označené faktury.'}
            </DialogDescription>
          </DialogHeader>
          {bulkActionType === 'status' && (
            <div className="py-4">
              <Label>Nový status</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Vyberte status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.filter(o => o.value !== 'all').map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionOpen(false)}>Zrušit</Button>
            <Button
              variant={bulkActionType === 'delete' ? 'destructive' : 'default'}
              onClick={() => {
                const ids = Array.from(selectedIds);
                if (bulkActionType === 'delete') {
                  bulkDeleteMutation.mutate(ids);
                } else if (bulkActionType === 'status' && bulkStatus) {
                  bulkUpdateMutation.mutate({ ids, updates: { status: bulkStatus } });
                }
              }}
              disabled={bulkUpdateMutation.isPending || bulkDeleteMutation.isPending || (bulkActionType === 'status' && !bulkStatus)}
            >
              {(bulkUpdateMutation.isPending || bulkDeleteMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bulkActionType === 'delete' ? 'Smazat' : 'Aplikovat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
