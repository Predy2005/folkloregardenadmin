import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { EventVoucher, Voucher } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Textarea } from "@/shared/components/ui/textarea";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

const voucherSchema = z.object({
  voucherId: z.number({
    required_error: "Vyberte voucher",
  }),
  quantity: z.number().min(1, "Zadejte množství"),
  validated: z.boolean().default(false),
  notes: z.string().optional(),
});

type VoucherForm = z.infer<typeof voucherSchema>;

export interface VouchersTabProps {
  eventId: number;
  vouchers: EventVoucher[];
  isLoading: boolean;
}

export default function VouchersTab({ eventId, vouchers, isLoading }: VouchersTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventVoucher | null>(null);

  const { data: availableVouchers } = useQuery<Voucher[]>({
    queryKey: ["/api/vouchers"],
    queryFn: () => api.get("/api/vouchers"),
  });

  const form = useForm<VoucherForm>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      voucherId: 0,
      quantity: 1,
      validated: false,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: VoucherForm) => {
      return await api.post(`/api/events/${eventId}/vouchers`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      successToast("Voucher byl přidán");
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: VoucherForm & { id: number }) => {
      return await api.put(`/api/events/${eventId}/vouchers/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      successToast("Voucher byl aktualizován");
      setDialogOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/events/${eventId}/vouchers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      successToast("Voucher byl odebrán");
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const handleEdit = (item: EventVoucher) => {
    setEditingItem(item);
    form.reset({
      voucherId: item.voucherId,
      quantity: item.quantity,
      validated: item.validated,
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset({
      voucherId: 0,
      quantity: 1,
      validated: false,
      notes: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: VoucherForm) => {
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
        <Button onClick={handleAdd} data-testid="button-add-voucher">
          <Plus className="mr-2 h-4 w-4" />
          Přidat voucher
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kód voucheru</TableHead>
              <TableHead>Množství</TableHead>
              <TableHead>Validován</TableHead>
              <TableHead>Poznámky</TableHead>
              <TableHead className="w-24">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vouchers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Zatím nejsou žádné vouchery
                </TableCell>
              </TableRow>
            ) : (
              vouchers.map((item) => (
                <TableRow key={item.id} data-testid={`row-voucher-${item.id}`}>
                  <TableCell data-testid={`cell-voucher-${item.id}-code`}>
                    {item.voucher?.code || "-"}
                  </TableCell>
                  <TableCell data-testid={`cell-voucher-${item.id}-quantity`}>{item.quantity}</TableCell>
                  <TableCell data-testid={`cell-voucher-${item.id}-validated`}>
                    {item.validated ? "Ano" : "Ne"}
                  </TableCell>
                  <TableCell data-testid={`cell-voucher-${item.id}-notes`}>{item.notes}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                        data-testid={`button-edit-voucher-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(item.id)}
                        data-testid={`button-delete-voucher-${item.id}`}
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
            <DialogTitle>{editingItem ? "Upravit voucher" : "Přidat voucher"}</DialogTitle>
            <DialogDescription>
              Vyplňte údaje o voucheru
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="voucherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voucher *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-voucher">
                          <SelectValue placeholder="Vyberte" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableVouchers?.map((voucher) => (
                          <SelectItem key={voucher.id} value={voucher.id.toString()}>
                            {voucher.code}
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
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Množství *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        data-testid="input-voucher-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validated"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-voucher-validated"
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Validován
                    </FormLabel>
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
                      <Textarea {...field} data-testid="textarea-voucher-notes" />
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
                  data-testid="button-cancel-voucher"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-voucher"
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
