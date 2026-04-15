import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface RedemptionsSectionProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bulkActionType: 'activate' | 'deactivate' | 'delete' | null;
  selectedCount: number;
  isPending: boolean;
  onExecute: () => void;
}

export function RedemptionsSection({
  isOpen,
  onOpenChange,
  bulkActionType,
  selectedCount,
  isPending,
  onExecute,
}: RedemptionsSectionProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {bulkActionType === 'delete'
              ? `Smazat ${selectedCount} voucherů?`
              : bulkActionType === 'activate'
              ? `Aktivovat ${selectedCount} voucherů?`
              : `Deaktivovat ${selectedCount} voucherů?`}
          </DialogTitle>
          <DialogDescription>
            {bulkActionType === 'delete'
              ? 'Tato akce je nevratná.'
              : bulkActionType === 'activate'
              ? 'Všechny vybrané vouchery budou aktivovány.'
              : 'Všechny vybrané vouchery budou deaktivovány.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button
            variant={bulkActionType === 'delete' ? 'destructive' : 'default'}
            onClick={onExecute}
            disabled={isPending}
          >
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {bulkActionType === 'delete' ? 'Smazat' : bulkActionType === 'activate' ? 'Aktivovat' : 'Deaktivovat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
