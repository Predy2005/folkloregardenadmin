import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/shared/components/ui/form";
import { getCurrencySymbol } from "@/shared/lib/formatting";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { CurrencySelect } from "@/shared/components/CurrencySelect";
import { DollarSign, Plus } from "lucide-react";
import { z } from "zod";

export const foodSchema = z.object({
  name: z.string().min(1, "Název je povinný"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Cena musí být kladné číslo"),
  surcharge: z.coerce.number().min(0, "Příplatek musí být kladné číslo"),
  isChildrenMenu: z.boolean().default(false),
  externalId: z.string().optional(),
});

export type FoodForm = z.infer<typeof foodSchema>;

interface BasicInfoTabProps {
  form: UseFormReturn<FoodForm>;
}

export function BasicInfoTab({ form }: BasicInfoTabProps) {
  const { defaultCurrency } = useCurrency();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Základní informace</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název jídla *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Např. Speciální menu - Kachna" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="externalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Externí ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ID z externího systému" />
                    </FormControl>
                    <FormDescription>
                      ID pro propojení s externím rezervačním systémem
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Popis</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Popis jídla, alergeny, ingredience..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-muted-foreground">Měna cen:</span>
              <CurrencySelect value={defaultCurrency} onChange={() => {}} className="w-24" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Základní cena
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {getCurrencySymbol(defaultCurrency)}
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Cena jídla pokud se prodává samostatně
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surcharge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Příplatek
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {getCurrencySymbol(defaultCurrency)}
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {`Příplatek k základní ceně rezervace (0 = v ceně, 75 = +75 ${getCurrencySymbol(defaultCurrency)} k ceně)`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isChildrenMenu"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-3 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Dětské menu</FormLabel>
                    <FormDescription>
                      Označí toto jídlo jako dětské menu
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
