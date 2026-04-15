import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { getCurrencySymbol } from "@/shared/lib/formatting";

interface CurrencySelectProps {
  value: string;
  onChange: (currency: string) => void;
  className?: string;
}

const FALLBACK_CURRENCIES = ["CZK", "EUR", "USD", "GBP"];

export function CurrencySelect({ value, onChange, className }: CurrencySelectProps) {
  const { enabledCurrencies, isLoaded } = useCurrency();

  // Use enabled currencies from settings, or fallback to all common currencies
  const currencies = isLoaded && enabledCurrencies.length > 0 ? enabledCurrencies : FALLBACK_CURRENCIES;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-24"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((code) => (
          <SelectItem key={code} value={code}>
            {getCurrencySymbol(code)} {code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
