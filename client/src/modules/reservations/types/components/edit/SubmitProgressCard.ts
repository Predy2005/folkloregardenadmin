export interface SubmitResult {
  readonly success: boolean;
  readonly date: string;
  readonly error?: string;
}

export interface SubmitProgressCardProps {
  readonly isSubmitting: boolean;
  readonly submitProgress: number;
  readonly submitResults: readonly SubmitResult[];
  readonly reservationCount: number;
}
