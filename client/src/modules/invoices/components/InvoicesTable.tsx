import dayjs from "dayjs";
import { formatCurrency } from "@/shared/lib/formatting";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Eye,
  Send,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Pencil,
  Download,
  FileX,
} from "lucide-react";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import type { Invoice } from "@shared/types";

interface InvoicesTableProps {
  paginatedData: Invoice[];
  isLoading: boolean;
  isSuperAdmin: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onViewDetail: (invoice: Invoice) => void;
  onExportPdf: (invoiceId: number, invoiceNumber: string) => void;
  onNavigateEdit: (id: number) => void;
  onSend: (id: number) => void;
  sendPending: boolean;
  onPay: (id: number) => void;
  payPending: boolean;
  onCancel: (id: number) => void;
  cancelPending: boolean;
  onCreateCreditNote: (id: number) => void;
  creditNotePending: boolean;
  // Pagination
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function InvoicesTable({
  paginatedData,
  isLoading,
  isSuperAdmin,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onViewDetail,
  onExportPdf,
  onNavigateEdit,
  onSend,
  sendPending,
  onPay,
  payPending,
  onCancel,
  cancelPending,
  onCreateCreditNote,
  creditNotePending,
  page,
  pageSize,
  totalPages,
  totalItems,
  onPageChange,
}: InvoicesTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {isSuperAdmin && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={paginatedData.length > 0 && paginatedData.every(i => selectedIds.has(i.id))}
                    onCheckedChange={onToggleSelectAll}
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
                        onCheckedChange={() => onToggleSelect(invoice.id)}
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
                    {formatCurrency(invoice.total, invoice.currency)}
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
                            onClick={() => onViewDetail(invoice)}
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
                            onClick={() => onExportPdf(invoice.id, invoice.invoiceNumber)}
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
                              onClick={() => onNavigateEdit(invoice.id)}
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
                              onClick={() => onCreateCreditNote(invoice.id)}
                              disabled={creditNotePending}
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
                              onClick={() => onSend(invoice.id)}
                              disabled={sendPending}
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
                                onClick={() => onPay(invoice.id)}
                                disabled={payPending}
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
                                onClick={() => onCancel(invoice.id)}
                                disabled={cancelPending}
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
              onClick={() => onPageChange(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page - 1)}
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
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
