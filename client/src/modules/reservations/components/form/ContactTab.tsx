import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';

export function ContactTab() {
  const form = useFormContext();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="contactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jméno</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-contact-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contactEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} data-testid="input-contact-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contactPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefon</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-contact-phone" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contactNationality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Národnost</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-contact-nationality" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clientComeFrom"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Odkud jste se o nás dozvěděli? (volitelné)</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-client-come-from" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contactNote"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Poznámka (volitelná)</FormLabel>
              <FormControl>
                <Textarea {...field} data-testid="input-contact-note" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
