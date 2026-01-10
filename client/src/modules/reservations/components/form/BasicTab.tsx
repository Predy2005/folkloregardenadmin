import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select';

export function BasicTab() {
  const form = useFormContext();
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Datum představení</FormLabel>
            <FormControl>
              <Input type="date" {...field} data-testid="input-date" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="RECEIVED">Přijato</SelectItem>
                <SelectItem value="WAITING_PAYMENT">Čeká na platbu</SelectItem>
                <SelectItem value="PAID">Zaplaceno</SelectItem>
                <SelectItem value="AUTHORIZED">Autorizováno</SelectItem>
                <SelectItem value="CONFIRMED">Potvrzeno</SelectItem>
                <SelectItem value="CANCELLED">Zrušeno</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
