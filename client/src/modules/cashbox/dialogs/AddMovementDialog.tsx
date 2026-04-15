import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { api } from "@/shared/lib/api";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { CurrencySelect } from "@/shared/components/CurrencySelect";
import { invalidateCashboxQueries } from "@/shared/lib/query-helpers";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { CategoryCombobox } from "@/shared/components/CategoryCombobox";

interface AddMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMovementDialog({ open, onOpenChange }: AddMovementDialogProps) {
  const [movementType, setMovementType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const { defaultCurrency } = useCurrency();
  const [movementCurrency, setMovementCurrency] = useState(defaultCurrency);

  const addMovementMutation = useMutation({
    mutationFn: (data: { movementType: string; amount: string; category: string; description: string }) =>
      api.post("/api/cashbox/main/movement", data),
    onSuccess: () => {
      invalidateCashboxQueries();
      successToast("Pohyb přidán");
      onOpenChange(false);
      setAmount(""); setDescription(""); setCategory("");
    },
    onError: (e: Error) => errorToast(e),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Přidat pohyb</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Typ</Label>
              <Select value={movementType} onValueChange={(v) => setMovementType(v as "INCOME" | "EXPENSE")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Příjem</SelectItem>
                  <SelectItem value="EXPENSE">Výdaj</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kategorie</Label>
              <CategoryCombobox
                value={category}
                onChange={setCategory}
                type={movementType}
                placeholder="Vyberte nebo napište..."
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label>Částka</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
              />
            </div>
            <div>
              <Label>Měna</Label>
              <CurrencySelect value={movementCurrency} onChange={setMovementCurrency} className="w-24" />
            </div>
          </div>
          <div>
            <Label>Popis</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Popis pohybu"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button
            onClick={() => {
              if (!amount || parseFloat(amount) <= 0) return;
              addMovementMutation.mutate({
                movementType,
                amount,
                category,
                description,
              });
            }}
            disabled={addMovementMutation.isPending}
          >
            {addMovementMutation.isPending ? "Ukládání..." : "Přidat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
