import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import type { CashMovementItem } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { api } from "@/shared/lib/api";
import { invalidateCashboxQueries } from "@/shared/lib/query-helpers";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { CategoryCombobox } from "@/shared/components/CategoryCombobox";

interface EditMovementDialogProps {
  movement: CashMovementItem | null;
  onClose: () => void;
}

export function EditMovementDialog({ movement, onClose }: EditMovementDialogProps) {
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    if (movement) {
      setEditAmount(movement.amount);
      setEditCategory(movement.category || "");
      setEditDescription(movement.description || "");
    }
  }, [movement]);

  const editMovementMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, string | number> }) =>
      api.put(`/api/cashbox/main/movement/${id}`, data),
    onSuccess: () => {
      invalidateCashboxQueries();
      onClose();
      successToast("Pohyb upraven");
    },
    onError: (e: Error) => errorToast(e),
  });

  return (
    <Dialog open={!!movement} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upravit pohyb</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Částka</Label>
            <Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
          </div>
          <div>
            <Label>Kategorie</Label>
            <CategoryCombobox
              value={editCategory}
              onChange={setEditCategory}
              type={movement?.movementType === "INCOME" ? "INCOME" : "EXPENSE"}
              placeholder="Vyberte nebo napište..."
            />
          </div>
          <div>
            <Label>Popis</Label>
            <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Zrušit</Button>
          <Button
            onClick={() => {
              if (movement) {
                editMovementMutation.mutate({
                  id: movement.id,
                  data: { amount: editAmount, category: editCategory, description: editDescription },
                });
              }
            }}
            disabled={editMovementMutation.isPending}
          >
            {editMovementMutation.isPending ? "Ukládám..." : "Uložit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
