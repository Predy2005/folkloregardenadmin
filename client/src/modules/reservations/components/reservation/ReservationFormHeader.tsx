import React from "react";
import { Button } from "@/shared/components/ui/button";
import { CurrencySelect } from "@/shared/components/CurrencySelect";
import { formatCurrency } from "@/shared/lib/formatting";

interface ReservationFormHeaderProps {
  isEdit: boolean;
  reservationId: number | null;
  reservationCount: number;
  grandTotalPrice: number;
  currency: string;
  isSubmitting: boolean;
  onNavigateBack: () => void;
  onSubmitSingle: () => void;
  onSubmitAll: () => void;
}

export function ReservationFormHeader({
  isEdit,
  reservationId,
  reservationCount,
  grandTotalPrice,
  currency,
  isSubmitting,
  onNavigateBack,
  onSubmitSingle,
  onSubmitAll,
}: ReservationFormHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">
            {isEdit ? `Upravit rezervaci #${reservationId}` : "Nová rezervace"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {reservationCount > 1
              ? `${reservationCount} rezervací, celkem ${formatCurrency(grandTotalPrice, currency)}`
              : isEdit
                ? "Úprava existující rezervace"
                : "Vytvoření nové rezervace"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onNavigateBack}>
            Zpět na seznam
          </Button>
          {reservationCount === 1 ? (
            <Button onClick={onSubmitSingle} disabled={isSubmitting}>
              {isSubmitting ? "Ukládám…" : isEdit ? "Uložit změny" : "Vytvořit"}
            </Button>
          ) : (
            <Button onClick={onSubmitAll} disabled={isSubmitting}>
              {isSubmitting
                ? "Ukládám…"
                : `Vytvořit vše (${reservationCount})`}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

interface CurrencyHeaderProps {
  currency: string;
  onCurrencyChange: (currency: string) => void;
}

export function CurrencyHeader({ currency, onCurrencyChange }: CurrencyHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Měna:</span>
      <CurrencySelect
        value={currency}
        onChange={onCurrencyChange}
        className="w-28"
      />
    </div>
  );
}
