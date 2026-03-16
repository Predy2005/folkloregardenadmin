import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Users } from "lucide-react";

interface FloorPlanToolbarProps {
  totalComputed: number;
  totalManual: number;
  paidCount: number;
  freeCount: number;
  onImportGuests: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function FloorPlanToolbar({
  totalComputed,
  totalManual,
  paidCount,
  freeCount,
  onImportGuests,
  onSave,
  isSaving,
}: FloorPlanToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h3 className="font-semibold">Správa plánku stolů</h3>
        <div className="text-sm text-muted-foreground flex items-center gap-4">
          <span>
            Celkem hostů: <strong>{totalComputed}</strong>
          </span>
          {totalComputed !== totalManual && (
            <Badge variant="outline" className="text-xs">
              Manuální korekce: {totalManual} ({paidCount} platících + {freeCount} zdarma)
            </Badge>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onImportGuests}
          data-testid="button-import-guests"
        >
          <Users className="w-4 h-4 mr-2" />
          Importovat hosty z rezervací
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-save-floorplan"
        >
          {isSaving ? "Ukládání..." : "Uložit plánek"}
        </Button>
      </div>
    </div>
  );
}
