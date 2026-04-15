import type { DrinkItem, DrinkCategory } from "@shared/types";
import { DRINK_CATEGORY_LABELS } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Textarea } from "@/shared/components/ui/textarea";
import { CurrencySelect } from "@/shared/components/CurrencySelect";
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

const CATEGORIES: DrinkCategory[] = ["BEER", "WINE", "SPIRIT", "SOFT", "COCKTAIL", "OTHER"];

export interface DrinkFormData {
  name: string;
  category: DrinkCategory;
  price: string;
  isAlcoholic: boolean;
  isActive: boolean;
  description: string;
}

interface DrinkDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingDrink: DrinkItem | null;
  form: DrinkFormData;
  setForm: (form: DrinkFormData) => void;
  currency: string;
  setCurrency: (val: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function DrinkDialog({
  isOpen,
  onOpenChange,
  editingDrink,
  form,
  setForm,
  currency,
  setCurrency,
  onSubmit,
  isPending,
}: DrinkDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingDrink ? "Upravit napoj" : "Novy napoj"}</DialogTitle>
          <DialogDescription>
            {editingDrink ? "Uprav udaje o napoji" : "Vyplnte udaje pro novy napoj"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nazev *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nazev napoje"
            />
          </div>
          <div>
            <Label>Kategorie</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v as DrinkCategory })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {DRINK_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cena</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0"
              />
              <CurrencySelect value={currency} onChange={setCurrency} className="w-24" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isAlcoholic"
                checked={form.isAlcoholic}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isAlcoholic: !!checked })
                }
              />
              <Label htmlFor="isAlcoholic">Alkoholicky</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isActive: !!checked })
                }
              />
              <Label htmlFor="isActive">Aktivni</Label>
            </div>
          </div>
          <div>
            <Label>Popis</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Volitelny popis"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrusit
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!form.name.trim() || isPending}
          >
            {editingDrink ? "Ulozit" : "Vytvorit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
