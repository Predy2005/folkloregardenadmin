import { UseFormReturn } from "react-hook-form";
import type { StaffForm } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/shared/components/ui/form";
import { CurrencySelect } from "@/shared/components/CurrencySelect";

interface StaffRatesCardProps {
  form: UseFormReturn<StaffForm>;
  watchIsGroup: boolean;
  defaultCurrency: string;
}

export function StaffRatesCard({ form, watchIsGroup, defaultCurrency }: StaffRatesCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Sazby</CardTitle>
          <CurrencySelect value={defaultCurrency} onChange={() => {}} className="w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!watchIsGroup && (
          <FormField
            control={form.control}
            name="hourlyRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hodinová sazba</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="200"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Částka se automaticky násobí odpracovanými hodinami
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="fixedRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {watchIsGroup ? "Fixní cena za skupinu *" : "Fixní sazba"}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder={watchIsGroup ? "20000" : "1500"}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || "")}
                />
              </FormControl>
              <FormDescription className="text-xs">
                {watchIsGroup
                  ? "Celková částka za celou skupinu / kapelu"
                  : "Fixní částka bez ohledu na hodiny (má přednost před hodinovou)"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
