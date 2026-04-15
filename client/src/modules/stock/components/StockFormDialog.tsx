import type { StockItem } from "@shared/types";
import { STOCK_UNIT_LABELS } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { AutocompleteInput, type Suggestion } from "@/shared/components/AutocompleteInput";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import type { stockItemSchema } from "../pages/StockItemsPage";

type StockItemForm = z.infer<typeof stockItemSchema>;

interface StockFormDialogProps {
  isOpen: boolean;
  isEditing: boolean;
  editingItem: StockItem | null;
  form: UseFormReturn<StockItemForm>;
  isPending: boolean;
  currency: string;
  setCurrency: (val: string) => void;
  ingredientSuggestions: Suggestion[];
  supplierSuggestions: Suggestion[];
  ingredientUnitMap: Map<string, string>;
  onClose: () => void;
  onSubmit: (data: StockItemForm) => void;
}

export function StockFormDialog({
  isOpen,
  isEditing,
  form,
  isPending,
  currency,
  setCurrency,
  ingredientSuggestions,
  supplierSuggestions,
  ingredientUnitMap,
  onClose,
  onSubmit,
}: StockFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Upravit skladovou položku" : "Nová skladová položka"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Upravte detaily skladové položky" : "Přidejte novou položku do skladu"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Název *</FormLabel>
                  <FormControl>
                    <AutocompleteInput
                      value={field.value}
                      onChange={(val) => field.onChange(val)}
                      suggestions={ingredientSuggestions}
                      placeholder={isEditing ? "Název položky" : "Např. Mouka hladká"}
                      data-testid="input-name"
                      onSelect={(s) => {
                        const unit = ingredientUnitMap.get(s.value);
                        if (unit) form.setValue("unit", unit);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Popis</FormLabel>
                  <FormControl>
                    <Input placeholder="Popis položky" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jednotka *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-unit">
                          <SelectValue placeholder="Vyberte jednotku" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(STOCK_UNIT_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantityAvailable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Množství skladem *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimální zásoba</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder=""
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pricePerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cena za jednotku</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder=""
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <CurrencySelect value={currency} onChange={setCurrency} className="w-24" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dodavatel</FormLabel>
                  <FormControl>
                    <AutocompleteInput
                      value={field.value ?? ""}
                      onChange={(val) => field.onChange(val)}
                      suggestions={supplierSuggestions}
                      placeholder="Název dodavatele"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Zrušit
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {isEditing
                  ? (isPending ? "Ukládání..." : "Uložit")
                  : (isPending ? "Vytváření..." : "Vytvořit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
