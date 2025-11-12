import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Event, EventSpace, StaffMember, EventGuest, EventStaffAssignment } from "@shared/types";
import { EVENT_TYPE_LABELS } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, ChevronsUpDown, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";

const eventSchema = z.object({
  type: z.enum(["folklorni_show", "svatba", "event", "privat"], {
    required_error: "Vyberte typ akce",
  }),
  name: z.string().min(1, "Zadejte název akce"),
  date: z.string().min(1, "Zadejte datum"),
  spaces: z
    .array(z.enum(["roubenka", "terasa", "stodolka", "cely_areal"]))
    .min(1, "Vyberte alespoň jeden prostor"),
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

const guestSchema = z.object({
  name: z.string().min(1, "Zadejte jméno hosta"),
  type: z.enum(["adult", "child"], {
    required_error: "Vyberte typ",
  }),
  nationality: z.string().optional(),
  isPaid: z.boolean().default(false),
  isPresent: z.boolean().default(false),
  notes: z.string().optional(),
  eventTableId: z.number().optional(),
  menuItemId: z.number().optional(),
});

const staffAssignmentSchema = z.object({
  staffMemberId: z.number({
    required_error: "Vyberte člena personálu",
  }),
  role: z.string().min(1, "Zadejte roli"),
});

type EventForm = z.infer<typeof eventSchema>;
type GuestForm = z.infer<typeof guestSchema>;
type StaffAssignmentForm = z.infer<typeof staffAssignmentSchema>;

export default function EventEdit() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/events/:id/edit");
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");

  const eventId = params?.id ? parseInt(params.id) : null;

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const { data: staffMembers } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff-members"],
  });

  const { data: guests, isLoading: guestsLoading } = useQuery<EventGuest[]>({
    queryKey: ["/api/events", eventId, "guests"],
    enabled: !!eventId && activeTab === "guests",
  });

  const { data: staffAssignments, isLoading: staffAssignmentsLoading } = useQuery<EventStaffAssignment[]>({
    queryKey: ["/api/events", eventId, "staff-assignments"],
    enabled: !!eventId && activeTab === "staff",
  });

  if (!eventId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Chyba</CardTitle>
            <CardDescription>ID události nebylo nalezeno</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (eventLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Událost nenalezena</CardTitle>
            <CardDescription>Událost s ID {eventId} neexistuje</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/events")}
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zpět na seznam
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editace události</CardTitle>
          <CardDescription>{event.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3" data-testid="tabs-list">
              <TabsTrigger value="info" data-testid="tab-trigger-info">
                Základní informace
              </TabsTrigger>
              <TabsTrigger value="guests" data-testid="tab-trigger-guests">
                Hosté
              </TabsTrigger>
              <TabsTrigger value="staff" data-testid="tab-trigger-staff">
                Personál
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-6">
              <BasicInfoTab
                event={event}
                eventId={eventId}
                staffMembers={staffMembers || []}
                onSuccess={() => setLocation("/events")}
              />
            </TabsContent>

            <TabsContent value="guests" className="mt-6">
              <GuestsTab
                eventId={eventId}
                guests={guests || []}
                isLoading={guestsLoading}
              />
            </TabsContent>

            <TabsContent value="staff" className="mt-6">
              <StaffTab
                eventId={eventId}
                staffAssignments={staffAssignments || []}
                staffMembers={staffMembers || []}
                isLoading={staffAssignmentsLoading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface BasicInfoTabProps {
  event: Event;
  eventId: number;
  staffMembers: StaffMember[];
  onSuccess: () => void;
}

function BasicInfoTab({ event, eventId, staffMembers, onSuccess }: BasicInfoTabProps) {
  const { toast } = useToast();
  const [contactPersonOpen, setContactPersonOpen] = useState(false);
  const [coordinatorOpen, setCoordinatorOpen] = useState(false);
  const [userEditedName, setUserEditedName] = useState(false);

  const activeStaffMembers = staffMembers.filter((member) => member.active);

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: event.type,
      name: event.name,
      date: event.date,
      spaces: event.spaces,
      organizerName: event.organizerName,
      contactPerson: event.contactPerson || "",
      coordinator: event.coordinator || "",
      paidCount: event.paidCount,
      freeCount: event.freeCount,
      status: event.status,
      notes: event.notes || "",
      organizationPlan: event.organizationPlan || "",
      schedule: event.schedule || "",
      cateringNotes: event.cateringNotes || "",
    },
  });

  useEffect(() => {
    if (event) {
      form.reset({
        type: event.type,
        name: event.name,
        date: event.date,
        spaces: event.spaces,
        organizerName: event.organizerName,
        contactPerson: event.contactPerson || "",
        coordinator: event.coordinator || "",
        paidCount: event.paidCount,
        freeCount: event.freeCount,
        status: event.status,
        notes: event.notes || "",
        organizationPlan: event.organizationPlan || "",
        schedule: event.schedule || "",
        cateringNotes: event.cateringNotes || "",
      });
    }
  }, [event, form]);

  const updateEventMutation = useMutation({
    mutationFn: async (data: EventForm) => {
      return await apiRequest("PUT", `/api/events/${eventId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({
        title: "Úspěch",
        description: "Událost byla úspěšně aktualizována",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se aktualizovat událost",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventForm) => {
    const paidCount = typeof data.paidCount === "string" ? parseInt(data.paidCount) : data.paidCount;
    const freeCount = typeof data.freeCount === "string" ? parseInt(data.freeCount) : data.freeCount;

    updateEventMutation.mutate({
      ...data,
      paidCount,
      freeCount,
    });
  };

  useEffect(() => {
    if (!userEditedName) {
      const subscription = form.watch((value, { name: fieldName }) => {
        if (fieldName === "type" || fieldName === "date") {
          const type = value.type;
          const date = value.date;
          if (type && date) {
            const typeLabel = EVENT_TYPE_LABELS[type as Event["type"]];
            const formattedDate = dayjs(date).format("DD.MM.YYYY");
            const autoName = `${typeLabel} - ${formattedDate}`;
            form.setValue("name", autoName);
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [form, userEditedName]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
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
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Datum *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Název akce *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    setUserEditedName(true);
                  }}
                  data-testid="input-name"
                />
              </FormControl>
              <FormDescription>
                Název se automaticky generuje z typu a data
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="spaces"
          render={() => (
            <FormItem>
              <FormLabel>Prostory *</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "roubenka", label: "Roubenka" },
                  { value: "terasa", label: "Terasa" },
                  { value: "stodolka", label: "Stodolka" },
                  { value: "cely_areal", label: "Celý areál" },
                ].map((space) => (
                  <FormField
                    key={space.value}
                    control={form.control}
                    name="spaces"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(space.value as EventSpace)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              const updated = checked
                                ? [...current, space.value as EventSpace]
                                : current.filter((v) => v !== space.value);
                              field.onChange(updated);
                            }}
                            data-testid={`checkbox-space-${space.value}`}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          {space.label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="organizerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organizátor *</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-organizer" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Kontaktní osoba</FormLabel>
                <Popover open={contactPersonOpen} onOpenChange={setContactPersonOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-contact-person"
                      >
                        {field.value || "Vyberte kontaktní osobu"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Hledat..." />
                      <CommandList>
                        <CommandEmpty>Nenalezeno</CommandEmpty>
                        <CommandGroup>
                          {activeStaffMembers.map((staff) => (
                            <CommandItem
                              key={staff.id}
                              value={`${staff.firstName} ${staff.lastName}`}
                              onSelect={() => {
                                form.setValue(
                                  "contactPerson",
                                  `${staff.firstName} ${staff.lastName}`
                                );
                                setContactPersonOpen(false);
                              }}
                              data-testid={`option-contact-${staff.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === `${staff.firstName} ${staff.lastName}`
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {staff.firstName} {staff.lastName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="coordinator"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Koordinátor</FormLabel>
                <Popover open={coordinatorOpen} onOpenChange={setCoordinatorOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-coordinator"
                      >
                        {field.value || "Vyberte koordinátora"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Hledat..." />
                      <CommandList>
                        <CommandEmpty>Nenalezeno</CommandEmpty>
                        <CommandGroup>
                          {activeStaffMembers.map((staff) => (
                            <CommandItem
                              key={staff.id}
                              value={`${staff.firstName} ${staff.lastName}`}
                              onSelect={() => {
                                form.setValue(
                                  "coordinator",
                                  `${staff.firstName} ${staff.lastName}`
                                );
                                setCoordinatorOpen(false);
                              }}
                              data-testid={`option-coordinator-${staff.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === `${staff.firstName} ${staff.lastName}`
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {staff.firstName} {staff.lastName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="paidCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Počet platících</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-paid-count"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="freeCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Počet zdarma</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-free-count"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
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

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Poznámky</FormLabel>
              <FormControl>
                <Textarea {...field} data-testid="textarea-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="organizationPlan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organizační plán</FormLabel>
              <FormControl>
                <Textarea {...field} data-testid="textarea-organization-plan" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="schedule"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Časový harmonogram</FormLabel>
              <FormControl>
                <Textarea {...field} data-testid="textarea-schedule" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cateringNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Poznámky ke cateringu</FormLabel>
              <FormControl>
                <Textarea {...field} data-testid="textarea-catering-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={updateEventMutation.isPending}
            data-testid="button-save"
          >
            {updateEventMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Uložit změny
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface GuestsTabProps {
  eventId: number;
  guests: EventGuest[];
  isLoading: boolean;
}

function GuestsTab({ eventId, guests, isLoading }: GuestsTabProps) {
  const { toast } = useToast();
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<EventGuest | null>(null);

  const guestForm = useForm<GuestForm>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      name: "",
      type: "adult",
      nationality: "",
      isPaid: false,
      isPresent: false,
      notes: "",
    },
  });

  const createGuestMutation = useMutation({
    mutationFn: async (data: GuestForm) => {
      return await apiRequest("POST", `/api/events/${eventId}/guests`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      toast({
        title: "Úspěch",
        description: "Host byl úspěšně přidán",
      });
      setGuestDialogOpen(false);
      guestForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se přidat hosta",
        variant: "destructive",
      });
    },
  });

  const updateGuestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: GuestForm }) => {
      return await apiRequest("PUT", `/api/events/${eventId}/guests/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      toast({
        title: "Úspěch",
        description: "Host byl úspěšně aktualizován",
      });
      setGuestDialogOpen(false);
      setEditingGuest(null);
      guestForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se aktualizovat hosta",
        variant: "destructive",
      });
    },
  });

  const deleteGuestMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/events/${eventId}/guests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      toast({
        title: "Úspěch",
        description: "Host byl úspěšně smazán",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se smazat hosta",
        variant: "destructive",
      });
    },
  });

  const handleAddGuest = () => {
    setEditingGuest(null);
    guestForm.reset({
      name: "",
      type: "adult",
      nationality: "",
      isPaid: false,
      isPresent: false,
      notes: "",
    });
    setGuestDialogOpen(true);
  };

  const handleEditGuest = (guest: EventGuest) => {
    setEditingGuest(guest);
    guestForm.reset({
      name: guest.name,
      type: guest.type,
      nationality: guest.nationality || "",
      isPaid: guest.isPaid,
      isPresent: guest.isPresent,
      notes: guest.notes || "",
      eventTableId: guest.eventTableId,
      menuItemId: guest.menuItemId,
    });
    setGuestDialogOpen(true);
  };

  const handleDeleteGuest = (id: number) => {
    if (confirm("Opravdu chcete smazat tohoto hosta?")) {
      deleteGuestMutation.mutate(id);
    }
  };

  const onSubmitGuest = (data: GuestForm) => {
    if (editingGuest) {
      updateGuestMutation.mutate({ id: editingGuest.id, data });
    } else {
      createGuestMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loading-guests" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Seznam hostů</h3>
        <Button onClick={handleAddGuest} data-testid="button-add-guest">
          <Plus className="mr-2 h-4 w-4" />
          Přidat hosta
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jméno</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Národnost</TableHead>
            <TableHead>Zaplaceno</TableHead>
            <TableHead>Přítomen</TableHead>
            <TableHead>Poznámky</TableHead>
            <TableHead className="text-right">Akce</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Žádní hosté
              </TableCell>
            </TableRow>
          ) : (
            guests.map((guest) => (
              <TableRow key={guest.id} data-testid={`row-guest-${guest.id}`}>
                <TableCell data-testid={`text-guest-name-${guest.id}`}>
                  {guest.name}
                </TableCell>
                <TableCell data-testid={`text-guest-type-${guest.id}`}>
                  {guest.type === "adult" ? "Dospělý" : "Dítě"}
                </TableCell>
                <TableCell data-testid={`text-guest-nationality-${guest.id}`}>
                  {guest.nationality || "-"}
                </TableCell>
                <TableCell data-testid={`text-guest-paid-${guest.id}`}>
                  {guest.isPaid ? (
                    <span className="text-green-600">Ano</span>
                  ) : (
                    <span className="text-red-600">Ne</span>
                  )}
                </TableCell>
                <TableCell data-testid={`text-guest-present-${guest.id}`}>
                  {guest.isPresent ? (
                    <span className="text-green-600">Ano</span>
                  ) : (
                    <span className="text-muted-foreground">Ne</span>
                  )}
                </TableCell>
                <TableCell data-testid={`text-guest-notes-${guest.id}`}>
                  {guest.notes || "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEditGuest(guest)}
                      data-testid={`button-edit-guest-${guest.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteGuest(guest.id)}
                      data-testid={`button-delete-guest-${guest.id}`}
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

      <Dialog open={guestDialogOpen} onOpenChange={setGuestDialogOpen}>
        <DialogContent data-testid="dialog-guest">
          <DialogHeader>
            <DialogTitle>
              {editingGuest ? "Upravit hosta" : "Přidat hosta"}
            </DialogTitle>
            <DialogDescription>
              {editingGuest
                ? "Upravte údaje o hostovi"
                : "Vyplňte údaje o novém hostovi"}
            </DialogDescription>
          </DialogHeader>

          <Form {...guestForm}>
            <form onSubmit={guestForm.handleSubmit(onSubmitGuest)} className="space-y-4">
              <FormField
                control={guestForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jméno *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-guest-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={guestForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-guest-type">
                          <SelectValue placeholder="Vyberte typ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="adult">Dospělý</SelectItem>
                        <SelectItem value="child">Dítě</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={guestForm.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Národnost</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-guest-nationality" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={guestForm.control}
                name="isPaid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-guest-paid"
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Zaplaceno
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={guestForm.control}
                name="isPresent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-guest-present"
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Přítomen
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={guestForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poznámky</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="textarea-guest-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGuestDialogOpen(false)}
                  data-testid="button-cancel-guest"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createGuestMutation.isPending || updateGuestMutation.isPending}
                  data-testid="button-submit-guest"
                >
                  {(createGuestMutation.isPending || updateGuestMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingGuest ? "Uložit" : "Přidat"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StaffTabProps {
  eventId: number;
  staffAssignments: EventStaffAssignment[];
  staffMembers: StaffMember[];
  isLoading: boolean;
}

function StaffTab({ eventId, staffAssignments, staffMembers, isLoading }: StaffTabProps) {
  const { toast } = useToast();
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<EventStaffAssignment | null>(null);

  const staffForm = useForm<StaffAssignmentForm>({
    resolver: zodResolver(staffAssignmentSchema),
    defaultValues: {
      staffMemberId: undefined,
      role: "",
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffAssignmentForm) => {
      return await apiRequest("POST", `/api/events/${eventId}/staff-assignments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "staff-assignments"] });
      toast({
        title: "Úspěch",
        description: "Personál byl úspěšně přiřazen",
      });
      setStaffDialogOpen(false);
      staffForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se přiřadit personál",
        variant: "destructive",
      });
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/events/${eventId}/staff-assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "staff-assignments"] });
      toast({
        title: "Úspěch",
        description: "Personál byl úspěšně odebrán",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se odebrat personál",
        variant: "destructive",
      });
    },
  });

  const handleAddStaff = () => {
    setEditingStaff(null);
    staffForm.reset({
      staffMemberId: undefined,
      role: "",
    });
    setStaffDialogOpen(true);
  };

  const handleDeleteStaff = (id: number) => {
    if (confirm("Opravdu chcete odebrat tohoto člena personálu z akce?")) {
      deleteStaffMutation.mutate(id);
    }
  };

  const onSubmitStaff = (data: StaffAssignmentForm) => {
    createStaffMutation.mutate(data);
  };

  const activeStaffMembers = staffMembers.filter((m) => m.active);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loading-staff" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Přiřazený personál</h3>
        <Button onClick={handleAddStaff} data-testid="button-add-staff">
          <Plus className="mr-2 h-4 w-4" />
          Přidat personál
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jméno</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role v akci</TableHead>
            <TableHead className="text-right">Akce</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffAssignments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Žádný přiřazený personál
              </TableCell>
            </TableRow>
          ) : (
            staffAssignments.map((assignment) => {
              const staff = staffMembers.find((s) => s.id === assignment.staffMemberId);
              return (
                <TableRow key={assignment.id} data-testid={`row-staff-${assignment.id}`}>
                  <TableCell data-testid={`text-staff-name-${assignment.id}`}>
                    {staff ? `${staff.firstName} ${staff.lastName}` : "Neznámý"}
                  </TableCell>
                  <TableCell data-testid={`text-staff-email-${assignment.id}`}>
                    {staff?.email || "-"}
                  </TableCell>
                  <TableCell data-testid={`text-staff-role-${assignment.id}`}>
                    {assignment.role}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteStaff(assignment.id)}
                      data-testid={`button-delete-staff-${assignment.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent data-testid="dialog-staff">
          <DialogHeader>
            <DialogTitle>Přidat personál</DialogTitle>
            <DialogDescription>
              Vyberte člena personálu a zadejte jeho roli v této akci
            </DialogDescription>
          </DialogHeader>

          <Form {...staffForm}>
            <form onSubmit={staffForm.handleSubmit(onSubmitStaff)} className="space-y-4">
              <FormField
                control={staffForm.control}
                name="staffMemberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Člen personálu *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-staff-member">
                          <SelectValue placeholder="Vyberte člena personálu" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeStaffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id.toString()}>
                            {staff.firstName} {staff.lastName} ({staff.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={staffForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role v akci *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="např. Hlavní koordinátor" data-testid="input-staff-role" />
                    </FormControl>
                    <FormDescription>
                      Zadejte konkrétní roli člena personálu v této akci
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStaffDialogOpen(false)}
                  data-testid="button-cancel-staff"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createStaffMutation.isPending}
                  data-testid="button-submit-staff"
                >
                  {createStaffMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Přidat
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
