import { UseFormReturn } from "react-hook-form";
import type { ReservationFood } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import {
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { CurrencySelect } from "@/shared/components/CurrencySelect";
import type { PartnerForm } from "../edit/types";

interface PricingCardProps {
  form: UseFormReturn<PartnerForm>;
  pricingModel: string;
  defaultCurrency: string;
  foods: ReservationFood[] | undefined;
  customPricesLocal: Record<string, string>;
  onCustomPriceChange: (key: string, value: string) => void;
}

export function PricingCard({
  form,
  pricingModel,
  defaultCurrency,
  foods,
  customPricesLocal,
  onCustomPriceChange,
}: PricingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cenotvorba</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="pricingModel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cenovy model</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte cenovy model" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="DEFAULT">Systemove ceny</SelectItem>
                  <SelectItem value="FLAT">Jednotna cena</SelectItem>
                  <SelectItem value="CUSTOM">Vlastni ceny dle menu</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {pricingModel === "DEFAULT" && (
          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            Pouzivaji se systemove ceny. Zadne specialni nastaveni neni potreba.
          </div>
        )}

        {pricingModel === "FLAT" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-sm flex-1">
                Jednotna cena pro vsechny rezervace tohoto partnera.
              </div>
              <CurrencySelect value={defaultCurrency} onChange={() => {}} className="w-24 ml-3" />
            </div>
            <FormField
              control={form.control}
              name="flatPriceAdult"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dospely</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="flatPriceChild"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dite</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="flatPriceInfant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Miminko</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {pricingModel === "CUSTOM" && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
              Nastavte vlastni ceny pro kazde menu. Prazdne pole = systemova cena.
            </div>
            {foods && foods.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Menu</TableHead>
                    <TableHead>Systemova cena</TableHead>
                    <TableHead>Partnerska cena</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {foods.map((food) => {
                    const key = String(food.id);
                    return (
                      <TableRow key={food.id}>
                        <TableCell className="font-medium">{food.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {food.price} Kc
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Systemova cena"
                            className="w-32"
                            value={customPricesLocal[key] ?? ""}
                            onChange={(e) => onCustomPriceChange(key, e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-sm text-muted-foreground">Nacitani polozek menu...</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
