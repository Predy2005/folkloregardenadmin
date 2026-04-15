import { z } from "zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { EventGuest } from "@shared/types";
import { GUEST_TYPE_LABELS } from "./constants";
import { NationalityInput } from "@/shared/components/NationalityInput";
import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Loader2 } from "lucide-react";

const guestSchema = z.object({
  firstName: z.string().min(1, "Zadejte jméno"),
  lastName: z.string().optional(),
  nationality: z.string().optional(),
  type: z.enum(["adult", "child", "infant", "driver", "guide"], {
    required_error: "Vyberte typ",
  }),
  isPaid: z.boolean().default(true),
  isPresent: z.boolean().default(false),
  notes: z.string().optional(),
});

export type GuestForm = z.infer<typeof guestSchema>;

export interface GuestFormDialogProps {
  eventId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGuest: EventGuest | null;
}

export default function GuestFormDialog({
  eventId,
  open,
  onOpenChange,
  editingGuest,
}: GuestFormDialogProps) {
  const form = useForm<GuestForm>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      nationality: "",
      type: "adult",
      isPaid: true,
      isPresent: false,
      notes: "",
    },
  });

  // Reset form when editing guest changes or dialog opens
  useEffect(() => {
    if (open) {
      if (editingGuest) {
        form.reset({
          firstName: editingGuest.firstName || "",
          lastName: editingGuest.lastName || "",
          nationality: editingGuest.nationality || "",
          type: editingGuest.type as "adult" | "child" | "infant" | "driver" | "guide",
          isPaid: editingGuest.isPaid,
          isPresent: editingGuest.isPresent,
          notes: editingGuest.notes || "",
        });
      } else {
        form.reset({
          firstName: "",
          lastName: "",
          nationality: "",
          type: "adult",
          isPaid: true,
          isPresent: false,
          notes: "",
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingGuest]);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: GuestForm) => {
      return await api.post(`/api/events/${eventId}/guests`, data);
    },
    onSuccess: () => {
      invalidateQueries();
      successToast("Host byl přidán");
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: GuestForm & { id: number }) => {
      return await api.put(`/api/events/${eventId}/guests/${data.id}`, data);
    },
    onSuccess: () => {
      invalidateQueries();
      successToast("Host byl aktualizován");
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const onSubmit = (data: GuestForm) => {
    if (editingGuest) {
      updateMutation.mutate({ ...data, id: editingGuest.id });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingGuest ? "Upravit hosta" : "Přidat hosta"}</DialogTitle>
          <DialogDescription>Vyplňte údaje o hostovi</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jméno *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Příjmení</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte typ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(GUEST_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Národnost</FormLabel>
                    <FormControl>
                      <NationalityInput
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPaid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Platící host</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPresent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Přítomen</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poznámky</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Zrušit
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ukládám...
                  </>
                ) : editingGuest ? (
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
  );
}
