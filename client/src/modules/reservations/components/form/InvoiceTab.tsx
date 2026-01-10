import { useFormContext } from 'react-hook-form';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';

export function InvoiceTab() {
  const form = useFormContext();
  const sameAs = form.watch('invoiceSameAsContact');

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="invoiceSameAsContact"
        render={({ field }) => (
          <FormItem className="flex items-center space-x-2">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-invoice-same" />
            </FormControl>
            <FormLabel className="!mt-0">Fakturační údaje stejné jako kontaktní</FormLabel>
          </FormItem>
        )}
      />

      {!sameAs && (
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="invoiceName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jméno</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-invoice-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="invoiceCompany"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Firma</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-invoice-company" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="invoiceIc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IČ</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-invoice-ic" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="invoiceDic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>DIČ</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-invoice-dic" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="invoiceEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} data-testid="input-invoice-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="invoicePhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefon</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-invoice-phone" />
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
