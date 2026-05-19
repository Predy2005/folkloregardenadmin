import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { usePartnerCategories } from "@modules/partners/hooks/usePartnerCategories";

interface BulkCreatePartnersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  isPending: boolean;
  onConfirm: (partnerType: string) => void;
}

/**
 * Hromadné vytvoření partnerů z vybraných kontaktů. Mirror logiky z
 * `/contacts/{id}/edit` → "Vytvořit partnera" (single flow). Field mapping
 * sjednocený na BE v `ContactController::bulkCreatePartners`.
 */
export function BulkCreatePartnersDialog({
  open,
  onOpenChange,
  selectedCount,
  isPending,
  onConfirm,
}: BulkCreatePartnersDialogProps) {
  const [partnerType, setPartnerType] = useState<string>("OTHER");
  const { data: partnerCategories } = usePartnerCategories();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vytvořit partnery z vybraných kontaktů</DialogTitle>
          <DialogDescription>
            Pro každý z {selectedCount} kontaktů vytvořím partnera s předvyplněnými údaji
            (firma → název, jméno → kontaktní osoba, fakturační údaje 1:1). Kontakty
            s duplicitním IČ nebo Pohoda kódem se přeskočí.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="bulk-partner-type" className="text-xs">Kategorie partnera</Label>
            <Select value={partnerType} onValueChange={setPartnerType}>
              <SelectTrigger id="bulk-partner-type" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(partnerCategories ?? []).map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                ))}
                {(!partnerCategories || partnerCategories.length === 0) && (
                  <SelectItem value="OTHER">Ostatní</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Kategorie se použije u všech vytvořených partnerů. Můžeš ji u každého
              upravit individuálně v /partners.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button
            onClick={() => onConfirm(partnerType)}
            disabled={isPending || selectedCount === 0}
          >
            Vytvořit {selectedCount} partnerů
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
