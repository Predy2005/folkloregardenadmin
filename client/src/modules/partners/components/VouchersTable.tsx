import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Pencil, Trash2, QrCode } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { EmptyState } from "@/shared/components";
import dayjs from "dayjs";
import type { Voucher } from "@shared/types";

interface VouchersTableProps {
  vouchers: Voucher[] | undefined;
  isLoading: boolean;
  isSuperAdmin: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onEdit: (voucher: Voucher) => void;
  onDelete: (id: number) => void;
  getVoucherStatus: (voucher: Voucher) => { label: string; variant: "secondary" | "destructive" | "default"; key: string };
  hasFilters: boolean;
}

export function VouchersTable({
  vouchers,
  isLoading,
  isSuperAdmin,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  getVoucherStatus,
  hasFilters,
}: VouchersTableProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Načítání...</div>;
  }

  if (!vouchers || vouchers.length === 0) {
    return (
      <EmptyState
        title={hasFilters ? "Žádné vouchery nenalezeny" : "Zatím žádné vouchery"}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {isSuperAdmin && (
            <TableHead className="w-[40px]">
              <Checkbox
                checked={(vouchers?.length ?? 0) > 0 && (vouchers ?? []).every(v => selectedIds.has(v.id))}
                onCheckedChange={onToggleSelectAll}
              />
            </TableHead>
          )}
          <TableHead>Kód</TableHead>
          <TableHead>Sleva</TableHead>
          <TableHead>Platnost</TableHead>
          <TableHead>Využití</TableHead>
          <TableHead>Partner</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Akce</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vouchers.map((voucher) => {
          const status = getVoucherStatus(voucher);
          return (
            <TableRow key={voucher.id} data-testid={`row-voucher-${voucher.id}`} className={selectedIds.has(voucher.id) ? 'bg-primary/5' : ''}>
              {isSuperAdmin && (
                <TableCell className="w-[40px]">
                  <Checkbox
                    checked={selectedIds.has(voucher.id)}
                    onCheckedChange={() => onToggleSelect(voucher.id)}
                  />
                </TableCell>
              )}
              <TableCell className="font-mono font-medium">{voucher.code}</TableCell>
              <TableCell>
                <Badge variant="secondary">{voucher.discountPercent}%</Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{dayjs(voucher.validFrom).format("DD.MM.YYYY")}</div>
                  <div className="text-muted-foreground">
                    do {dayjs(voucher.validTo).format("DD.MM.YYYY")}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {voucher.usedCount}
                  {voucher.usageLimit && ` / ${voucher.usageLimit}`}
                </span>
              </TableCell>
              <TableCell>
                {voucher.partner?.name || "-"}
              </TableCell>
              <TableCell>
                <Badge variant={status.variant}>{status.label}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <TooltipProvider>
                <div className="flex items-center justify-end gap-2">
                  {voucher.qrCodeUrl && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-qr-${voucher.id}`}
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Zobrazit QR kód</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(voucher)}
                        data-testid={`button-edit-${voucher.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Upravit</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(voucher.id)}
                        data-testid={`button-delete-${voucher.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Smazat</TooltipContent>
                  </Tooltip>
                </div>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
