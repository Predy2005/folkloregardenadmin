import { useFormContext } from 'react-hook-form';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';

export function TransferTab() {
  const form = useFormContext();
  const transferSelected = form.watch('transferSelected');
  const transferCount = form.watch('transferCount');

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="transferSelected"
        render={({ field }) => (
          <FormItem className="flex items-center space-x-2">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-transfer" />
            </FormControl>
            <FormLabel className="!mt-0">Požaduji transfer (300 Kč/osoba)</FormLabel>
          </FormItem>
        )}
      />

      {transferSelected && (
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="transferCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Počet osob na transfer</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === '' ? 0 : parseInt(value, 10));
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    data-testid="input-transfer-count"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-end">
            <div className="text-sm text-muted-foreground">
              Cena transferu: {(Number(transferCount || 0) * 300).toLocaleString('cs-CZ')} Kč
            </div>
          </div>

          <FormField
            control={form.control}
            name="transferAddress"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Adresa vyzvednutí</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-transfer-address" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
