// Props for ReservationFormHeader component
export interface ReservationFormHeaderProps {
  readonly isEdit: boolean;
  readonly reservationId: number | null;
  readonly reservationCount: number;
  readonly grandTotalPrice: number;
  readonly currency: string;
  readonly isSubmitting: boolean;
  readonly onNavigateBack: () => void;
  readonly onSubmitSingle: (options?: { stayOnPage?: boolean }) => void;
  readonly onSubmitAll: () => void;
}

// Props for CurrencyHeader component
export interface CurrencyHeaderProps {
  readonly currency: string;
  readonly onCurrencyChange: (currency: string) => void;
}
