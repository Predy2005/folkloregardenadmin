import type { DrinkItem, ReservationFood } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

export interface PairingFormData {
  foodId: string;
  drinkId: string;
  isDefault: boolean;
  isIncludedInPrice: boolean;
  surcharge: string;
}

interface PairingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  form: PairingFormData;
  setForm: (form: PairingFormData) => void;
  foods?: ReservationFood[];
  drinks?: DrinkItem[];
  onSubmit: () => void;
  isPending: boolean;
}

export function PairingDialog({
  isOpen,
  onOpenChange,
  form,
  setForm,
  foods,
  drinks,
  onSubmit,
  isPending,
}: PairingDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{"Pridat propojeni jidlo \u2194 napoj"}</DialogTitle>
          <DialogDescription>
            Vyberte jidlo a napoj pro propojeni
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Jidlo</Label>
            <Select
              value={form.foodId}
              onValueChange={(v) => setForm({ ...form, foodId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vyberte jidlo" />
              </SelectTrigger>
              <SelectContent>
                {foods?.map((food) => (
                  <SelectItem key={food.id} value={food.id.toString()}>
                    {food.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Napoj</Label>
            <Select
              value={form.drinkId}
              onValueChange={(v) => setForm({ ...form, drinkId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vyberte napoj" />
              </SelectTrigger>
              <SelectContent>
                {drinks?.filter((d) => d.isActive).map((drink) => (
                  <SelectItem key={drink.id} value={drink.id.toString()}>
                    {drink.name} ({drink.price} Kc)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="pairing-isDefault"
                checked={form.isDefault}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isDefault: !!checked })
                }
              />
              <Label htmlFor="pairing-isDefault">Vychozi</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pairing-isIncludedInPrice"
                checked={form.isIncludedInPrice}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isIncludedInPrice: !!checked })
                }
              />
              <Label htmlFor="pairing-isIncludedInPrice">V cene</Label>
            </div>
          </div>
          <div>
            <Label>Priplatek (Kc)</Label>
            <Input
              type="number"
              value={form.surcharge}
              onChange={(e) => setForm({ ...form, surcharge: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrusit
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!form.foodId || !form.drinkId || isPending}
          >
            Vytvorit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
