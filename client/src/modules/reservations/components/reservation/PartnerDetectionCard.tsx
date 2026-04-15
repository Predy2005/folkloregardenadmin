import React from "react";
import { Button } from "@/shared/components/ui/button";
import type { Partner } from "@shared/types";

interface PartnerDetectionCardProps {
  detectedPartner: Partner;
  onApplyPricing: () => void;
}

export function PartnerDetectionCard({ detectedPartner, onApplyPricing }: PartnerDetectionCardProps) {
  return (
    <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
            Partner detekovan: {detectedPartner.name}
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-300 ml-2">
            ({detectedPartner.pricingModel === 'FLAT' ? 'Jednotna cena' : detectedPartner.pricingModel === 'CUSTOM' ? 'Vlastni ceny' : 'Systemove ceny'})
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={onApplyPricing}>
          Aplikovat partnerske ceny
        </Button>
      </div>
    </div>
  );
}
