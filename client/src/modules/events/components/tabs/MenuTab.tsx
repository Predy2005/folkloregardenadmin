import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { EventMenu } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Textarea } from "@/shared/components/ui/textarea";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useToast } from "@/shared/hooks/use-toast";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

const menuSchema = z.object({
  menuName: z.string().min(1, "Zadejte název jídla"),
  quantity: z.number().min(1, "Zadejte množství"),
  pricePerUnit: z.number().optional(),
  totalPrice: z.number().optional(),
  servingTime: z.string().optional(),
  notes: z.string().optional(),
});

type MenuForm = z.infer<typeof menuSchema>;

export interface MenuTabProps {
  eventId: number;
  menu: EventMenu[];
  isLoading: boolean;
}

export default function MenuTab({ eventId, menu, isLoading }: MenuTabProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventMenu | null>(null);

  const form = useForm<MenuForm>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      menuName: "",
      quantity: 1,
      pricePerUnit: undefined,
      totalPrice: undefined,
      servingTime: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MenuForm) => {
      return await api.post(`/api/events/${eventId}/menu`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Jídlo bylo přidáno" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: MenuForm & { id: number }) => {
      return await api.put(`/api/events/${eventId}/menu/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Jídlo bylo aktualizováno" });
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
      return await api.delete(`/api/events/${eventId}/menu/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Jídlo bylo smazáno" });
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (item: EventMenu) => {
    setEditingItem(item);
    form.reset({
      menuName: item.menuName,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      totalPrice: item.totalPrice,
      servingTime: item.servingTime || "",
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset({
      menuName: "",
      quantity: 1,
      pricePerUnit: undefined,
      totalPrice: undefined,
      servingTime: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: MenuForm) => {
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
        <Button onClick={handleAdd} data-testid="button-add-menu">
          <Plus className="mr-2 h-4 w-4" />
          Přidat jídlo
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název</TableHead>
              <TableHead>Množství</TableHead>
              <TableHead>Cena/ks</TableHead>
              <TableHead>Celkem</TableHead>
              <TableHead>Čas podání</TableHead>
              <TableHead>Poznámky</TableHead>
              <TableHead className="w-24">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {menu.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Zatím nejsou žádná jídla
                </TableCell>
              </TableRow>
            ) : (
              menu.map((item) => (
                <TableRow key={item.id} data-testid={`row-menu-${item.id}`}>
                  <TableCell data-testid={`cell-menu-${item.id}-name`}>{item.menuName}</TableCell>
                  <TableCell data-testid={`cell-menu-${item.id}-quantity`}>{item.quantity}</TableCell>
                  <TableCell data-testid={`cell-menu-${item.id}-price`}>{item.pricePerUnit}</TableCell>
                  <TableCell data-testid={`cell-menu-${item.id}-total`}>{item.totalPrice}</TableCell>
                  <TableCell data-testid={`cell-menu-${item.id}-time`}>{item.servingTime}</TableCell>
                  <TableCell data-testid={`cell-menu-${item.id}-notes`}>{item.notes}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                        data-testid={`button-edit-menu-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(item.id)}
                        data-testid={`button-delete-menu-${item.id}`}
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
            <DialogTitle>{editingItem ? "Upravit jídlo" : "Přidat jídlo"}</DialogTitle>
            <DialogDescription>
              Vyplňte údaje o jídle
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="menuName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-menu-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
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
                          data-testid="input-menu-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          data-testid="input-menu-price"
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
                          data-testid="input-menu-total"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="servingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Čas podání</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} data-testid="input-menu-time" />
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
                      <Textarea {...field} data-testid="textarea-menu-notes" />
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
                  data-testid="button-cancel-menu"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-menu"
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
