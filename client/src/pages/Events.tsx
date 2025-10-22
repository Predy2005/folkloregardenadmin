import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import type { Event } from "@shared/types";
import { EVENT_STATUS_LABELS } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Search, CalendarDays, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import dayjs from "dayjs";

const eventSchema = z.object({
  name: z.string().min(1, "Zadejte název akce"),
  date: z.string().min(1, "Zadejte datum"),
  guestCount: z.number().min(1, "Počet hostů musí být alespoň 1"),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"], {
    required_error: "Vyberte status",
  }),
  notes: z.string().optional(),
});

type EventForm = z.infer<typeof eventSchema>;

export default function Events() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createForm = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      date: dayjs().format("YYYY-MM-DD"),
      guestCount: 1,
      status: "PLANNED",
      notes: "",
    },
  });

  const editForm = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventForm) => {
      return await api.post("/api/events", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Úspěch",
        description: "Akce byla vytvořena",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit akci",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EventForm }) => {
      return await api.put(`/api/events/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsEditOpen(false);
      setEditingEvent(null);
      toast({
        title: "Úspěch",
        description: "Akce byla aktualizována",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat akci",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Úspěch",
        description: "Akce byla smazána",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat akci",
        variant: "destructive",
      });
    },
  });

  const filteredEvents = events?.filter((event) => {
    const matchesSearch = event.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    editForm.reset({
      name: event.name,
      date: dayjs(event.date).format("YYYY-MM-DD"),
      guestCount: event.guestCount,
      status: event.status,
      notes: event.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tuto akci?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleView = (event: Event) => {
    setViewingEvent(event);
    setIsViewOpen(true);
  };

  const getStatusBadgeVariant = (status: Event['status']) => {
    switch (status) {
      case 'PLANNED':
        return 'secondary';
      case 'IN_PROGRESS':
        return 'default';
      case 'COMPLETED':
        return 'default';
      case 'CANCELLED':
        return 'destructive';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Akce</h1>
          <p className="text-muted-foreground">Plánování a správa akcí</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-event"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nová akce
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Akce
              </CardTitle>
              <CardDescription>
                Celkem: {events?.length || 0} akcí
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Všechny stavy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny stavy</SelectItem>
                  <SelectItem value="PLANNED">Plánováno</SelectItem>
                  <SelectItem value="IN_PROGRESS">Probíhá</SelectItem>
                  <SelectItem value="COMPLETED">Dokončeno</SelectItem>
                  <SelectItem value="CANCELLED">Zrušeno</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat akci..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-events"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredEvents && filteredEvents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Počet hostů</TableHead>
                  <TableHead>Personál</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>{dayjs(event.date).format("DD.MM.YYYY")}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{event.guestCount} osob</Badge>
                    </TableCell>
                    <TableCell>
                      {event.staffAssignments?.length || 0} členů
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(event.status)}>
                        {EVENT_STATUS_LABELS[event.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(event)}
                          data-testid={`button-view-${event.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(event)}
                          data-testid={`button-edit-${event.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(event.id)}
                          data-testid={`button-delete-${event.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {search || statusFilter !== "all" ? "Žádné akce nenalezeny" : "Zatím žádné akce"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setEditingEvent(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditOpen ? "Upravit akci" : "Nová akce"}</DialogTitle>
            <DialogDescription>
              {isEditOpen ? "Upravte údaje akce" : "Vytvořte novou akci"}
            </DialogDescription>
          </DialogHeader>
          <Form {...(isEditOpen ? editForm : createForm)}>
            <form
              onSubmit={(isEditOpen ? editForm : createForm).handleSubmit((data) =>
                isEditOpen && editingEvent
                  ? updateMutation.mutate({ id: editingEvent.id, data })
                  : createMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <FormField
                control={(isEditOpen ? editForm : createForm).control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název *</FormLabel>
                    <FormControl>
                      <Input placeholder="Název akce" data-testid="input-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={(isEditOpen ? editForm : createForm).control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datum *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={(isEditOpen ? editForm : createForm).control}
                  name="guestCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Počet hostů *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={(isEditOpen ? editForm : createForm).control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Vyberte status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PLANNED">Plánováno</SelectItem>
                        <SelectItem value="IN_PROGRESS">Probíhá</SelectItem>
                        <SelectItem value="COMPLETED">Dokončeno</SelectItem>
                        <SelectItem value="CANCELLED">Zrušeno</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={(isEditOpen ? editForm : createForm).control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poznámky</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Poznámky k akci" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setIsEditOpen(false);
                    setEditingEvent(null);
                  }}
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Ukládání..."
                    : isEditOpen
                    ? "Uložit"
                    : "Vytvořit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail akce</DialogTitle>
            <DialogDescription>Informace o akci</DialogDescription>
          </DialogHeader>
          {viewingEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-1">Název</h3>
                  <p className="text-muted-foreground">{viewingEvent.name}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Datum</h3>
                  <p className="text-muted-foreground">
                    {dayjs(viewingEvent.date).format("DD.MM.YYYY")}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Počet hostů</h3>
                  <Badge variant="secondary">{viewingEvent.guestCount} osob</Badge>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Status</h3>
                  <Badge variant={getStatusBadgeVariant(viewingEvent.status)}>
                    {EVENT_STATUS_LABELS[viewingEvent.status]}
                  </Badge>
                </div>
              </div>
              {viewingEvent.notes && (
                <div>
                  <h3 className="font-semibold mb-1">Poznámky</h3>
                  <p className="text-muted-foreground">{viewingEvent.notes}</p>
                </div>
              )}
              <div>
                <h3 className="font-semibold mb-2">Přiřazený personál</h3>
                {viewingEvent.staffAssignments && viewingEvent.staffAssignments.length > 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {viewingEvent.staffAssignments.length} členů přiřazeno
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Zatím žádný přiřazený personál</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Menu</h3>
                {viewingEvent.menuItems && viewingEvent.menuItems.length > 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {viewingEvent.menuItems.length} položek menu
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Zatím žádné menu položky</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>Zavřít</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
