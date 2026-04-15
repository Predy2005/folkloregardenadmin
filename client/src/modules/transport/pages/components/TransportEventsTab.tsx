import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { formatCurrency } from "@/shared/lib/formatting";
import type { EventTransport, TransportPaymentStatus } from "@shared/types";
import { TRANSPORT_TYPE_LABELS, TRANSPORT_PAYMENT_STATUS_LABELS } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Loader2, Calendar, Users, Banknote } from "lucide-react";
import dayjs from "dayjs";

function paymentStatusVariant(status: TransportPaymentStatus) {
  switch (status) {
    case "PAID": return "default" as const;
    case "INVOICED": return "outline" as const;
    default: return "secondary" as const;
  }
}

export function TransportEventsTab({ companyId }: { companyId: number }) {
  const [, navigate] = useLocation();

  const { data: eventsData, isLoading } = useQuery<{ items: EventTransport[]; summary: { totalEvents: number; totalRevenue: number; pendingPayments: number } }>({
    queryKey: ["/api/transport", companyId, "events"],
    queryFn: () => api.get(`/api/transport/${companyId}/events`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = eventsData?.items ?? [];
  const totalEvents = eventsData?.summary?.totalEvents ?? items.length;
  const totalRevenue = eventsData?.summary?.totalRevenue ?? 0;
  const pendingCount = items.filter((e) => e.paymentStatus === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalEvents}</p>
                <p className="text-sm text-muted-foreground">Celkem akci</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Banknote className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">Celkova trzba</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Nezaplaceno</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events table */}
      <Card>
        <CardHeader>
          <CardTitle>Historie akci</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Zatim zadne akce
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Akce</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Vozidlo</TableHead>
                  <TableHead>Ridic</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-right">Cena</TableHead>
                  <TableHead>Platba</TableHead>
                  <TableHead>Faktura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => e.eventId && navigate(`/events/${e.eventId}/edit`)}>
                    <TableCell className="font-medium">{e.eventName || "-"}</TableCell>
                    <TableCell>{e.eventDate ? dayjs(e.eventDate).format("DD.MM.YYYY") : "-"}</TableCell>
                    <TableCell>{e.vehicleLicensePlate || "-"}</TableCell>
                    <TableCell>{e.driverName || "-"}</TableCell>
                    <TableCell>
                      {e.transportType ? (
                        <Badge variant="outline">{TRANSPORT_TYPE_LABELS[e.transportType]}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">{e.price != null ? formatCurrency(e.price) : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={paymentStatusVariant(e.paymentStatus)}>
                        {TRANSPORT_PAYMENT_STATUS_LABELS[e.paymentStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>{e.invoiceNumber || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
