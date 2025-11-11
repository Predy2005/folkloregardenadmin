import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Event, EventSpace, StaffMember } from "@shared/types";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, ChevronsUpDown } from "lucide-react";
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

type EventForm = z.infer<typeof eventSchema>;

export default function EventEdit() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/events/:id/edit");
  const { toast } = useToast();
  const [contactPersonOpen, setContactPersonOpen] = useState(false);
  const [coordinatorOpen, setCoordinatorOpen] = useState(false);

  const eventId = params?.id ? parseInt(params.id) : null;

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const { data: staffMembers } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff-members"],
  });

  const activeStaffMembers = staffMembers?.filter(
    (member) => member.active
  ) || [];

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: "folklorni_show",
      name: "",
      date: dayjs().format("YYYY-MM-DD"),
      spaces: [],
      organizerName: "Folklore Garden",
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

  useEffect(() => {
    if (event) {
      form.reset({
        type: event.type,
        name: event.name,
        date: dayjs(event.date).format("YYYY-MM-DD"),
        spaces: event.spaces || [],
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

  const watchedType = form.watch("type");
  const watchedDate = form.watch("date");

  useEffect(() => {
    const typeLabel = EVENT_TYPE_LABELS[watchedType] || "Akce";
    const formattedDate = watchedDate
      ? dayjs(watchedDate).format("DD.MM.YYYY")
      : dayjs().format("DD.MM.YYYY");
    
    if (!event || form.getValues("name") === `${EVENT_TYPE_LABELS[event.type]} - ${dayjs(event.date).format("DD.MM.YYYY")}`) {
      form.setValue("name", `${typeLabel} - ${formattedDate}`);
    }
  }, [watchedType, watchedDate, form, event]);

  const updateMutation = useMutation({
    mutationFn: async (data: EventForm) => {
      if (!eventId) throw new Error("Event ID is required");
      return await apiRequest("PUT", `/api/events/${eventId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({
        title: "Úspěch",
        description: "Akce byla aktualizována",
      });
      setLocation("/events");
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat akci",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: EventForm) => {
    updateMutation.mutate(data);
  };

  if (!eventId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-destructive">Chyba: Neplatné ID akce</h1>
      </div>
    );
  }

  if (eventLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Načítání...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-destructive">Akce nebyla nalezena</h1>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/events")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Upravit akci</h1>
          <p className="text-muted-foreground">Upravte údaje akce</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Základní údaje</CardTitle>
          <CardDescription>Upravte základní informace o akci</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-date"
                        />
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
                        placeholder="Název akce"
                        {...field}
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormDescription>
                      Název se automaticky generuje podle typu a data
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="spaces"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prostory * (více možností)</FormLabel>
                    <div className="space-y-2">
                      {[
                        { value: "roubenka" as EventSpace, label: "Roubenka" },
                        { value: "terasa" as EventSpace, label: "Terasa" },
                        { value: "stodolka" as EventSpace, label: "Stodolka" },
                        { value: "cely_areal" as EventSpace, label: "Celý areál" },
                      ].map((space) => (
                        <div key={space.value} className="flex items-center space-x-2">
                          <Checkbox
                            checked={field.value?.includes(space.value)}
                            onCheckedChange={(checked) => {
                              const currentValue = field.value || [];
                              if (checked) {
                                field.onChange([...currentValue, space.value]);
                              } else {
                                field.onChange(currentValue.filter((v) => v !== space.value));
                              }
                            }}
                            data-testid={`checkbox-space-${space.value}`}
                          />
                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {space.label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="organizerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organizátor / Klient *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Folklore Garden"
                          {...field}
                          data-testid="input-organizer"
                        />
                      </FormControl>
                      <FormDescription>
                        Výchozí: Folklore Garden
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>

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
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-contact-person"
                            >
                              {field.value || "Vyberte osobu"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Hledat personál..." />
                            <CommandList>
                              <CommandEmpty>Nenalezeno</CommandEmpty>
                              <CommandGroup>
                                {activeStaffMembers.map((staff) => (
                                  <CommandItem
                                    key={staff.id}
                                    value={`${staff.firstName} ${staff.lastName}`}
                                    onSelect={() => {
                                      form.setValue("contactPerson", `${staff.firstName} ${staff.lastName}`);
                                      setContactPersonOpen(false);
                                    }}
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
                      <FormDescription>Autocomplete s našeptáváním personálu</FormDescription>
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
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-coordinator"
                            >
                              {field.value || "Vyberte osobu"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Hledat personál..." />
                            <CommandList>
                              <CommandEmpty>Nenalezeno</CommandEmpty>
                              <CommandGroup>
                                {activeStaffMembers.map((staff) => (
                                  <CommandItem
                                    key={staff.id}
                                    value={`${staff.firstName} ${staff.lastName}`}
                                    onSelect={() => {
                                      form.setValue("coordinator", `${staff.firstName} ${staff.lastName}`);
                                      setCoordinatorOpen(false);
                                    }}
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
                      <FormDescription>Autocomplete s našeptáváním personálu</FormDescription>
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
                      <FormLabel>Počet platících hostů</FormLabel>
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
                      <FormLabel>Počet hostů zdarma</FormLabel>
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poznámky</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Přidejte poznámky k akci..."
                        className="min-h-24"
                        {...field}
                        data-testid="textarea-notes"
                      />
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
                      <Textarea
                        placeholder="Zadejte organizační plán..."
                        className="min-h-24"
                        {...field}
                        data-testid="textarea-organization-plan"
                      />
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
                    <FormLabel>Harmonogram</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Zadejte harmonogram akce..."
                        className="min-h-24"
                        {...field}
                        data-testid="textarea-schedule"
                      />
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
                    <FormLabel>Poznámky k cateringu</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Poznámky ohledně stravy a nápojů..."
                        className="min-h-24"
                        {...field}
                        data-testid="textarea-catering-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/events")}
                  data-testid="button-cancel"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                  data-testid="button-submit"
                >
                  {updateMutation.isPending ? "Ukládání..." : "Uložit změny"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
