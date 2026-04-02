import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { EventTable } from "@shared/types";
import { EVENT_SPACE_LABELS } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { Loader2, Pencil, Plus, Trash2, LayoutGrid, Map } from "lucide-react";
import FloorPlanEditorManager from "../floor-plan/FloorPlanEditorManager";

const tableSchema = z.object({
  tableName: z.string().min(1, "Zadejte název stolu"),
  room: z.string().min(1, "Vyberte prostor"),
  capacity: z.number().min(1, "Zadejte kapacitu"),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});

type TableForm = z.infer<typeof tableSchema>;

export interface TablesTabProps {
  eventId: number;
  tables: EventTable[];
  isLoading: boolean;
}

export default function TablesTab({ eventId, tables, isLoading }: TablesTabProps) {
  const [viewMode, setViewMode] = useState<"visual" | "list">("visual");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventTable | null>(null);

  const form = useForm<TableForm>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      tableName: "",
      room: "roubenka",
      capacity: 1,
      positionX: undefined,
      positionY: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TableForm) => {
      return await api.post(`/api/events/${eventId}/tables`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      successToast("Stůl byl přidán");
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TableForm & { id: number }) => {
      return await api.put(`/api/events/${eventId}/tables/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      successToast("Stůl byl aktualizován");
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
      return await api.delete(`/api/events/${eventId}/tables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      successToast("Stůl byl smazán");
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const handleEdit = (item: EventTable) => {
    setEditingItem(item);
    form.reset({
      tableName: item.tableName,
      room: item.room,
      capacity: item.capacity,
      positionX: item.positionX ?? undefined,
      positionY: item.positionY ?? undefined,
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset({ tableName: "", room: "roubenka", capacity: 1 });
    setDialogOpen(true);
  };

  const onSubmit = (data: TableForm) => {
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
      {/* View mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "visual" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("visual")}
          >
            <Map className="h-4 w-4 mr-1" />
            Vizuální editor
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Seznam
          </Button>
        </div>
        {viewMode === "list" && (
          <Button onClick={handleAdd} data-testid="button-add-table">
            <Plus className="mr-2 h-4 w-4" />
            Přidat stůl
          </Button>
        )}
      </div>

      {/* Visual floor plan editor */}
      {viewMode === "visual" && (
        <FloorPlanEditorManager eventId={eventId} />
      )}

      {/* List view (original) */}
      {viewMode === "list" && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead>Prostor</TableHead>
                  <TableHead>Tvar</TableHead>
                  <TableHead>Kapacita</TableHead>
                  <TableHead>Pozice</TableHead>
                  <TableHead className="w-24">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Zatím nejsou žádné stoly
                    </TableCell>
                  </TableRow>
                ) : (
                  tables.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.tableName}</TableCell>
                      <TableCell>{EVENT_SPACE_LABELS[item.room] ?? item.room}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.shape === "round" ? "Kulatý" : item.shape === "rectangle" ? "Obdélník" : item.shape ?? "round"}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.capacity}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.positionX != null ? `${item.positionX}, ${item.positionY}` : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)}>
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
                <DialogTitle>{editingItem ? "Upravit stůl" : "Přidat stůl"}</DialogTitle>
                <DialogDescription>Vyplňte údaje o stolu</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tableName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Název *</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="room"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prostor *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {Object.entries(EVENT_SPACE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kapacita *</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {(createMutation.isPending || updateMutation.isPending) ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ukládám...</>
                      ) : editingItem ? "Uložit" : "Přidat"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
