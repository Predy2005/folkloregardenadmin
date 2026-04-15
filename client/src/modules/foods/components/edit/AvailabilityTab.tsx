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
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Edit, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import type { FoodItemAvailability } from "@shared/types";
import dayjs from "dayjs";

const availabilitySchema = z.object({
  dateFrom: z.string().min(1, "Datum od je povinné"),
  dateTo: z.string().optional(),
  available: z.boolean(),
  reason: z.string().optional(),
});

type AvailabilityForm = z.infer<typeof availabilitySchema>;

interface AvailabilityTabProps {
  foodId: number;
}

export function AvailabilityTab({ foodId }: AvailabilityTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<FoodItemAvailability | null>(null);

  const form = useForm<AvailabilityForm>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: { dateFrom: "", dateTo: "", available: false, reason: "" },
  });

  const { data: availabilities } = useQuery<FoodItemAvailability[]>({
    queryKey: ["/api/food-pricing/availability", foodId],
    queryFn: () => api.get<FoodItemAvailability[]>(`/api/food-pricing/availability?foodId=${foodId}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: AvailabilityForm & { reservationFoodId: number }) =>
      api.post("/api/food-pricing/availability", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-pricing/availability", foodId] });
      setIsDialogOpen(false);
      form.reset();
      successToast("Dostupnost byla úspěšně vytvořena");
    },
    onError: () => {
      errorToast("Chyba při vytváření dostupnosti");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AvailabilityForm }) =>
      api.put(`/api/food-pricing/availability/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-pricing/availability", foodId] });
      setIsDialogOpen(false);
      setEditingAvailability(null);
      form.reset();
      successToast("Dostupnost byla úspěšně aktualizována");
    },
    onError: () => {
      errorToast("Chyba při aktualizaci dostupnosti");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/food-pricing/availability/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-pricing/availability", foodId] });
      successToast("Dostupnost byla úspěšně smazána");
    },
    onError: () => {
      errorToast("Chyba při mazání dostupnosti");
    },
  });

  const handleCreate = () => {
    setEditingAvailability(null);
    form.reset({ dateFrom: "", dateTo: "", available: false, reason: "" });
    setIsDialogOpen(true);
  };

  const handleEdit = (availability: FoodItemAvailability) => {
    setEditingAvailability(availability);
    form.reset({
      dateFrom: availability.dateFrom,
      dateTo: availability.dateTo || "",
      available: availability.available,
      reason: availability.reason || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: AvailabilityForm) => {
    if (editingAvailability) {
      updateMutation.mutate({ id: editingAvailability.id, data });
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
              <CardTitle>Dostupnost</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Nastavte dostupnost jídla pro konkrétní dny nebo období
              </p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nové pravidlo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {availabilities && availabilities.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum od</TableHead>
                    <TableHead>Datum do</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead>Důvod</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availabilities.map((availability) => (
                    <TableRow key={availability.id}>
                      <TableCell>{dayjs(availability.dateFrom).format("DD.MM.YYYY")}</TableCell>
                      <TableCell>
                        {availability.dateTo ? dayjs(availability.dateTo).format("DD.MM.YYYY") : "-"}
                      </TableCell>
                      <TableCell>
                        {availability.available ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 text-green-600 px-2 py-1 text-xs font-medium border border-green-500/30">
                            <Eye className="w-3 h-3" />
                            Dostupné
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 text-red-600 px-2 py-1 text-xs font-medium border border-red-500/30">
                            <EyeOff className="w-3 h-3" />
                            Skryté
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {availability.reason || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(availability)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(availability.id)}
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
              Žádná pravidla dostupnosti
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAvailability ? "Upravit dostupnost" : "Nové pravidlo dostupnosti"}
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
                name="available"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Jídlo je dostupné v tomto období</FormLabel>
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
                      <Input {...field} placeholder="Např. Není k dispozici v pátek" />
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
                    : editingAvailability
                    ? "Uložit změny"
                    : "Vytvořit pravidlo"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
