import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { invalidateGuestSummary } from "../../hooks/useGuestSummary";

export interface SetGroupCountDialogProps {
  eventId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reservation ID, nebo null pro skupinu "Manuálně přidaní". */
  reservationId: number | null;
  /** Aktuální počty před otevřením. */
  currentAdults: number;
  currentChildren: number;
  /** Volitelný popisek skupiny (např. "Rezervace #123"). */
  groupLabel: string;
}

interface ApiResponse {
  status: string;
  deleted: number;
  created: number;
}

export default function SetGroupCountDialog({
  eventId,
  open,
  onOpenChange,
  reservationId,
  currentAdults,
  currentChildren,
  groupLabel,
}: SetGroupCountDialogProps) {
  const [adults, setAdults] = useState(currentAdults);
  const [children, setChildren] = useState(currentChildren);

  // Reset hodnoty při každém otevření
  useEffect(() => {
    if (open) {
      setAdults(currentAdults);
      setChildren(currentChildren);
    }
  }, [open, currentAdults, currentChildren]);

  const mutation = useMutation<ApiResponse, Error, { targetAdults: number; targetChildren: number }>({
    mutationFn: (payload) =>
      api.post<ApiResponse>(`/api/events/${eventId}/guests/set-group-count`, {
        reservationId,
        ...payload,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      invalidateGuestSummary(eventId);
      const parts: string[] = [];
      if (data.deleted > 0) parts.push(`smazáno ${data.deleted}`);
      if (data.created > 0) parts.push(`přidáno ${data.created}`);
      successToast(parts.length > 0 ? `Hotovo (${parts.join(", ")})` : "Beze změn");
      onOpenChange(false);
    },
    onError: (e) => errorToast(e),
  });

  const adultsDelta = adults - currentAdults;
  const childrenDelta = children - currentChildren;
  const noChange = adultsDelta === 0 && childrenDelta === 0;
  const willDelete = adultsDelta < 0 || childrenDelta < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upravit počet hostů</DialogTitle>
          <DialogDescription>
            {groupLabel} — zadej cílový počet. Systém automaticky přidá nebo smaže hosty.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="set-count-adults">Dospělí</Label>
              <Input
                id="set-count-adults"
                type="number"
                min={0}
                max={500}
                value={adults}
                onChange={(e) => setAdults(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <p className="text-xs text-muted-foreground">
                Aktuálně: {currentAdults}
                {adultsDelta !== 0 && (
                  <span className={adultsDelta < 0 ? "text-red-600" : "text-green-600"}>
                    {" "}({adultsDelta > 0 ? "+" : ""}{adultsDelta})
                  </span>
                )}
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="set-count-children">Děti</Label>
              <Input
                id="set-count-children"
                type="number"
                min={0}
                max={500}
                value={children}
                onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
              />
              <p className="text-xs text-muted-foreground">
                Aktuálně: {currentChildren}
                {childrenDelta !== 0 && (
                  <span className={childrenDelta < 0 ? "text-red-600" : "text-green-600"}>
                    {" "}({childrenDelta > 0 ? "+" : ""}{childrenDelta})
                  </span>
                )}
              </p>
            </div>
          </div>

          {willDelete && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-sm text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                Při zmenšení skupiny se přednostně smažou hosté, kteří <strong>nejsou označení jako přítomní ani placení</strong>.
                Akce je nevratná.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Zrušit
          </Button>
          <Button
            onClick={() => mutation.mutate({ targetAdults: adults, targetChildren: children })}
            disabled={mutation.isPending || noChange}
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Aplikovat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
