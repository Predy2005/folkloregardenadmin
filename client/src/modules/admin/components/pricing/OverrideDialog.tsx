import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { getCurrencySymbol } from "@/shared/lib/formatting";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/shared/components/ui/form";
import type { UseFormReturn } from "react-hook-form";

interface DateOverrideForm {
  date: string;
  adultPrice: number;
  childPrice: number;
  infantPrice: number;
  includeMeal: boolean;
  reason?: string;
}

interface OverrideDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isEditing: boolean;
  form: UseFormReturn<DateOverrideForm>;
  defaultCurrency: string;
  isPending: boolean;
  onSubmit: (data: DateOverrideForm) => void;
  onClose: () => void;
}

export function OverrideDialog({
  isOpen,
  setIsOpen,
  isEditing,
  form,
  defaultCurrency,
  isPending,
  onSubmit,
  onClose,
}: OverrideDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Upravit cenový přepis' : 'Nový cenový přepis'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datum</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-override-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Důvod (volitelné)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="např. Premium datum, Vánoce..."
                      {...field}
                      data-testid="input-override-reason"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="adultPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dospělí</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-override-adult-price"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {getCurrencySymbol(defaultCurrency)}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="childPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Děti 3-12</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-override-child-price"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {getCurrencySymbol(defaultCurrency)}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="infantPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batolata</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-override-infant-price"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {getCurrencySymbol(defaultCurrency)}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="includeMeal"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-override-include-meal"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Cena zahrnuje jídlo
                    </FormLabel>
                    <FormDescription>
                      Pokud je zaškrtnuto, uvedená cena již zahrnuje jídlo.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-override"
              >
                Zrušit
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary hover:bg-primary/90"
                data-testid="button-submit-override"
              >
                {isPending
                  ? 'Ukládání...'
                  : isEditing
                  ? 'Uložit změny'
                  : 'Vytvořit'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
