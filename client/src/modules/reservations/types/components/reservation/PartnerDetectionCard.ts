import type { Partner } from "@shared/types";

export interface PartnerDetectionCardProps {
  readonly detectedPartner: Partner;
  readonly onApplyPricing: () => void;
}
