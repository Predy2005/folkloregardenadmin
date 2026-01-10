import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { EventStaffAssignment, StaffMember } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Textarea } from "@/shared/components/ui/textarea";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

const staffAssignmentSchema = z.object({
  staffMemberId: z.number({
    required_error: "Vyberte člena personálu",
  }),
  assignmentStatus: z.string().min(1, "Zadejte status přiřazení"),
  attendanceStatus: z.string().min(1, "Zadejte status docházky"),
  hoursWorked: z.number().min(0, "Počet hodin musí být alespoň 0").default(0),
  paymentAmount: z.number().optional(),
  paymentStatus: z.string().min(1, "Zadejte status platby"),
  notes: z.string().optional(),
});

type StaffAssignmentForm = z.infer<typeof staffAssignmentSchema>;

export interface StaffTabProps {
  eventId: number;
  staffAssignments: EventStaffAssignment[];
  staffMembers: StaffMember[];
  isLoading: boolean;
}

export default function StaffTab({ eventId, staffAssignments, staffMembers, isLoading }: StaffTabProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventStaffAssignment | null>(null);

  const form = useForm<StaffAssignmentForm>({
    resolver: zodResolver(staffAssignmentSchema),
    defaultValues: {
      staffMemberId: 0,
      assignmentStatus: "ASSIGNED",
      attendanceStatus: "PENDING",
      hoursWorked: 0,
      paymentAmount: undefined,
      paymentStatus: "PENDING",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: StaffAssignmentForm) => {
      return await api.post(`/api/events/${eventId}/staff-assignments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Personál byl přidán" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: StaffAssignmentForm & { id: number }) => {
      return await api.put(`/api/events/${eventId}/staff-assignments/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Personál byl aktualizován" });
      setDialogOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/events/${eventId}/staff-assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Personál byl odebrán" });
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (item: EventStaffAssignment) => {
    setEditingItem(item);
    form.reset({
      staffMemberId: item.staffMemberId,
      assignmentStatus: item.assignmentStatus,
      attendanceStatus: item.attendanceStatus,
      hoursWorked: item.hoursWorked,
      paymentAmount: item.paymentAmount,
      paymentStatus: item.paymentStatus,
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset({
      staffMemberId: 0,
      assignmentStatus: "ASSIGNED",
      attendanceStatus: "PENDING",
      hoursWorked: 0,
      paymentAmount: undefined,
      paymentStatus: "PENDING",
      notes: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: StaffAssignmentForm) => {
    if (editingItem) {
      updateMutation.mutate({ ...data, id: editingItem.id });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAdd} data-testid="button-add-staff">
          <Plus className="mr-2 h-4 w-4" />
          Přidat personál
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jméno</TableHead>
              <TableHead>Pozice</TableHead>
              <TableHead>Status přiřazení</TableHead>
              <TableHead>Status docházky</TableHead>
              <TableHead>Hodiny</TableHead>
              <TableHead>Částka</TableHead>
              <TableHead>Status platby</TableHead>
              <TableHead className="w-24">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffAssignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Zatím není přiřazen žádný personál
                </TableCell>
              </TableRow>
            ) : (
              staffAssignments.map((item) => (
                <TableRow key={item.id} data-testid={`row-staff-${item.id}`}>
                  <TableCell data-testid={`cell-staff-${item.id}-name`}>
                    {item.staffMember ? `${item.staffMember.firstName} ${item.staffMember.lastName}` : "-"}
                  </TableCell>
                  <TableCell data-testid={`cell-staff-${item.id}-position`}>
                    {item.staffMember?.position || "-"}
                  </TableCell>
                  <TableCell data-testid={`cell-staff-${item.id}-assignment`}>
                    {item.assignmentStatus}
                  </TableCell>
                  <TableCell data-testid={`cell-staff-${item.id}-attendance`}>
                    {item.attendanceStatus}
                  </TableCell>
                  <TableCell data-testid={`cell-staff-${item.id}-hours`}>{item.hoursWorked}</TableCell>
                  <TableCell data-testid={`cell-staff-${item.id}-amount`}>{item.paymentAmount}</TableCell>
                  <TableCell data-testid={`cell-staff-${item.id}-payment`}>{item.paymentStatus}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                        data-testid={`button-edit-staff-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(item.id)}
                        data-testid={`button-delete-staff-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Upravit personál" : "Přidat personál"}</DialogTitle>
            <DialogDescription>
              Vyplňte údaje o přiřazení personálu
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="staffMemberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Člen personálu *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-staff-member">
                          <SelectValue placeholder="Vyberte" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffMembers
                          .filter((m) => m.isActive)
                          .map((member) => (
                            <SelectItem key={member.id} value={member.id.toString()}>
                              {member.firstName} {member.lastName}
                              {member.position && ` (${member.position})`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assignmentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status přiřazení *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-assignment-status" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attendanceStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status docházky *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-attendance-status" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hoursWorked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Odpracované hodiny</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-hours-worked"
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
                      <FormLabel>Částka</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          data-testid="input-payment-amount"
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
                    <FormLabel>Status platby *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-payment-status" />
                    </FormControl>
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
                      <Textarea {...field} data-testid="textarea-staff-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-staff"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-staff"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ukládám...
                    </>
                  ) : editingItem ? (
                    "Uložit"
                  ) : (
                    "Přidat"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
