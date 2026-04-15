import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/PageHeader";
import { CurrencySelect } from "@/shared/components/CurrencySelect";
import { formatCurrency } from "@/shared/lib/formatting";
import type {
  ReservationFormHeaderProps,
  CurrencyHeaderProps,
} from "@modules/reservations/types/components/reservation/ReservationFormHeader";

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
  let subtitle: string;
  if (reservationCount > 1) {
    subtitle = `${reservationCount} rezervací, celkem ${formatCurrency(grandTotalPrice, currency)}`;
  } else if (isEdit) {
    subtitle = "Úprava existující rezervace";
  } else {
    subtitle = "Vytvoření nové rezervace";
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onNavigateBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <PageHeader
          title={isEdit ? `Upravit rezervaci #${reservationId}` : "Nová rezervace"}
          description={subtitle}
        />
      </div>
      <div className="flex gap-2">
        {reservationCount === 1 ? (
          <>
            {isEdit && (
              <Button
                variant="secondary"
                onClick={() => onSubmitSingle({ stayOnPage: true })}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Ukládám…" : "Uložit"}
              </Button>
            )}
            <Button onClick={() => onSubmitSingle()} disabled={isSubmitting}>
              {isSubmitting
                ? "Ukládám…"
                : isEdit
                  ? "Uložit a zpět na seznam"
                  : "Vytvořit"}
            </Button>
          </>
        ) : (
          <Button onClick={onSubmitAll} disabled={isSubmitting}>
            {isSubmitting
              ? "Ukládám…"
              : `Vytvořit vše (${reservationCount})`}
          </Button>
        )}
      </div>
    </div>
  );
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
