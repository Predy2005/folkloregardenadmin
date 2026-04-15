import { Users, UserCheck, Wallet, Baby, Car, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { formatCurrency } from "@/shared/lib/formatting";
import type { GuestTypeBreakdown, GuestPresenceStatus, GuestPaymentStatus } from "@shared/types";

interface GuestStatsCardProps {
  types: GuestTypeBreakdown;
  presence: GuestPresenceStatus;
  payments: GuestPaymentStatus;
}

/**
 * Unified guest statistics card
 * Shows all guest-related metrics in a clear, organized way
 */
export function GuestStatsCard({ types, presence, payments }: GuestStatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Hosté
          <Badge variant="secondary" className="ml-auto">
            {types.total} celkem
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Type breakdown */}
        <TypeBreakdownSection types={types} />

        {/* Presence/Check-in */}
        <PresenceSection presence={presence} />

        {/* Payment status */}
        <PaymentSection payments={payments} totalPayingGuests={types.paying} />
      </CardContent>
    </Card>
  );
}

/**
 * Guest type breakdown (platící vs zdarma)
 */
function TypeBreakdownSection({ types }: { types: GuestTypeBreakdown }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Typy hostů</span>
        <span className="font-medium">
          <span className="text-green-600">{types.paying} platících</span>
          {types.free > 0 && (
            <span className="text-orange-500 ml-2">+ {types.free} zdarma</span>
          )}
        </span>
      </div>

      {/* Detailed breakdown */}
      <div className="flex flex-wrap gap-2">
        {types.adults > 0 && (
          <Badge variant="outline" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {types.adults} dospělých
          </Badge>
        )}
        {types.children > 0 && (
          <Badge variant="outline" className="text-xs">
            <Baby className="h-3 w-3 mr-1" />
            {types.children} dětí
          </Badge>
        )}
        {types.drivers > 0 && (
          <Badge variant="outline" className="text-xs bg-orange-50">
            <Car className="h-3 w-3 mr-1" />
            {types.drivers} řidičů
          </Badge>
        )}
        {types.guides > 0 && (
          <Badge variant="outline" className="text-xs bg-orange-50">
            <UserRound className="h-3 w-3 mr-1" />
            {types.guides} průvodců
          </Badge>
        )}
      </div>
    </div>
  );
}

/**
 * Check-in/presence status
 */
function PresenceSection({ presence }: { presence: GuestPresenceStatus }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <UserCheck className="h-4 w-4" />
          Check-in
        </div>
        <span className="font-medium">
          <span className="text-green-600">{presence.present}</span>
          <span className="text-muted-foreground">/{presence.total}</span>
          <span className="text-muted-foreground ml-1">({presence.percentage}%)</span>
        </span>
      </div>

      <Progress
        value={presence.percentage}
        className="h-2"
      />

      {presence.absent > 0 && (
        <p className="text-xs text-muted-foreground">
          Čeká se na {presence.absent} hostů
        </p>
      )}
    </div>
  );
}

/**
 * Payment status from reservations
 */
function PaymentSection({
  payments,
  totalPayingGuests,
}: {
  payments: GuestPaymentStatus;
  totalPayingGuests: number;
}) {
  const paidPercentage = totalPayingGuests > 0
    ? Math.round((payments.guestsPaid / totalPayingGuests) * 100)
    : 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wallet className="h-4 w-4" />
          Platby
        </div>
        <span className="font-medium">
          {formatCurrency(payments.totalPaid)} / {formatCurrency(payments.totalExpected)}
        </span>
      </div>

      {/* Payment progress bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-green-500 transition-all"
          style={{ width: `${paidPercentage}%` }}
        />
      </div>

      {/* Guest payment breakdown */}
      <div className="flex flex-wrap gap-2 text-xs">
        {payments.guestsPaid > 0 && (
          <span className="text-green-600">
            ✓ {payments.guestsPaid} zaplaceno
          </span>
        )}
        {payments.guestsPartial > 0 && (
          <span className="text-yellow-600">
            ◐ {payments.guestsPartial} částečně
          </span>
        )}
        {payments.guestsUnpaid > 0 && (
          <span className="text-red-500">
            ✗ {payments.guestsUnpaid} nezaplaceno
          </span>
        )}
      </div>

      {/* Remaining amount warning */}
      {payments.totalRemaining > 0 && (
        <p className="text-xs text-orange-500 font-medium">
          Zbývá doplatit: {formatCurrency(payments.totalRemaining)}
        </p>
      )}
    </div>
  );
}
