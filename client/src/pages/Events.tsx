import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import type { Event, Reservation } from "@shared/types";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, EVENT_SPACE_LABELS } from "@shared/types";
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
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Search, CalendarDays, Eye, Users, UtensilsCrossed, ClipboardList, DollarSign, CheckSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import dayjs from "dayjs";

const eventSchema = z.object({
  type: z.enum(["folklorni_show", "svatba", "event", "privat"], {
    required_error: "Vyberte typ akce",
  }),
  name: z.string().min(1, "Zadejte název akce"),
  date: z.string().min(1, "Zadejte datum"),
  space: z.enum(["roubenka", "terasa", "stodolka", "cely_areal"], {
    required_error: "Vyberte prostor",
  }),
  organizerName: z.string().min(1, "Zadejte jméno organizátora"),
  contactPerson: z.string().optional(),
  coordinator: z.string().optional(),
  paidCount: z.number().min(0, "Počet musí být alespoň 0"),
  freeCount: z.number().min(0, "Počet musí být alespoň 0"),
  reservationId: z.number().optional(),
  status: z.enum(["DRAFT", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"], {
    required_error: "Vyberte status",
  }),
  notes: z.string().optional(),
  organizationPlan: z.string().optional(),
  schedule: z.string().optional(),
  cateringNotes: z.string().optional(),
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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: reservations } = useQuery<Reservation[]>({
    queryKey: ["/api/reservations"],
  });

  const createForm = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: "event",
      name: "",
      date: dayjs().format("YYYY-MM-DD"),
      space: "roubenka",
      organizerName: "",
      contactPerson: "",
      coordinator: "",
      paidCount: 0,
      freeCount: 0,
      status: "DRAFT",
      notes: "",
      organizationPlan: "",
      schedule: "",
      cateringNotes: "",
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
    const matchesSearch = event.name.toLowerCase().includes(search.toLowerCase()) ||
      event.organizerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    const matchesType = typeFilter === "all" || event.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    editForm.reset({
      type: event.type,
      name: event.name,
      date: dayjs(event.date).format("YYYY-MM-DD"),
      space: event.space,
      organizerName: event.organizerName,
      contactPerson: event.contactPerson || "",
      coordinator: event.coordinator || "",
      paidCount: event.paidCount,
      freeCount: event.freeCount,
      reservationId: event.reservationId,
      status: event.status,
      notes: event.notes || "",
      organizationPlan: event.organizationPlan || "",
      schedule: event.schedule || "",
      cateringNotes: event.cateringNotes || "",
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
      case 'DRAFT':
        return 'secondary';
      case 'PLANNED':
        return 'default';
      case 'IN_PROGRESS':
        return 'default';
      case 'COMPLETED':
        return 'default';
      case 'CANCELLED':
        return 'destructive';
    }
  };

  const totalGuests = (event: Event) => event.paidCount + event.freeCount;

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
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48" data-testid="select-type-filter">
                  <SelectValue placeholder="Všechny typy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny typy</SelectItem>
                  <SelectItem value="folklorni_show">Folklorní show</SelectItem>
                  <SelectItem value="svatba">Svatba</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="privat">Soukromá akce</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Všechny stavy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny stavy</SelectItem>
                  <SelectItem value="DRAFT">Koncept</SelectItem>
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
                  <TableHead>Typ</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Prostor</TableHead>
                  <TableHead>Organizátor</TableHead>
                  <TableHead>Hosté</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                    <TableCell className="font-medium" data-testid={`text-name-${event.id}`}>
                      {event.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{EVENT_TYPE_LABELS[event.type]}</Badge>
                    </TableCell>
                    <TableCell>{dayjs(event.date).format("DD.MM.YYYY")}</TableCell>
                    <TableCell>{EVENT_SPACE_LABELS[event.space]}</TableCell>
                    <TableCell className="text-sm">{event.organizerName}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{totalGuests(event)} celkem</div>
                        <div className="text-muted-foreground text-xs">
                          {event.paidCount} platících / {event.freeCount} zdarma
                        </div>
                      </div>
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
              {search || statusFilter !== "all" || typeFilter !== "all" 
                ? "Žádné akce nenalezeny" 
                : "Zatím žádné akce"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Form Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setEditingEvent(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Základní údaje</TabsTrigger>
                  <TabsTrigger value="guests">Hosté</TabsTrigger>
                  <TabsTrigger value="plan">Organizační plán</TabsTrigger>
                  <TabsTrigger value="notes">Poznámky</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={(isEditOpen ? editForm : createForm).control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Typ akce *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-type">
                                <SelectValue placeholder="Vyberte typ" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="folklorni_show">Folklorní show</SelectItem>
                              <SelectItem value="svatba">Svatba</SelectItem>
                              <SelectItem value="event">Event</SelectItem>
                              <SelectItem value="privat">Soukromá akce</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={(isEditOpen ? editForm : createForm).control}
                      name="space"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prostor *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-space">
                                <SelectValue placeholder="Vyberte prostor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="roubenka">Roubenka</SelectItem>
                              <SelectItem value="terasa">Terasa</SelectItem>
                              <SelectItem value="stodolka">Stodolka</SelectItem>
                              <SelectItem value="cely_areal">Celý areál</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={(isEditOpen ? editForm : createForm).control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Název akce *</FormLabel>
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
                          <FormLabel>Datum a čas *</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                              <SelectItem value="DRAFT">Koncept</SelectItem>
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
                  </div>

                  <FormField
                    control={(isEditOpen ? editForm : createForm).control}
                    name="organizerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organizátor / Klient *</FormLabel>
                        <FormControl>
                          <Input placeholder="Jméno nebo firma" data-testid="input-organizer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={(isEditOpen ? editForm : createForm).control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kontaktní osoba</FormLabel>
                          <FormControl>
                            <Input placeholder="Jméno + telefon/email" data-testid="input-contact" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={(isEditOpen ? editForm : createForm).control}
                      name="coordinator"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Koordinátor (interní)</FormLabel>
                          <FormControl>
                            <Input placeholder="Odpovědná osoba" data-testid="input-coordinator" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={(isEditOpen ? editForm : createForm).control}
                    name="reservationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Propojit s rezervací</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-reservation">
                              <SelectValue placeholder="Vyberte rezervaci (volitelné)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Bez rezervace</SelectItem>
                            {reservations?.map((reservation) => (
                              <SelectItem key={reservation.id} value={reservation.id.toString()}>
                                Rezervace #{reservation.id} - {reservation.firstName} {reservation.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Pokud je akce vytvořena z rezervace, propojte ji zde
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="guests" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={(isEditOpen ? editForm : createForm).control}
                      name="paidCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Počet platících hostů *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              data-testid="input-paid-count"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={(isEditOpen ? editForm : createForm).control}
                      name="freeCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Počet hostů zdarma *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              data-testid="input-free-count"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="p-4 bg-muted/50 rounded-md">
                    <p className="text-sm font-medium">
                      Celkový počet hostů: {((isEditOpen ? editForm : createForm).watch("paidCount") || 0) + ((isEditOpen ? editForm : createForm).watch("freeCount") || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Doporučený personál se vypočítá automaticky (1 číšník na 25 hostů, 1 kuchař na 50 porcí)
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="plan" className="space-y-4 mt-4">
                  <FormField
                    control={(isEditOpen ? editForm : createForm).control}
                    name="schedule"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Harmonogram akce</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="14:00 - Příjezd hostů&#10;15:00 - Uvítací aperitiv&#10;16:00 - Začátek show&#10;18:00 - Večeře&#10;..." 
                            className="min-h-32"
                            data-testid="input-schedule"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Časový rozvrh akce - co se děje a kdy
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={(isEditOpen ? editForm : createForm).control}
                    name="organizationPlan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organizační plán</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Detailní instrukce pro personál, technické požadavky, speciální přání klienta..." 
                            className="min-h-32"
                            data-testid="input-organization-plan"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Podrobné pokyny pro tým
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={(isEditOpen ? editForm : createForm).control}
                    name="cateringNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poznámky k cateringu</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Dodavatelé, speciální požadavky na jídlo, alergie..." 
                            className="min-h-24"
                            data-testid="input-catering-notes"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="notes" className="space-y-4 mt-4">
                  <FormField
                    control={(isEditOpen ? editForm : createForm).control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poznámky</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Obecné poznámky k akci" 
                            className="min-h-48"
                            data-testid="input-notes"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setIsEditOpen(false);
                    setEditingEvent(null);
                  }}
                  data-testid="button-cancel"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                  data-testid="button-submit"
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail akce</DialogTitle>
            <DialogDescription>Kompletní informace o akci</DialogDescription>
          </DialogHeader>
          {viewingEvent && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="info">Informace</TabsTrigger>
                <TabsTrigger value="guests">Hosté</TabsTrigger>
                <TabsTrigger value="staff">Personál</TabsTrigger>
                <TabsTrigger value="menu">Menu</TabsTrigger>
                <TabsTrigger value="plan">Plán</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-1">Typ akce</h3>
                    <Badge variant="secondary">{EVENT_TYPE_LABELS[viewingEvent.type]}</Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Prostor</h3>
                    <p className="text-muted-foreground">{EVENT_SPACE_LABELS[viewingEvent.space]}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Datum</h3>
                    <p className="text-muted-foreground">
                      {dayjs(viewingEvent.date).format("DD.MM.YYYY HH:mm")}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Status</h3>
                    <Badge variant={getStatusBadgeVariant(viewingEvent.status)}>
                      {EVENT_STATUS_LABELS[viewingEvent.status]}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Organizátor</h3>
                    <p className="text-muted-foreground">{viewingEvent.organizerName}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Kontakt</h3>
                    <p className="text-muted-foreground">{viewingEvent.contactPerson || "-"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Koordinátor</h3>
                    <p className="text-muted-foreground">{viewingEvent.coordinator || "-"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Rezervace</h3>
                    <p className="text-muted-foreground">
                      {viewingEvent.reservationId ? `#${viewingEvent.reservationId}` : "Bez rezervace"}
                    </p>
                  </div>
                </div>
                {viewingEvent.notes && (
                  <div>
                    <h3 className="font-semibold mb-1">Poznámky</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{viewingEvent.notes}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="guests" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Přehled hostů
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-md">
                        <p className="text-3xl font-bold">{totalGuests(viewingEvent)}</p>
                        <p className="text-sm text-muted-foreground">Celkem</p>
                      </div>
                      <div className="text-center p-4 bg-green-500/10 rounded-md">
                        <p className="text-3xl font-bold text-green-600">{viewingEvent.paidCount}</p>
                        <p className="text-sm text-muted-foreground">Platící</p>
                      </div>
                      <div className="text-center p-4 bg-blue-500/10 rounded-md">
                        <p className="text-3xl font-bold text-blue-600">{viewingEvent.freeCount}</p>
                        <p className="text-sm text-muted-foreground">Zdarma</p>
                      </div>
                    </div>
                    {viewingEvent.tables && viewingEvent.tables.length > 0 ? (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Rozvržení stolů</h4>
                        <div className="text-sm text-muted-foreground">
                          {viewingEvent.tables.length} stolů připraveno
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 text-center text-sm text-muted-foreground">
                        Rozvržení stolů zatím není vytvořeno
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="staff" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Přiřazený personál
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {viewingEvent.staffAssignments && viewingEvent.staffAssignments.length > 0 ? (
                      <div className="space-y-2">
                        {viewingEvent.staffAssignments.map((assignment) => (
                          <div key={assignment.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="font-medium">
                              {assignment.staffMember 
                                ? `${assignment.staffMember.firstName} ${assignment.staffMember.lastName}`
                                : `Staff ID: ${assignment.staffMemberId}`}
                            </span>
                            <Badge variant="secondary">{assignment.role}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Zatím žádný přiřazený personál
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="menu" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UtensilsCrossed className="w-5 h-5" />
                      Menu
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {viewingEvent.menuItems && viewingEvent.menuItems.length > 0 ? (
                      <div className="space-y-2">
                        {viewingEvent.menuItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="font-medium">{item.name}</span>
                            <Badge variant="secondary">{item.quantity}x</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Zatím žádné menu položky
                      </p>
                    )}
                    {viewingEvent.cateringNotes && (
                      <div className="mt-4 p-3 bg-amber-500/10 rounded-md">
                        <h4 className="font-semibold text-sm mb-1">Poznámky k cateringu</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {viewingEvent.cateringNotes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="plan" className="space-y-4 mt-4">
                {viewingEvent.schedule && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" />
                        Harmonogram
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {viewingEvent.schedule}
                      </pre>
                    </CardContent>
                  </Card>
                )}
                {viewingEvent.organizationPlan && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" />
                        Organizační plán
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {viewingEvent.organizationPlan}
                      </pre>
                    </CardContent>
                  </Card>
                )}
                {!viewingEvent.schedule && !viewingEvent.organizationPlan && (
                  <div className="text-center py-8 text-muted-foreground">
                    Organizační plán a harmonogram zatím nebyly vytvořeny
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)} data-testid="button-close">
              Zavřít
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
