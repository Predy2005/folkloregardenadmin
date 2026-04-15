import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import type { CompanySettings } from "@shared/types";

interface CurrencyContextValue {
  defaultCurrency: string;
  enabledCurrencies: string[];
  isLoaded: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  defaultCurrency: "CZK",
  enabledCurrencies: ["CZK"],
  isLoaded: false,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ["/api/company-settings"],
    queryFn: () => api.get("/api/company-settings"),
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  const value: CurrencyContextValue = {
    defaultCurrency: settings?.defaultCurrency ?? "CZK",
    enabledCurrencies: settings?.enabledCurrencies ?? ["CZK"],
    isLoaded: !!settings,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
