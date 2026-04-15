import type { CashboxTransfer } from "@shared/types";
import { formatCurrency } from "@/shared/lib/formatting";
import { Button } from "@/shared/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { EmptyState } from "@/shared/components";
import dayjs from "dayjs";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { useAllTransfers, useCancelTransfer, useApproveClosureTransfer } from "../hooks/useCashboxTransfers";

interface TransfersTabProps {
  isSuperAdmin: boolean;
}

export function TransfersTab({ isSuperAdmin }: TransfersTabProps) {
  const { data: allTransfers } = useAllTransfers();
  const cancelTransferMutation = useCancelTransfer();
  const approveClosureMutation = useApproveClosureTransfer();

  if (!allTransfers || allTransfers.length === 0) {
    return <EmptyState title="Žádné převody na eventy" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead>Event</TableHead>
          <TableHead className="text-right">Částka</TableHead>
          <TableHead>Stav</TableHead>
          <TableHead>Vytvořil</TableHead>
          <TableHead>Popis</TableHead>
          <TableHead>Akce</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {allTransfers.map((t) => (
          <TableRow key={t.id}>
            <TableCell>{dayjs(t.initiatedAt).format("DD.MM.YYYY HH:mm")}</TableCell>
            <TableCell className="font-medium">{t.eventName}</TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(t.amount, t.currency)}
            </TableCell>
            <TableCell>
              <TransferStatusBadge status={t.status} />
            </TableCell>
            <TableCell>{t.initiatedByName}</TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{t.description || "-"}</TableCell>
            <TableCell>
              {t.status === 'PENDING' && (
                <div className="flex items-center gap-1">
                  {isSuperAdmin && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Schválit převod ${formatCurrency(t.amount, t.currency)} z eventu "${t.eventName}" do hlavní kasy?`)) {
                          approveClosureMutation.mutate(t.id);
                        }
                      }}
                      disabled={approveClosureMutation.isPending}
                    >
                      Schválit
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Opravdu zrušit tento převod?")) {
                        cancelTransferMutation.mutate(t.id, {
                          onSuccess: () => successToast("Převod zrušen"),
                          onError: (e: Error) => errorToast(e),
                        });
                      }
                    }}
                    disabled={cancelTransferMutation.isPending}
                  >
                    Zrušit
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function TransferStatusBadge({ status }: { status: CashboxTransfer["status"] }) {
  switch (status) {
    case "PENDING":
      return <Badge variant="outline" className="text-amber-600 border-amber-300">Čekající</Badge>;
    case "CONFIRMED":
      return <Badge variant="outline" className="text-green-600 border-green-300">Potvrzený</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">Odmítnutý</Badge>;
    case "CANCELLED":
      return <Badge variant="outline" className="text-gray-500 border-gray-300">Zrušeno</Badge>;
  }
}
