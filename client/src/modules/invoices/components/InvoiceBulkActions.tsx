import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Download, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { STATUS_OPTIONS } from "./InvoiceFilters";

interface InvoiceBulkActionsProps {
  selectedCount: number;
  onChangeStatus: () => void;
  onExportPdf: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export function InvoiceBulkActionBar({
  selectedCount,
  onChangeStatus,
  onExportPdf,
  onDelete,
  onClearSelection,
}: InvoiceBulkActionsProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-primary/5 border rounded-lg mb-4">
      <Badge variant="secondary">{selectedCount} vybráno</Badge>
      <Button size="sm" variant="outline" onClick={onChangeStatus}>
        Změnit status
      </Button>
      <Button size="sm" variant="outline" onClick={onExportPdf}>
        <Download className="w-4 h-4 mr-1" />
        Export PDF
      </Button>
      <Button size="sm" variant="destructive" onClick={onDelete}>
        <Trash2 className="w-4 h-4 mr-1" />
        Smazat
      </Button>
      <Button size="sm" variant="ghost" onClick={onClearSelection}>
        Zrušit výběr
      </Button>
    </div>
  );
}

interface InvoiceBulkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'status' | 'delete' | null;
  selectedCount: number;
  bulkStatus: string;
  onBulkStatusChange: (value: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function InvoiceBulkDialog({
  open,
  onOpenChange,
  actionType,
  selectedCount,
  bulkStatus,
  onBulkStatusChange,
  onConfirm,
  isPending,
}: InvoiceBulkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actionType === 'delete' ? `Smazat ${selectedCount} faktur?` : `Hromadná změna (${selectedCount} faktur)`}
          </DialogTitle>
          <DialogDescription>
            {actionType === 'delete' ? 'Tato akce je nevratná.' : 'Vyberte nový status pro všechny označené faktury.'}
          </DialogDescription>
        </DialogHeader>
        {actionType === 'status' && (
          <div className="py-4">
            <Label>Nový status</Label>
            <Select value={bulkStatus} onValueChange={onBulkStatusChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Vyberte status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.filter(o => o.value !== 'all').map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button
            variant={actionType === 'delete' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isPending || (actionType === 'status' && !bulkStatus)}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {actionType === 'delete' ? 'Smazat' : 'Aplikovat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
