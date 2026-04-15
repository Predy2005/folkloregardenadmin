import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { formatCurrency } from "@/shared/lib/formatting";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import type { StaffHistoryResponse } from "@shared/types";
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
import { Calendar, Clock, Banknote, AlertCircle, Loader2 } from "lucide-react";
import dayjs from "dayjs";

function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "paid":
      return <Badge variant="default">Zaplaceno</Badge>;
    case "partial":
      return <Badge variant="secondary">Částečně</Badge>;
    case "unpaid":
      return <Badge variant="destructive">Nezaplaceno</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function AttendanceStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "present":
      return <Badge variant="default">Přítomen</Badge>;
    case "absent":
      return <Badge variant="destructive">Nepřítomen</Badge>;
    case "confirmed":
      return <Badge variant="secondary">Potvrzeno</Badge>;
    default:
      return <Badge variant="outline">{status || "-"}</Badge>;
  }
}

interface StaffAssignmentsTabProps {
  staffId: string;
}

export function StaffAssignmentsTab({ staffId }: StaffAssignmentsTabProps) {
  const { defaultCurrency } = useCurrency();
  const { data: history, isLoading } = useQuery<StaffHistoryResponse>({
    queryKey: ["/api/staff", staffId, "history"],
    queryFn: () => api.get(`/api/staff/${staffId}/history`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!history) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nepodařilo se načíst historii práce
      </div>
    );
  }

  const { summary, assignments } = history;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Celkem akcí
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Celkem hodin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalHours.toFixed(1)} h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Celkem vyplaceno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(Number(summary.totalEarned), defaultCurrency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Nezaplaceno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(Number(summary.totalUnpaid), defaultCurrency)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments table */}
      <Card>
        <CardHeader>
          <CardTitle>Přiřazení k akcím</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Zatím žádné přiřazení k akcím
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Akce</TableHead>
                  <TableHead>Pozice</TableHead>
                  <TableHead className="text-right">Hodiny</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead>Status platby</TableHead>
                  <TableHead>Docházka</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      {dayjs(assignment.eventDate).format("DD.MM.YYYY")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {assignment.eventName}
                    </TableCell>
                    <TableCell>{assignment.role}</TableCell>
                    <TableCell className="text-right">
                      {assignment.hoursWorked > 0 ? `${assignment.hoursWorked} h` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {assignment.paymentAmount
                        ? formatCurrency(Number(assignment.paymentAmount), defaultCurrency)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={assignment.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <AttendanceStatusBadge status={assignment.attendanceStatus} />
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
