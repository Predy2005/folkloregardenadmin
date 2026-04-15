import { useFormContext } from 'react-hook-form';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { FormField, FormItem, FormLabel, FormControl } from '@/shared/components/ui/form';
import { Button } from '@/shared/components/ui/button';
import { DialogFooter } from '@/shared/components/ui/dialog';
import { formatCurrency } from '@/shared/lib/formatting';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import type { ReservationFormFooterProps } from '@modules/reservations/types/components/form/ReservationFormFooter';

export function ReservationFormFooter({ totalPrice, currency, onCancel, saving, editing }: ReservationFormFooterProps) {
  const form = useFormContext();
  const { defaultCurrency } = useCurrency();
  const cur = currency ?? defaultCurrency;
  return (
    <div className="space-y-4 border-t pt-4">
      <FormField
        control={form.control}
        name="agreement"
        render={({ field }) => (
          <FormItem className="flex items-center space-x-2">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-agreement" />
            </FormControl>
            <FormLabel className="!mt-0">Souhlasím se zpracováním osobních údajů a VOP</FormLabel>
          </FormItem>
        )}
      />

      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md">
        <span className="text-lg font-semibold">Celková cena:</span>
        <span className="text-2xl font-bold font-mono text-primary">
          {formatCurrency(Math.round(totalPrice), cur)}
        </span>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-reservation">
          Zrušit
        </Button>
        <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90" data-testid="button-save-reservation">
          {saving ? 'Ukládání...' : editing ? 'Uložit změny' : 'Vytvořit rezervaci'}
        </Button>
      </DialogFooter>
    </div>
  );
}
