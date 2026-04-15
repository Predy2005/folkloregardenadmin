import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Payment, Reservation } from "@shared/types";
import { formatCurrency } from "@/shared/lib/formatting";
import dayjs from "dayjs";

interface PaymentsTableProps {
  paginatedData: Payment[];
  reservationMap: Map<string, Reservation>;
  onViewPayment: (payment: Payment) => void;
  // Pagination
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
}

export function PaymentsTable({
  paginatedData,
  reservationMap,
  onViewPayment,
  page,
  pageSize,
  totalPages,
  totalItems,
  setPage,
}: PaymentsTableProps) {
  return (
    <>
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">ID</TableHead>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Rezervace</TableHead>
              <TableHead>Částka</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Žádné platby
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((payment: Payment) => {
                const reservation = reservationMap.get(payment.reservationReference);
                return (
                  <TableRow
                    key={payment.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onViewPayment(payment)}
                    data-testid={`row-payment-${payment.id}`}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">#{payment.id}</TableCell>
                    <TableCell className="font-mono text-sm max-w-[200px] truncate">
                      {payment.transactionId}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-sm">#{payment.reservationReference}</span>
                        {reservation && (
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {reservation.contactName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {formatCurrency(Number(payment.amount), payment.currency)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {dayjs(payment.createdAt).format('DD.MM.YYYY HH:mm')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} type="payment" />
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewPayment(payment);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Zobrazit detail</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="text-sm text-muted-foreground">
            Zobrazeno {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} z {totalItems} plateb
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
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm">
                Strana <strong>{page}</strong> z <strong>{totalPages || 1}</strong>
              </span>
            </div>
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
  );
}
