import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { EventStaffAssignment, StaffMember } from "@shared/types";
import { translateStaffRole } from "@modules/staff/utils/staffRoles";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { CurrencySelect } from "@/shared/components/CurrencySelect";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { formatCurrency } from "@/shared/lib/formatting";
import {
  Loader2,
  Banknote,
  Clock,
  DollarSign,
  Info,
  Calculator,
} from "lucide-react";

export interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: EventStaffAssignment | null;
  eventId: number;
  staffMember: StaffMember | undefined;
  eventDurationMinutes?: number;
}

export default function PaymentDialog({
  open,
  onOpenChange,
  assignment,
  eventId,
  staffMember,
  eventDurationMinutes,
}: PaymentDialogProps) {
  const { defaultCurrency } = useCurrency();
  const [hoursWorked, setHoursWorked] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [notes, setNotes] = useState("");

  const hourlyRate = staffMember?.hourlyRate ? parseFloat(String(staffMember.hourlyRate)) : 0;
  const fixedRate = staffMember?.fixedRate ? parseFloat(String(staffMember.fixedRate)) : 0;
  const eventHours = eventDurationMinutes ? Math.round((eventDurationMinutes / 60) * 2) / 2 : 0; // round to 0.5
  const hasFixedRate = fixedRate > 0;
  const hasHourlyRate = hourlyRate > 0;
  const isAlreadyPaid = assignment?.paymentStatus === "PAID";
  const isGroup = staffMember?.isGroup ?? false;
  const groupSize = staffMember?.groupSize;

  // Reset form when assignment changes
  useEffect(() => {
    if (!assignment || !open) return;

    const hours = assignment.hoursWorked || eventHours;
    setHoursWorked(hours);
    setNotes(assignment.notes || "");

    // Pre-fill amount: existing > fixed > hourly * hours
    if (assignment.paymentAmount && assignment.paymentAmount > 0) {
      setPaymentAmount(assignment.paymentAmount);
    } else if (hasFixedRate) {
      setPaymentAmount(fixedRate);
    } else if (hasHourlyRate && hours > 0) {
      setPaymentAmount(hours * hourlyRate);
    } else {
      setPaymentAmount(0);
    }
  }, [assignment, open, eventHours, fixedRate, hourlyRate, hasFixedRate, hasHourlyRate]);

  // Recalculate when hours change (only for hourly rate)
  const recalcFromHours = (newHours: number) => {
    setHoursWorked(newHours);
    if (hasHourlyRate && !hasFixedRate) {
      setPaymentAmount(Math.round(newHours * hourlyRate));
    }
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "staff-assignments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
  };

  // Pay via cashbox endpoint
  const payMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/api/events/${eventId}/staff-assignments/${assignment?.id}/pay`, {
        hoursWorked,
        paymentAmount,
        paymentMethod: "CASH",
      });
    },
    onSuccess: () => {
      invalidateAll();
      successToast("Vyplaceno a zapsáno do kasy eventu");
      onOpenChange(false);
    },
    onError: (error: Error) => errorToast(error),
  });

  // Update without paying (save hours/notes)
  const updateMutation = useMutation({
    mutationFn: async () => {
      return api.put(`/api/events/${eventId}/staff-assignments/${assignment?.id}`, {
        hoursWorked,
        paymentAmount,
        notes,
      });
    },
    onSuccess: () => {
      invalidateAll();
      successToast("Uloženo");
      onOpenChange(false);
    },
    onError: (error: Error) => errorToast(error),
  });

  if (!assignment) return null;

  const staffName = assignment.staffMember
    ? `${assignment.staffMember.firstName} ${assignment.staffMember.lastName}`
    : "Neznámý";

  const isPending = payMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-4 py-3 bg-primary text-primary-foreground">
          <DialogHeader>
            <DialogTitle className="text-primary-foreground text-lg">{staffName}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-1 text-sm opacity-90 flex-wrap">
            {staffMember?.position && (
              <span>{translateStaffRole(staffMember.position)}</span>
            )}
            {isGroup && (
              <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                Skupina{groupSize ? ` (${groupSize} osob)` : ""}
              </Badge>
            )}
            {hasHourlyRate && (
              <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                {formatCurrency(hourlyRate)}/h
              </Badge>
            )}
            {hasFixedRate && (
              <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                Fixní: {formatCurrency(fixedRate)}
              </Badge>
            )}
          </div>
        </div>

        {/* Rate info */}
        <div className="px-4 py-2.5 border-b bg-blue-50 text-blue-700 text-xs flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {isGroup && hasFixedRate ? (
            <span>Skupina s fixní sazbou {formatCurrency(fixedRate)}{groupSize ? ` za ${groupSize} osob` : ""}. Vyplácí se jako celek.</span>
          ) : hasFixedRate ? (
            <span>Fixní sazba {formatCurrency(fixedRate)}. Můžete částku upravit.</span>
          ) : hasHourlyRate ? (
            <span>Hodinová sazba {formatCurrency(hourlyRate)}/h. Délka eventu: {eventHours}h. Částka se přepočítá podle hodin.</span>
          ) : (
            <span>Nemá nastavenou sazbu. Zadejte částku ručně.</span>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Hours */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm">
              <Clock className="h-3.5 w-3.5" />
              Odpracované hodiny
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={hoursWorked}
                onChange={(e) => recalcFromHours(parseFloat(e.target.value) || 0)}
                className="min-h-[44px] text-lg font-mono"
              />
              {eventHours > 0 && hoursWorked !== eventHours && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs h-8"
                  onClick={() => recalcFromHours(eventHours)}
                  title="Nastavit dle délky eventu"
                >
                  <Calculator className="h-3 w-3 mr-1" />
                  {eventHours}h
                </Button>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm">
              <DollarSign className="h-3.5 w-3.5" />
              Částka k vyplacení
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="min-h-[44px] text-lg font-mono"
              />
              <CurrencySelect value={defaultCurrency} onChange={() => {}} className="w-24" />
            </div>
            {/* Quick amount buttons */}
            {hasHourlyRate && !hasFixedRate && (
              <div className="flex gap-1.5 flex-wrap">
                {[eventHours, eventHours + 1, eventHours + 2].filter(h => h > 0).map((h) => (
                  <Button
                    key={h}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => { setHoursWorked(h); setPaymentAmount(Math.round(h * hourlyRate)); }}
                  >
                    {h}h = {formatCurrency(Math.round(h * hourlyRate))}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm">Poznámka</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Volitelná poznámka..."
              className="min-h-[44px]"
            />
          </div>

          {/* Already paid indicator */}
          {isAlreadyPaid && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 text-green-700 text-sm">
              <Banknote className="h-4 w-4" />
              <span>Již vyplaceno: {formatCurrency(assignment.paymentAmount || 0)}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <DialogFooter className="p-4 pt-0 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => updateMutation.mutate()}
            disabled={isPending}
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Uložit bez vyplacení
          </Button>
          <Button
            type="button"
            className="min-h-[48px] bg-green-600 hover:bg-green-700 text-white flex-1"
            onClick={() => payMutation.mutate()}
            disabled={isPending || paymentAmount <= 0}
          >
            {payMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Banknote className="h-5 w-5 mr-2" />
            )}
            Vyplatit {formatCurrency(paymentAmount)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
