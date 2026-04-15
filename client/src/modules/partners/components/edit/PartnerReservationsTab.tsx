import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { formatCurrency } from "@/shared/lib/formatting";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import type { Reservation } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Loader2, Calendar, Users, Banknote } from "lucide-react";
import { StatusBadge } from "@/shared/components/StatusBadge";
import dayjs from "dayjs";

interface PartnerReservation {
  id: number;
  date: string;
  contactName: string;
  contactEmail: string;
  personsCount: number;
  totalPrice: number;
  status: string;
}

interface PartnerReservationsResponse {
  items: PartnerReservation[];
  summary: {
    totalReservations: number;
    totalPersons: number;
    totalRevenue: number;
  };
}

interface PartnerReservationsTabProps {
  partnerId: number;
}

export function PartnerReservationsTab({ partnerId }: PartnerReservationsTabProps) {
  const [, navigate] = useLocation();
  const { defaultCurrency } = useCurrency();

  const { data, isLoading } = useQuery<PartnerReservationsResponse>({
    queryKey: ["/api/partner", partnerId, "reservations"],
    queryFn: () => api.get(`/api/partner/${partnerId}/reservations`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = data?.items ?? [];
  const summary = data?.summary ?? { totalReservations: 0, totalPersons: 0, totalRevenue: 0 };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{summary.totalReservations}</p>
                <p className="text-sm text-muted-foreground">Celkem rezervaci</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{summary.totalPersons}</p>
                <p className="text-sm text-muted-foreground">Celkem osob</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Banknote className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue, defaultCurrency)}</p>
                <p className="text-sm text-muted-foreground">Celkova trzba</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservations table */}
      <Card>
        <CardHeader>
          <CardTitle>Rezervace partnera</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Zadne rezervace tohoto partnera
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead className="text-right">Osoby</TableHead>
                  <TableHead className="text-right">Cena</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {dayjs(r.date).format("DD.MM.YYYY")}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{r.contactName}</div>
                        <div className="text-muted-foreground text-xs">{r.contactEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{r.personsCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.totalPrice, defaultCurrency)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status as Reservation["status"]} type="reservation" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/reservations/${r.id}/edit`)}
                      >
                        Detail
                      </Button>
                    </TableCell>
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
