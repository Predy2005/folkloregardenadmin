import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
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
} from "lucide-react";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { useToast } from "@/shared/hooks/use-toast";
import type { Invoice, InvoiceStatus, InvoiceType } from "@shared/types";
import { INVOICE_TYPE_LABELS } from "@shared/types";
import { Badge } from "@/shared/components/ui/badge";

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
] as const;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default function Invoices() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Fetch invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["/api/invoices"],
    queryFn: () => api.get<Invoice[]>("/api/invoices"),
  });

  // Status mutations
  const sendMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/invoices/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Faktura byla označena jako odeslaná" });
    },
  });

  const payMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/invoices/${id}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Faktura byla označena jako zaplacená" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/invoices/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Faktura byla stornována" });
    },
  });

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
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = filtered.slice(startIndex, endIndex);

  const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Faktury
          </h1>
          <p className="text-muted-foreground mt-1">
            Správa a přehled vystavených faktur
          </p>
        </div>
        <Button
          onClick={() => navigate("/invoices/new")}
          className="bg-gradient-to-r from-primary to-purple-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nová faktura
        </Button>
      </div>

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
                      setCurrentPage(1);
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
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setCurrentPage(1);
                  }}
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
                      setCurrentPage(1);
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
                      setCurrentPage(1);
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
                      setCurrentPage(1);
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
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>
            )}
          </div>

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
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Žádné faktury
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((invoice) => (
                        <TableRow key={invoice.id}>
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
                                  : "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                              }
                            >
                              {invoice.invoiceType === "DEPOSIT" ? "Záloha" : invoice.invoiceType === "FINAL" ? "Ostrá" : "Částečná"}
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
                              {(invoice.status === "DRAFT" || invoice.status === "SENT") && (
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
                              {invoice.status === "DRAFT" && (
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
                                  <TooltipContent>Odeslat</TooltipContent>
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
                    Zobrazeno {startIndex + 1}–{endIndex} z {totalItems} faktur
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm px-2">
                      Strana <strong>{currentPage}</strong> z <strong>{totalPages || 1}</strong>
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage >= totalPages}
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
    </div>
  );
}
