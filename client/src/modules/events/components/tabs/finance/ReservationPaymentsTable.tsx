import { useState } from "react";
import { useLocation } from "wouter";
import { formatCurrency } from "@/shared/lib/formatting";
import type { ReservationPaymentSummary } from "@shared/types";
import { useToggleSet } from "@/shared/hooks/useToggleSet";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { getPaymentStatusBadge, getPaymentMethodBadge, getInvoiceStatusBadge, getInvoiceTypeBadge } from "./financeBadges";
import { InvoiceCreateDialog } from "@modules/reservations/components/InvoiceCreateDialog";
import {
  Banknote,
  ChevronDown,
  CreditCard,
  ExternalLink,
  FilePlus,
  FileText,
  MessageSquare,
  Users,
} from "lucide-react";

interface ReservationPaymentsTableProps {
  reservations: ReservationPaymentSummary[];
  onOpenNoteDialog: (reservation: ReservationPaymentSummary) => void;
  onOpenPaymentDialog: (reservation: ReservationPaymentSummary) => void;
  onInvoiceCreated?: () => void;
}

export default function ReservationPaymentsTable({
  reservations,
  onOpenNoteDialog,
  onOpenPaymentDialog,
  onInvoiceCreated,
}: ReservationPaymentsTableProps) {
  const [, setLocation] = useLocation();
  const expandedRows = useToggleSet<number>();

  // Invoice create dialog state
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceReservationId, setInvoiceReservationId] = useState<number | null>(null);
  const [invoiceType, setInvoiceType] = useState<"DEPOSIT" | "FINAL">("DEPOSIT");

  const handleCreateInvoice = (reservationId: number, type: "DEPOSIT" | "FINAL") => {
    setInvoiceReservationId(reservationId);
    setInvoiceType(type);
    setInvoiceDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Platby podle rezervací
        </CardTitle>
        <CardDescription>
          Přehled stavu plateb pro jednotlivé rezervace
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reservations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Žádné rezervace nejsou propojeny s touto akcí
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead className="text-center">Hostů</TableHead>
                  <TableHead className="text-center">Metoda</TableHead>
                  <TableHead className="text-right">Celkem</TableHead>
                  <TableHead className="text-right">Zaplaceno</TableHead>
                  <TableHead className="text-right">Zbývá</TableHead>
                  <TableHead className="text-center">Stav</TableHead>
                  <TableHead className="text-center">Faktury</TableHead>
                  <TableHead>Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((res) => (
                  <Collapsible key={res.reservationId} asChild>
                    <>
                      <TableRow
                        className={res.paymentStatus === "UNPAID" ? "bg-red-50" : res.paymentStatus === "PARTIAL" ? "bg-yellow-50" : ""}
                      >
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => expandedRows.toggle(res.reservationId)}
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${expandedRows.isOpen(res.reservationId) ? "rotate-180" : ""}`} />
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="text-left hover:underline"
                            onClick={() => setLocation(`/reservations/${res.reservationId}/edit`)}
                          >
                            <div className="font-medium text-primary">{res.contactName}</div>
                            <div className="text-xs text-muted-foreground">
                              #{res.reservationId} &middot; {res.contactEmail || res.contactPhone || "-"}
                            </div>
                          </button>
                          {res.paymentNote && (
                            <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {res.paymentNote.split("\n")[0].substring(0, 40)}...
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{res.guestCount}</TableCell>
                        <TableCell className="text-center">
                          {getPaymentMethodBadge(res.paymentMethod)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(res.totalPrice, res.currency)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(res.paidAmount, res.currency)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {res.remainingAmount > 0 ? formatCurrency(res.remainingAmount, res.currency) : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {getPaymentStatusBadge(res.paymentStatus)}
                        </TableCell>
                        <TableCell className="text-center">
                          {res.invoices.length > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="w-3 h-3 mr-1" />
                              {res.invoices.length}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLocation(`/reservations/${res.reservationId}/edit`)}
                              title="Detail rezervace"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onOpenNoteDialog(res)}
                              title="Poznámka"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            {res.remainingAmount > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenPaymentDialog(res)}
                                title="Zaznamenat platbu"
                              >
                                <Banknote className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCreateInvoice(res.reservationId, res.invoices.length === 0 ? "DEPOSIT" : "FINAL")}
                              title="Vytvořit fakturu"
                            >
                              <FilePlus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={10} className="p-4">
                            <div className="grid grid-cols-2 gap-4">
                              {/* Payment Info */}
                              <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  Platební údaje
                                </h4>
                                <dl className="text-sm space-y-1">
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Metoda:</dt>
                                    <dd>{res.paymentMethod || "Neurčeno"}</dd>
                                  </div>
                                  <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Rezervace ID:</dt>
                                    <dd>#{res.reservationId}</dd>
                                  </div>
                                </dl>
                                {res.paymentNote && (
                                  <div className="mt-3">
                                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Poznámky:</h5>
                                    <p className="text-sm whitespace-pre-wrap bg-white p-2 rounded border">
                                      {res.paymentNote}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Invoices */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Faktury ({res.invoices.length})
                                  </h4>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => handleCreateInvoice(res.reservationId, "DEPOSIT")}
                                    >
                                      <FilePlus className="h-3 w-3 mr-1" />
                                      Záloha
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      onClick={() => handleCreateInvoice(res.reservationId, "FINAL")}
                                    >
                                      <FilePlus className="h-3 w-3 mr-1" />
                                      Doplatek
                                    </Button>
                                  </div>
                                </div>
                                {res.invoices.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Žádné faktury</p>
                                ) : (
                                  <div className="space-y-2">
                                    {res.invoices.map((inv) => (
                                      <button
                                        key={inv.id}
                                        type="button"
                                        className="w-full flex items-center justify-between text-sm bg-white p-2 rounded border hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer"
                                        onClick={() => setLocation(`/invoices/${inv.id}/edit`)}
                                      >
                                        <div className="flex items-center gap-2">
                                          {getInvoiceTypeBadge(inv.invoiceType)}
                                          <span className="font-mono">{inv.invoiceNumber}</span>
                                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{formatCurrency(inv.total, inv.currency)}</span>
                                          {getInvoiceStatusBadge(inv.status)}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Invoice create dialog - pre-filled from reservation */}
      {invoiceReservationId && (
        <InvoiceCreateDialog
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
          reservationId={invoiceReservationId}
          invoiceType={invoiceType}
          onSuccess={onInvoiceCreated}
        />
      )}
    </Card>
  );
}
