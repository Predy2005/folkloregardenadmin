import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { EventStaffAssignment, StaffMember } from "@shared/types";
import { translateStaffRole } from "@modules/staff/utils/staffRoles";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { formatCurrency } from "@/shared/lib/formatting";
import { Loader2 } from "lucide-react";

const paymentSchema = z.object({
  hoursWorked: z.number().min(0, "Počet hodin musí být alespoň 0"),
  paymentAmount: z.number().min(0, "Částka musí být alespoň 0"),
  paymentStatus: z.string().min(1, "Zadejte status platby"),
  notes: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

export interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: EventStaffAssignment | null;
  eventId: number;
  staffMember: StaffMember | undefined;
}

export default function PaymentDialog({
  open,
  onOpenChange,
  assignment,
  eventId,
  staffMember,
}: PaymentDialogProps) {
  const hourlyRate = staffMember?.hourlyRate ? parseFloat(String(staffMember.hourlyRate)) : 0;

  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      hoursWorked: assignment?.hoursWorked || 0,
      paymentAmount: assignment?.paymentAmount || 0,
      paymentStatus: assignment?.paymentStatus || "PENDING",
      notes: assignment?.notes || "",
    },
  });

  // Update form when assignment changes
  useMemo(() => {
    if (assignment) {
      form.reset({
        hoursWorked: assignment.hoursWorked || 0,
        paymentAmount: assignment.paymentAmount || 0,
        paymentStatus: assignment.paymentStatus || "PENDING",
        notes: assignment.notes || "",
      });
    }
  }, [assignment, form]);

  // Calculate payment when hours change
  const hoursWorked = form.watch("hoursWorked");
  useMemo(() => {
    if (hourlyRate > 0 && hoursWorked > 0) {
      const calculated = hoursWorked * hourlyRate;
      const currentAmount = form.getValues("paymentAmount");
      if (currentAmount === 0 || currentAmount === (assignment?.hoursWorked || 0) * hourlyRate) {
        form.setValue("paymentAmount", calculated);
      }
    }
  }, [hoursWorked, hourlyRate, form, assignment]);

  const updateMutation = useMutation({
    mutationFn: async (data: PaymentForm) => {
      return api.put(`/api/events/${eventId}/staff-assignments/${assignment?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
      successToast("Platba aktualizována");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const onSubmit = (data: PaymentForm) => {
    updateMutation.mutate(data);
  };

  if (!assignment) return null;

  const staffName = assignment.staffMember
    ? `${assignment.staffMember.firstName} ${assignment.staffMember.lastName}`
    : "Neznámý";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Platba - {staffName}</DialogTitle>
          <DialogDescription>
            {staffMember?.position && translateStaffRole(staffMember.position)}
            {hourlyRate > 0 && ` • ${formatCurrency(hourlyRate)}/h`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hoursWorked"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hodiny</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Částka (Kč)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paymentStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PENDING">Čeká</SelectItem>
                      <SelectItem value="PAID">Vyplaceno</SelectItem>
                      <SelectItem value="CANCELLED">Zrušeno</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poznámky</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Zrušit
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Uložit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
