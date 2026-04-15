import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import type { CompanySettings } from "@shared/types";

interface CurrencySettingsTabProps {
  formData: Partial<CompanySettings>;
  handleChange: (field: keyof CompanySettings, value: string | number | boolean | string[] | undefined) => void;
}

const ALL_CURRENCIES = [
  { code: "CZK", name: "Česká koruna", symbol: "Kč" },
  { code: "EUR", name: "Euro", symbol: "\u20AC" },
  { code: "USD", name: "Americký dolar", symbol: "$" },
  { code: "GBP", name: "Britská libra", symbol: "\u00A3" },
];

export function CurrencySettingsTab({ formData, handleChange }: CurrencySettingsTabProps) {
  const enabledCurrencies = formData.enabledCurrencies ?? ["CZK"];
  const defaultCurrency = formData.defaultCurrency ?? "CZK";

  const toggleCurrency = (code: string, checked: boolean) => {
    const current = new Set(enabledCurrencies);
    if (checked) {
      current.add(code);
    } else {
      // Can't disable the default currency
      if (code === defaultCurrency) return;
      current.delete(code);
    }
    handleChange("enabledCurrencies", Array.from(current));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Měny</CardTitle>
        <CardDescription>Nastavení podporovaných měn a výchozí měny systému</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Výchozí měna</Label>
          <Select
            value={defaultCurrency}
            onValueChange={(v) => {
              handleChange("defaultCurrency", v);
              // Ensure default currency is always enabled
              if (!enabledCurrencies.includes(v)) {
                handleChange("enabledCurrencies", [...enabledCurrencies, v]);
              }
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_CURRENCIES.filter((c) => enabledCurrencies.includes(c.code)).map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Tato měna se použije jako výchozí pro nové rezervace, faktury a pokladní operace.
          </p>
        </div>

        <div className="space-y-3">
          <Label>Povolené měny</Label>
          <div className="grid grid-cols-2 gap-3">
            {ALL_CURRENCIES.map((c) => {
              const isEnabled = enabledCurrencies.includes(c.code);
              const isDefault = c.code === defaultCurrency;
              return (
                <label
                  key={c.code}
                  className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50"
                >
                  <Checkbox
                    checked={isEnabled}
                    disabled={isDefault}
                    onCheckedChange={(checked) => toggleCurrency(c.code, !!checked)}
                  />
                  <div>
                    <div className="font-medium">
                      {c.symbol} {c.code}
                    </div>
                    <div className="text-sm text-muted-foreground">{c.name}</div>
                  </div>
                  {isDefault && (
                    <span className="ml-auto text-xs text-primary font-medium">Výchozí</span>
                  )}
                </label>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            Povolené měny budou dostupné při vytváření rezervací, faktur a v pokladně.
            Výchozí měnu nelze zakázat.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
