import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { EventBeverage } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Textarea } from "@/shared/components/ui/textarea";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { CurrencySelect } from "@/shared/components/CurrencySelect";

const beverageSchema = z.object({
  beverageName: z.string().min(1, "Zadejte název nápoje"),
  quantity: z.number().min(1, "Zadejte množství"),
  unit: z.string().min(1, "Zadejte jednotku"),
  pricePerUnit: z.number().optional(),
  totalPrice: z.number().optional(),
  notes: z.string().optional(),
});

type BeverageForm = z.infer<typeof beverageSchema>;

export interface BeveragesTabProps {
  eventId: number;
  beverages: EventBeverage[];
  isLoading: boolean;
}

export default function BeveragesTab({ eventId, beverages, isLoading }: BeveragesTabProps) {
  const { defaultCurrency } = useCurrency();
  const [beverageCurrency, setBeverageCurrency] = useState(defaultCurrency);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventBeverage | null>(null);

  const form = useForm<BeverageForm>({
    resolver: zodResolver(beverageSchema),
    defaultValues: {
      beverageName: "",
      quantity: 1,
      unit: "",
      pricePerUnit: undefined,
      totalPrice: undefined,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BeverageForm) => {
      return await api.post(`/api/events/${eventId}/beverages`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "beverages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      successToast("Nápoj byl přidán");
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: BeverageForm & { id: number }) => {
      return await api.put(`/api/events/${eventId}/beverages/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "beverages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      successToast("Nápoj byl aktualizován");
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
      return await api.delete(`/api/events/${eventId}/beverages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "beverages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      successToast("Nápoj byl smazán");
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const handleEdit = (item: EventBeverage) => {
    setEditingItem(item);
    form.reset({
      beverageName: item.beverageName,
      quantity: item.quantity,
      unit: item.unit,
      pricePerUnit: item.pricePerUnit,
      totalPrice: item.totalPrice,
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset({
      beverageName: "",
      quantity: 1,
      unit: "",
      pricePerUnit: undefined,
      totalPrice: undefined,
      notes: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: BeverageForm) => {
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
        <Button onClick={handleAdd} data-testid="button-add-beverage">
          <Plus className="mr-2 h-4 w-4" />
          Přidat nápoj
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název</TableHead>
              <TableHead>Množství</TableHead>
              <TableHead>Jednotka</TableHead>
              <TableHead>Cena/ks</TableHead>
              <TableHead>Celkem</TableHead>
              <TableHead>Poznámky</TableHead>
              <TableHead className="w-24">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {beverages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Zatím nejsou žádné nápoje
                </TableCell>
              </TableRow>
            ) : (
              beverages.map((item) => (
                <TableRow key={item.id} data-testid={`row-beverage-${item.id}`}>
                  <TableCell data-testid={`cell-beverage-${item.id}-name`}>{item.beverageName}</TableCell>
                  <TableCell data-testid={`cell-beverage-${item.id}-quantity`}>{item.quantity}</TableCell>
                  <TableCell data-testid={`cell-beverage-${item.id}-unit`}>{item.unit}</TableCell>
                  <TableCell data-testid={`cell-beverage-${item.id}-price`}>{item.pricePerUnit}</TableCell>
                  <TableCell data-testid={`cell-beverage-${item.id}-total`}>{item.totalPrice}</TableCell>
                  <TableCell data-testid={`cell-beverage-${item.id}-notes`}>{item.notes}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                        data-testid={`button-edit-beverage-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(item.id)}
                        data-testid={`button-delete-beverage-${item.id}`}
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
            <DialogTitle>{editingItem ? "Upravit nápoj" : "Přidat nápoj"}</DialogTitle>
            <DialogDescription>
              Vyplňte údaje o nápoji
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="beverageName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-beverage-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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
                          data-testid="input-beverage-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jednotka *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-beverage-unit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">Měna:</span>
                <CurrencySelect value={beverageCurrency} onChange={setBeverageCurrency} className="w-24" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pricePerUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cena/ks</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          data-testid="input-beverage-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Celkem</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          data-testid="input-beverage-total"
                        />
                      </FormControl>
                      <FormMessage />
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
                      <Textarea {...field} data-testid="textarea-beverage-notes" />
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
                  data-testid="button-cancel-beverage"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-beverage"
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
