import { Wallet, AlertCircle } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { InfoTooltip } from "@/shared/components/ui/info-tooltip";

interface ReservationPaymentInfoProps {
  status: "PAID" | "PARTIAL" | "UNPAID";
  percentage: number;
}

export function ReservationPaymentInfo({
  status,
  percentage,
}: ReservationPaymentInfoProps) {
  const tooltipContent = {
    PAID: "Rezervace je plně uhrazena",
    PARTIAL: `Uhrazeno ${Math.round(percentage * 100)}% z celkové částky`,
    UNPAID: "Rezervace dosud nebyla uhrazena",
  };

  const badge = (() => {
    switch (status) {
      case "PAID":
        return (
          <Badge className="bg-green-500 text-white text-[10px] py-0 px-1.5 cursor-help">
            <Wallet className="h-3 w-3 mr-0.5" />
            Zaplaceno
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge className="bg-yellow-500 text-white text-[10px] py-0 px-1.5 cursor-help">
            <Wallet className="h-3 w-3 mr-0.5" />
            {Math.round(percentage * 100)}%
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-500 text-white text-[10px] py-0 px-1.5 cursor-help">
            <AlertCircle className="h-3 w-3 mr-0.5" />
            Nezaplaceno
          </Badge>
        );
    }
  })();

  return (
    <InfoTooltip content={tooltipContent[status]}>
      {badge}
    </InfoTooltip>
  );
}
