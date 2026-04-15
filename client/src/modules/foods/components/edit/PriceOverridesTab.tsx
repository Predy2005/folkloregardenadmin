import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { formatCurrency, getCurrencySymbol } from "@/shared/lib/formatting";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { Edit, Plus, Trash2 } from "lucide-react";
import type { FoodItemPriceOverride } from "@shared/types";
import dayjs from "dayjs";

const priceOverrideSchema = z.object({
  dateFrom: z.string().min(1, "Datum od je povinné"),
  dateTo: z.string().optional(),
  price: z.coerce.number().min(0, "Cena musí být alespoň 0"),
  reason: z.string().optional(),
});

type PriceOverrideForm = z.infer<typeof priceOverrideSchema>;

interface PriceOverridesTabProps {
  foodId: number;
}

export function PriceOverridesTab({ foodId }: PriceOverridesTabProps) {
  const { defaultCurrency } = useCurrency();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<FoodItemPriceOverride | null>(null);

  const form = useForm<PriceOverrideForm>({
    resolver: zodResolver(priceOverrideSchema),
    defaultValues: { dateFrom: "", dateTo: "", price: 0, reason: "" },
  });

  const { data: priceOverrides } = useQuery<FoodItemPriceOverride[]>({
    queryKey: ["/api/food-pricing/overrides", foodId],
    queryFn: () => api.get<FoodItemPriceOverride[]>(`/api/food-pricing/overrides?foodId=${foodId}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: PriceOverrideForm & { reservationFoodId: number }) =>
      api.post("/api/food-pricing/overrides", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-pricing/overrides", foodId] });
      setIsDialogOpen(false);
      form.reset();
      successToast("Cenový přepis byl úspěšně vytvořen");
    },
    onError: () => {
      errorToast("Chyba při vytváření cenového přepisu");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PriceOverrideForm }) =>
      api.put(`/api/food-pricing/overrides/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-pricing/overrides", foodId] });
      setIsDialogOpen(false);
      setEditingOverride(null);
      form.reset();
      successToast("Cenový přepis byl úspěšně aktualizován");
    },
    onError: () => {
      errorToast("Chyba při aktualizaci cenového přepisu");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/food-pricing/overrides/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-pricing/overrides", foodId] });
      successToast("Cenový přepis byl úspěšně smazán");
    },
    onError: () => {
      errorToast("Chyba při mazání cenového přepisu");
    },
  });

  const handleCreate = () => {
    setEditingOverride(null);
    form.reset({ dateFrom: "", dateTo: "", price: 0, reason: "" });
    setIsDialogOpen(true);
  };

  const handleEdit = (override: FoodItemPriceOverride) => {
    setEditingOverride(override);
    form.reset({
      dateFrom: override.dateFrom,
      dateTo: override.dateTo || "",
      price: override.price,
      reason: override.reason || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: PriceOverrideForm) => {
    if (editingOverride) {
      updateMutation.mutate({ id: editingOverride.id, data });
    } else {
      createMutation.mutate({ ...data, reservationFoodId: foodId });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cenové přepisy</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Nastavte speciální ceny pro konkrétní dny nebo období
              </p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nový přepis
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {priceOverrides && priceOverrides.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum od</TableHead>
                    <TableHead>Datum do</TableHead>
                    <TableHead>Cena</TableHead>
                    <TableHead>Důvod</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceOverrides.map((override) => (
                    <TableRow key={override.id}>
                      <TableCell>{dayjs(override.dateFrom).format("DD.MM.YYYY")}</TableCell>
                      <TableCell>
                        {override.dateTo ? dayjs(override.dateTo).format("DD.MM.YYYY") : "-"}
                      </TableCell>
                      <TableCell className="font-mono font-medium">{formatCurrency(override.price)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {override.reason || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(override)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(override.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-md">
              Žádné cenové přepisy
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOverride ? "Upravit cenový přepis" : "Nový cenový přepis"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="dateFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum od</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum do (volitelné)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cena</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {getCurrencySymbol(defaultCurrency)}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Důvod (volitelné)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Např. Vánoce - Premium datum" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Ukládání..."
                    : editingOverride
                    ? "Uložit změny"
                    : "Vytvořit přepis"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
