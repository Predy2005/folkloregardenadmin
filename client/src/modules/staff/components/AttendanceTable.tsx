import type { StaffAttendance } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { formatCurrency } from "@/shared/lib/formatting";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { CheckCircle, XCircle } from "lucide-react";
import { EmptyState } from "@/shared/components";
import dayjs from "dayjs";

interface AttendanceTableProps {
  attendances: StaffAttendance[];
  isLoading: boolean;
  hasFilters: boolean;
  isSuperAdmin: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  allSelected: boolean;
  someSelected: boolean;
  onMarkPaid: (id: number) => void;
  onDelete: (id: number) => void;
  markPaidPending: boolean;
  deletePending: boolean;
}

export function AttendanceTable({
  attendances,
  isLoading,
  hasFilters,
  isSuperAdmin,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  someSelected,
  onMarkPaid,
  onDelete,
  markPaidPending,
  deletePending,
}: AttendanceTableProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Načítání...</div>;
  }

  if (!attendances || attendances.length === 0) {
    return <EmptyState title={hasFilters ? "Žádné záznamy nenalezeny" : "Zatím žádné záznamy"} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {isSuperAdmin && (
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={onToggleSelectAll}
                aria-label="Vybrat vše"
              />
            </TableHead>
          )}
          <TableHead>Datum</TableHead>
          <TableHead>Člen personálu</TableHead>
          <TableHead className="text-right">Hodiny</TableHead>
          <TableHead className="text-right">Částka</TableHead>
          <TableHead>Poznámka</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Akce</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {attendances.map((attendance) => {
          const amount = attendance.paymentAmount
            ? Number(attendance.paymentAmount)
            : attendance.staffMember?.hourlyRate
              ? Number(attendance.hoursWorked) * Number(attendance.staffMember.hourlyRate)
              : 0;
          const displayName = attendance.staffMemberName
            ?? (attendance.staffMember
              ? `${attendance.staffMember.firstName} ${attendance.staffMember.lastName}`
              : `ID: ${attendance.staffMemberId}`);
          return (
            <TableRow key={attendance.id} data-testid={`row-attendance-${attendance.id}`}>
              {isSuperAdmin && (
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(attendance.id)}
                    onCheckedChange={() => onToggleSelect(attendance.id)}
                    aria-label={`Vybrat ${displayName}`}
                  />
                </TableCell>
              )}
              <TableCell>
                {dayjs(attendance.attendanceDate).format("DD.MM.YYYY")}
              </TableCell>
              <TableCell className="font-medium">
                {displayName}
              </TableCell>
              <TableCell className="text-right">
                {attendance.hoursWorked} h
              </TableCell>
              <TableCell className="text-right font-medium">
                {amount > 0 ? formatCurrency(amount) : "-"}
              </TableCell>
              <TableCell>
                <p className="text-sm text-muted-foreground max-w-xs truncate">
                  {attendance.notes || "-"}
                </p>
              </TableCell>
              <TableCell>
                {attendance.isPaid ? (
                  <Badge variant="default">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Zaplaceno
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    Nezaplaceno
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                {!attendance.isPaid && isSuperAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMarkPaid(attendance.id)}
                    disabled={markPaidPending}
                    data-testid={`button-mark-paid-${attendance.id}`}
                  >
                    Označit jako zaplaceno
                  </Button>
                )}
                {attendance.isPaid && attendance.paidAt && (
                  <span className="text-sm text-muted-foreground">
                    {dayjs(attendance.paidAt).format("DD.MM.YYYY")}
                  </span>
                )}
                {isSuperAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Opravdu smazat tento záznam docházky?")) {
                        onDelete(attendance.id);
                      }
                    }}
                    disabled={deletePending}
                  >
                    Smazat
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
