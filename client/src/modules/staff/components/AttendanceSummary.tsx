import { formatCurrency } from "@/shared/lib/formatting";
import { StatCard } from "@/shared/components";

interface AttendanceSummaryProps {
  totalUnpaidHours: number;
  totalUnpaidAmount: number;
  totalRecords: number;
}

export function AttendanceSummary({
  totalUnpaidHours,
  totalUnpaidAmount,
  totalRecords,
}: AttendanceSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard
        label="Nezaplacené hodiny"
        value={`${totalUnpaidHours.toFixed(1)} h`}
        subtitle={`≈ ${formatCurrency(totalUnpaidAmount)}`}
        variant="danger"
      />
      <StatCard
        label="Celkový počet záznamů"
        value={totalRecords}
      />
    </div>
  );
}
