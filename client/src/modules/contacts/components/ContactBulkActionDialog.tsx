import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface ContactBulkActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'delete' | 'source' | null;
  selectedCount: number;
  bulkValue: string;
  onBulkValueChange: (value: string) => void;
  onExecute: () => void;
  onClose: () => void;
  isPending: boolean;
}

export function ContactBulkActionDialog({
  open,
  onOpenChange,
  actionType,
  selectedCount,
  bulkValue,
  onBulkValueChange,
  onExecute,
  onClose,
  isPending,
}: ContactBulkActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actionType === 'delete' && 'Smazat kontakty'}
            {actionType === 'source' && 'Změnit zdroj kontaktů'}
          </DialogTitle>
          <DialogDescription>
            {actionType === 'delete' &&
              `Opravdu chcete smazat ${selectedCount} vybraných kontaktů? Tato akce je nevratná.`}
            {actionType === 'source' &&
              `Změna zdroje pro ${selectedCount} vybraných kontaktů.`}
          </DialogDescription>
        </DialogHeader>

        {actionType === 'source' && (
          <div className="space-y-2 py-2">
            <Label>Nový zdroj</Label>
            <Input
              value={bulkValue}
              onChange={(e) => onBulkValueChange(e.target.value)}
              placeholder="Zadejte nový zdroj..."
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Zrušit
          </Button>
          <Button
            variant={actionType === 'delete' ? 'destructive' : 'default'}
            onClick={onExecute}
            disabled={
              (actionType === 'source' && !bulkValue.trim()) ||
              isPending
            }
          >
            {isPending
              ? 'Provádím...'
              : actionType === 'delete'
                ? 'Smazat'
                : 'Uložit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
