import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { EventScheduleItem } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Textarea } from "@/shared/components/ui/textarea";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

const scheduleSchema = z.object({
  timeSlot: z.string().min(1, "Zadejte čas"),
  durationMinutes: z.number().min(1, "Zadejte dobu trvání"),
  activity: z.string().min(1, "Zadejte aktivitu"),
  description: z.string().optional(),
  responsibleStaffId: z.number().optional(),
  notes: z.string().optional(),
});

type ScheduleForm = z.infer<typeof scheduleSchema>;

export interface ScheduleTabProps {
  eventId: number;
  schedule: EventScheduleItem[];
  isLoading: boolean;
}

export default function ScheduleTab({ eventId, schedule, isLoading }: ScheduleTabProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventScheduleItem | null>(null);

  const form = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      timeSlot: "",
      durationMinutes: 30,
      activity: "",
      description: "",
      responsibleStaffId: undefined,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ScheduleForm) => {
      return await api.post(`/api/events/${eventId}/schedule`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Položka harmonogramu byla přidána" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ScheduleForm & { id: number }) => {
      return await api.put(`/api/events/${eventId}/schedule/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Položka harmonogramu byla aktualizována" });
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
      return await api.delete(`/api/events/${eventId}/schedule/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Položka harmonogramu byla smazána" });
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (item: EventScheduleItem) => {
    setEditingItem(item);
    form.reset({
      timeSlot: item.timeSlot,
      durationMinutes: item.durationMinutes,
      activity: item.activity,
      description: item.description || "",
      responsibleStaffId: item.responsibleStaffId,
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset({
      timeSlot: "",
      durationMinutes: 30,
      activity: "",
      description: "",
      responsibleStaffId: undefined,
      notes: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: ScheduleForm) => {
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
        <Button onClick={handleAdd} data-testid="button-add-schedule">
          <Plus className="mr-2 h-4 w-4" />
          Přidat položku
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Čas</TableHead>
              <TableHead>Délka (min)</TableHead>
              <TableHead>Aktivita</TableHead>
              <TableHead>Popis</TableHead>
              <TableHead>Poznámky</TableHead>
              <TableHead className="w-24">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Zatím nejsou žádné položky harmonogramu
                </TableCell>
              </TableRow>
            ) : (
              schedule.map((item) => (
                <TableRow key={item.id} data-testid={`row-schedule-${item.id}`}>
                  <TableCell data-testid={`cell-schedule-${item.id}-time`}>{item.timeSlot}</TableCell>
                  <TableCell data-testid={`cell-schedule-${item.id}-duration`}>{item.durationMinutes}</TableCell>
                  <TableCell data-testid={`cell-schedule-${item.id}-activity`}>{item.activity}</TableCell>
                  <TableCell data-testid={`cell-schedule-${item.id}-description`}>{item.description}</TableCell>
                  <TableCell data-testid={`cell-schedule-${item.id}-notes`}>{item.notes}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                        data-testid={`button-edit-schedule-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(item.id)}
                        data-testid={`button-delete-schedule-${item.id}`}
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
            <DialogTitle>{editingItem ? "Upravit položku" : "Přidat položku"}</DialogTitle>
            <DialogDescription>
              Vyplňte údaje o položce harmonogramu
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="timeSlot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Čas *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-schedule-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Délka (min) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-schedule-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="activity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aktivita *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-schedule-activity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Popis</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="textarea-schedule-description" />
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
                      <Textarea {...field} data-testid="textarea-schedule-notes" />
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
                  data-testid="button-cancel-schedule"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-schedule"
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
