import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type {
  Event,
  EventGuest,
  EventMenu,
  EventBeverage,
  EventScheduleItem,
  EventTable,
  EventStaffAssignment,
  EventVoucher,
  StaffMember,
  Voucher,
  EventSpace,
  EventType,
  EventStatus,
} from "@shared/types";
import {
  EVENT_TYPE_LABELS,
  EVENT_SPACE_LABELS,
  EVENT_STATUS_LABELS,
} from "@shared/types";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const basicInfoSchema = z.object({
  name: z.string().min(1, "Zadejte název akce"),
  eventType: z.enum(["folklorni_show", "svatba", "event", "privat"], {
    required_error: "Vyberte typ akce",
  }),
  eventDate: z.string().min(1, "Zadejte datum"),
  eventTime: z.string().min(1, "Zadejte čas"),
  durationMinutes: z.number().min(1, "Zadejte dobu trvání"),
  guestsPaid: z.number().min(0, "Počet musí být alespoň 0"),
  guestsFree: z.number().min(0, "Počet musí být alespoň 0"),
  spaces: z
    .array(z.enum(["roubenka", "terasa", "stodolka", "cely_areal"]))
    .min(1, "Vyberte alespoň jeden prostor"),
  organizerCompany: z.string().optional(),
  organizerPerson: z.string().optional(),
  organizerEmail: z.string().optional(),
  organizerPhone: z.string().optional(),
  language: z.string().min(1, "Zadejte jazyk"),
  invoiceCompany: z.string().optional(),
  invoiceIc: z.string().optional(),
  invoiceDic: z.string().optional(),
  invoiceAddress: z.string().optional(),
  totalPrice: z.number().optional(),
  depositAmount: z.number().optional(),
  depositPaid: z.boolean().default(false),
  paymentMethod: z.string().optional(),
  status: z.enum(["DRAFT", "PLANNED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"], {
    required_error: "Vyberte status",
  }),
  notesStaff: z.string().optional(),
  notesInternal: z.string().optional(),
  specialRequirements: z.string().optional(),
});

const guestSchema = z.object({
  firstName: z.string().min(1, "Zadejte jméno"),
  lastName: z.string().min(1, "Zadejte příjmení"),
  nationality: z.string().optional(),
  type: z.enum(["adult", "child"], {
    required_error: "Vyberte typ",
  }),
  isPaid: z.boolean().default(false),
  isPresent: z.boolean().default(false),
  notes: z.string().optional(),
});

const menuSchema = z.object({
  menuName: z.string().min(1, "Zadejte název jídla"),
  quantity: z.number().min(1, "Zadejte množství"),
  pricePerUnit: z.number().optional(),
  totalPrice: z.number().optional(),
  servingTime: z.string().optional(),
  notes: z.string().optional(),
});

const beverageSchema = z.object({
  beverageName: z.string().min(1, "Zadejte název nápoje"),
  quantity: z.number().min(1, "Zadejte množství"),
  unit: z.string().min(1, "Zadejte jednotku"),
  pricePerUnit: z.number().optional(),
  totalPrice: z.number().optional(),
  notes: z.string().optional(),
});

const scheduleSchema = z.object({
  timeSlot: z.string().min(1, "Zadejte čas"),
  durationMinutes: z.number().min(1, "Zadejte dobu trvání"),
  activity: z.string().min(1, "Zadejte aktivitu"),
  description: z.string().optional(),
  responsibleStaffId: z.number().optional(),
  notes: z.string().optional(),
});

const tableSchema = z.object({
  tableName: z.string().min(1, "Zadejte název stolu"),
  room: z.enum(["roubenka", "terasa", "stodolka", "cely_areal"], {
    required_error: "Vyberte prostor",
  }),
  capacity: z.number().min(1, "Zadejte kapacitu"),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});

const staffAssignmentSchema = z.object({
  staffMemberId: z.number({
    required_error: "Vyberte člena personálu",
  }),
  assignmentStatus: z.string().min(1, "Zadejte status přiřazení"),
  attendanceStatus: z.string().min(1, "Zadejte status docházky"),
  hoursWorked: z.number().min(0, "Počet hodin musí být alespoň 0").default(0),
  paymentAmount: z.number().optional(),
  paymentStatus: z.string().min(1, "Zadejte status platby"),
  notes: z.string().optional(),
});

const voucherSchema = z.object({
  voucherId: z.number({
    required_error: "Vyberte voucher",
  }),
  quantity: z.number().min(1, "Zadejte množství"),
  validated: z.boolean().default(false),
  notes: z.string().optional(),
});

type BasicInfoForm = z.infer<typeof basicInfoSchema>;
type GuestForm = z.infer<typeof guestSchema>;
type MenuForm = z.infer<typeof menuSchema>;
type BeverageForm = z.infer<typeof beverageSchema>;
type ScheduleForm = z.infer<typeof scheduleSchema>;
type TableForm = z.infer<typeof tableSchema>;
type StaffAssignmentForm = z.infer<typeof staffAssignmentSchema>;
type VoucherForm = z.infer<typeof voucherSchema>;

// ============================================================================
// BASIC INFO TAB
// ============================================================================

interface BasicInfoTabProps {
  event: Event;
  eventId: number;
}

function BasicInfoTab({ event, eventId }: BasicInfoTabProps) {
  const { toast } = useToast();

  const form = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: event.name,
      eventType: event.eventType,
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      durationMinutes: event.durationMinutes,
      guestsPaid: event.guestsPaid,
      guestsFree: event.guestsFree,
      spaces: event.spaces,
      organizerCompany: event.organizerCompany || "",
      organizerPerson: event.organizerPerson || "",
      organizerEmail: event.organizerEmail || "",
      organizerPhone: event.organizerPhone || "",
      language: event.language,
      invoiceCompany: event.invoiceCompany || "",
      invoiceIc: event.invoiceIc || "",
      invoiceDic: event.invoiceDic || "",
      invoiceAddress: event.invoiceAddress || "",
      totalPrice: event.totalPrice,
      depositAmount: event.depositAmount,
      depositPaid: event.depositPaid,
      paymentMethod: event.paymentMethod || "",
      status: event.status,
      notesStaff: event.notesStaff || "",
      notesInternal: event.notesInternal || "",
      specialRequirements: event.specialRequirements || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: BasicInfoForm) => {
      return await apiRequest("PUT", `/api/events/${eventId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Úspěch",
        description: "Událost byla úspěšně aktualizována",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se aktualizovat událost",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BasicInfoForm) => {
    updateMutation.mutate(data);
  };

  const guestsTotal = form.watch("guestsPaid") + form.watch("guestsFree");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Základní údaje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ akce *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-event-type">
                          <SelectValue placeholder="Vyberte typ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-event-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Čas *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} data-testid="input-event-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Délka (min) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-duration"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jazyk *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-language" />
                  </FormControl>
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
                      {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Počty osob</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="guestsPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platící hosté</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-guests-paid"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guestsFree"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hosté zdarma</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-guests-free"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Celkem hostů</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={guestsTotal}
                    disabled
                    data-testid="input-guests-total"
                  />
                </FormControl>
              </FormItem>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prostory</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="spaces"
              render={() => (
                <FormItem>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(EVENT_SPACE_LABELS).map(([value, label]) => (
                      <FormField
                        key={value}
                        control={form.control}
                        name="spaces"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(value as EventSpace)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  const updated = checked
                                    ? [...current, value as EventSpace]
                                    : current.filter((v) => v !== value);
                                  field.onChange(updated);
                                }}
                                data-testid={`checkbox-space-${value}`}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {label}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organizátor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="organizerCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Společnost</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-organizer-company" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organizerPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kontaktní osoba</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-organizer-person" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="organizerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-organizer-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organizerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} data-testid="input-organizer-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fakturace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Společnost</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-invoice-company" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceIc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IČ</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-invoice-ic" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceDic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DIČ</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-invoice-dic" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresa</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-invoice-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platba</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="totalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Celková cena</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        data-testid="input-total-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Záloha</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        data-testid="input-deposit-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="depositPaid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-8">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-deposit-paid"
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      Záloha zaplacena
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Způsob platby</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-payment-method" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Poznámky</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="notesStaff"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poznámky pro personál</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid="textarea-notes-staff" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notesInternal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interní poznámky</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid="textarea-notes-internal" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialRequirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Speciální požadavky</FormLabel>
                  <FormControl>
                    <Textarea {...field} data-testid="textarea-special-requirements" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-basic-info">
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ukládám...
              </>
            ) : (
              "Uložit změny"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ============================================================================
// GUESTS TAB
// ============================================================================

interface GuestsTabProps {
  eventId: number;
  guests: EventGuest[];
  isLoading: boolean;
}

function GuestsTab({ eventId, guests, isLoading }: GuestsTabProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<EventGuest | null>(null);

  const form = useForm<GuestForm>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      nationality: "",
      type: "adult",
      isPaid: false,
      isPresent: false,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: GuestForm) => {
      return await apiRequest("POST", `/api/events/${eventId}/guests`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Host byl přidán" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: GuestForm & { id: number }) => {
      return await apiRequest("PUT", `/api/events/${eventId}/guests/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Host byl aktualizován" });
      setDialogOpen(false);
      setEditingGuest(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/events/${eventId}/guests/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Host byl smazán" });
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const loadFromReservationsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/events/${eventId}/guests/from-reservations`);
      if (!res.ok) throw new Error("Failed to load guests from reservations");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
      toast({ title: "Úspěch", description: "Hosté načteni z rezervací" });
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (guest: EventGuest) => {
    setEditingGuest(guest);
    form.reset({
      firstName: guest.firstName || "",
      lastName: guest.lastName || "",
      nationality: guest.nationality || "",
      type: guest.type,
      isPaid: guest.isPaid,
      isPresent: guest.isPresent,
      notes: guest.notes || "",
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingGuest(null);
    form.reset({
      firstName: "",
      lastName: "",
      nationality: "",
      type: "adult",
      isPaid: false,
      isPresent: false,
      notes: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: GuestForm) => {
    if (editingGuest) {
      updateMutation.mutate({ ...data, id: editingGuest.id });
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
      <div className="flex gap-2">
        <Button
          onClick={() => loadFromReservationsMutation.mutate()}
          disabled={loadFromReservationsMutation.isPending}
          data-testid="button-load-reservations"
        >
          {loadFromReservationsMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Načítám...
            </>
          ) : (
            "Načíst z rezervací"
          )}
        </Button>
        <Button onClick={handleAdd} data-testid="button-add-guest">
          <Plus className="mr-2 h-4 w-4" />
          Přidat hosta
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jméno</TableHead>
              <TableHead>Příjmení</TableHead>
              <TableHead>Národnost</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Zaplaceno</TableHead>
              <TableHead>Přítomen</TableHead>
              <TableHead>Poznámky</TableHead>
              <TableHead className="w-24">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Zatím nejsou žádní hosté
                </TableCell>
              </TableRow>
            ) : (
              guests.map((guest) => (
                <TableRow key={guest.id} data-testid={`row-guest-${guest.id}`}>
                  <TableCell data-testid={`cell-guest-${guest.id}-firstname`}>{guest.firstName}</TableCell>
                  <TableCell data-testid={`cell-guest-${guest.id}-lastname`}>{guest.lastName}</TableCell>
                  <TableCell data-testid={`cell-guest-${guest.id}-nationality`}>{guest.nationality}</TableCell>
                  <TableCell data-testid={`cell-guest-${guest.id}-type`}>
                    {guest.type === "adult" ? "Dospělý" : "Dítě"}
                  </TableCell>
                  <TableCell data-testid={`cell-guest-${guest.id}-ispaid`}>
                    {guest.isPaid ? "Ano" : "Ne"}
                  </TableCell>
                  <TableCell data-testid={`cell-guest-${guest.id}-ispresent`}>
                    {guest.isPresent ? "Ano" : "Ne"}
                  </TableCell>
                  <TableCell data-testid={`cell-guest-${guest.id}-notes`}>{guest.notes}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(guest)}
                        data-testid={`button-edit-guest-${guest.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(guest.id)}
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
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGuest ? "Upravit hosta" : "Přidat hosta"}</DialogTitle>
            <DialogDescription>
              Vyplňte údaje o hostovi
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jméno *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-guest-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Příjmení *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-guest-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-guest-type">
                            <SelectValue />
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isPaid"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-guest-ispaid"
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Zaplaceno
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPresent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-guest-ispresent"
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Přítomen
                      </FormLabel>
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
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-guest"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-guest"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ukládám...
                    </>
                  ) : editingGuest ? (
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

// ============================================================================
// MENU TAB
// ============================================================================

interface MenuTabProps {
  eventId: number;
  menu: EventMenu[];
  isLoading: boolean;
}

function MenuTab({ eventId, menu, isLoading }: MenuTabProps) {
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
      return await apiRequest("POST", `/api/events/${eventId}/menu`, data);
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
      return await apiRequest("PUT", `/api/events/${eventId}/menu/${data.id}`, data);
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
      return await apiRequest("DELETE", `/api/events/${eventId}/menu/${id}`, undefined);
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

// ============================================================================
// BEVERAGES TAB
// ============================================================================

interface BeveragesTabProps {
  eventId: number;
  beverages: EventBeverage[];
  isLoading: boolean;
}

function BeveragesTab({ eventId, beverages, isLoading }: BeveragesTabProps) {
  const { toast } = useToast();
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
      return await apiRequest("POST", `/api/events/${eventId}/beverages`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "beverages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Nápoj byl přidán" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: BeverageForm & { id: number }) => {
      return await apiRequest("PUT", `/api/events/${eventId}/beverages/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "beverages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Nápoj byl aktualizován" });
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
      return await apiRequest("DELETE", `/api/events/${eventId}/beverages/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "beverages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Nápoj byl smazán" });
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
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

// ============================================================================
// SCHEDULE TAB
// ============================================================================

interface ScheduleTabProps {
  eventId: number;
  schedule: EventScheduleItem[];
  isLoading: boolean;
}

function ScheduleTab({ eventId, schedule, isLoading }: ScheduleTabProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventScheduleItem | null>(null);

  const form = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      timeSlot: "",
      durationMinutes: 30,
      activity: "",
      description: "",
      responsibleStaffId: undefined,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ScheduleForm) => {
      return await apiRequest("POST", `/api/events/${eventId}/schedule`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Položka harmonogramu byla přidána" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ScheduleForm & { id: number }) => {
      return await apiRequest("PUT", `/api/events/${eventId}/schedule/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Položka harmonogramu byla aktualizována" });
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
      return await apiRequest("DELETE", `/api/events/${eventId}/schedule/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Položka harmonogramu byla smazána" });
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (item: EventScheduleItem) => {
    setEditingItem(item);
    form.reset({
      timeSlot: item.timeSlot,
      durationMinutes: item.durationMinutes,
      activity: item.activity,
      description: item.description || "",
      responsibleStaffId: item.responsibleStaffId,
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset({
      timeSlot: "",
      durationMinutes: 30,
      activity: "",
      description: "",
      responsibleStaffId: undefined,
      notes: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: ScheduleForm) => {
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
        <Button onClick={handleAdd} data-testid="button-add-schedule">
          <Plus className="mr-2 h-4 w-4" />
          Přidat položku
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Čas</TableHead>
              <TableHead>Délka (min)</TableHead>
              <TableHead>Aktivita</TableHead>
              <TableHead>Popis</TableHead>
              <TableHead>Poznámky</TableHead>
              <TableHead className="w-24">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Zatím nejsou žádné položky harmonogramu
                </TableCell>
              </TableRow>
            ) : (
              schedule.map((item) => (
                <TableRow key={item.id} data-testid={`row-schedule-${item.id}`}>
                  <TableCell data-testid={`cell-schedule-${item.id}-time`}>{item.timeSlot}</TableCell>
                  <TableCell data-testid={`cell-schedule-${item.id}-duration`}>{item.durationMinutes}</TableCell>
                  <TableCell data-testid={`cell-schedule-${item.id}-activity`}>{item.activity}</TableCell>
                  <TableCell data-testid={`cell-schedule-${item.id}-description`}>{item.description}</TableCell>
                  <TableCell data-testid={`cell-schedule-${item.id}-notes`}>{item.notes}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                        data-testid={`button-edit-schedule-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(item.id)}
                        data-testid={`button-delete-schedule-${item.id}`}
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
            <DialogTitle>{editingItem ? "Upravit položku" : "Přidat položku"}</DialogTitle>
            <DialogDescription>
              Vyplňte údaje o položce harmonogramu
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="timeSlot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Čas *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-schedule-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Délka (min) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-schedule-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="activity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aktivita *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-schedule-activity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Popis</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="textarea-schedule-description" />
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
                      <Textarea {...field} data-testid="textarea-schedule-notes" />
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
                  data-testid="button-cancel-schedule"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-schedule"
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

// ============================================================================
// TABLES TAB
// ============================================================================

interface TablesTabProps {
  eventId: number;
  tables: EventTable[];
  isLoading: boolean;
}

function TablesTab({ eventId, tables, isLoading }: TablesTabProps) {
  const { toast } = useToast();
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
      return await apiRequest("POST", `/api/events/${eventId}/tables`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Stůl byl přidán" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TableForm & { id: number }) => {
      return await apiRequest("PUT", `/api/events/${eventId}/tables/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Stůl byl aktualizován" });
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
      return await apiRequest("DELETE", `/api/events/${eventId}/tables/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Stůl byl smazán" });
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (item: EventTable) => {
    setEditingItem(item);
    form.reset({
      tableName: item.tableName,
      room: item.room,
      capacity: item.capacity,
      positionX: item.positionX,
      positionY: item.positionY,
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset({
      tableName: "",
      room: "roubenka",
      capacity: 1,
      positionX: undefined,
      positionY: undefined,
    });
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
      <div className="flex justify-end">
        <Button onClick={handleAdd} data-testid="button-add-table">
          <Plus className="mr-2 h-4 w-4" />
          Přidat stůl
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název</TableHead>
              <TableHead>Prostor</TableHead>
              <TableHead>Kapacita</TableHead>
              <TableHead>Pozice X</TableHead>
              <TableHead>Pozice Y</TableHead>
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
                <TableRow key={item.id} data-testid={`row-table-${item.id}`}>
                  <TableCell data-testid={`cell-table-${item.id}-name`}>{item.tableName}</TableCell>
                  <TableCell data-testid={`cell-table-${item.id}-room`}>
                    {EVENT_SPACE_LABELS[item.room]}
                  </TableCell>
                  <TableCell data-testid={`cell-table-${item.id}-capacity`}>{item.capacity}</TableCell>
                  <TableCell data-testid={`cell-table-${item.id}-x`}>{item.positionX}</TableCell>
                  <TableCell data-testid={`cell-table-${item.id}-y`}>{item.positionY}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                        data-testid={`button-edit-table-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(item.id)}
                        data-testid={`button-delete-table-${item.id}`}
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
            <DialogTitle>{editingItem ? "Upravit stůl" : "Přidat stůl"}</DialogTitle>
            <DialogDescription>
              Vyplňte údaje o stolu
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="tableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-table-name" />
                    </FormControl>
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
                        <FormControl>
                          <SelectTrigger data-testid="select-table-room">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(EVENT_SPACE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
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
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kapacita *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-table-capacity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="positionX"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pozice X</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          data-testid="input-table-x"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="positionY"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pozice Y</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          data-testid="input-table-y"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-table"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-table"
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

// ============================================================================
// STAFF TAB
// ============================================================================

interface StaffTabProps {
  eventId: number;
  staffAssignments: EventStaffAssignment[];
  staffMembers: StaffMember[];
  isLoading: boolean;
}

function StaffTab({ eventId, staffAssignments, staffMembers, isLoading }: StaffTabProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventStaffAssignment | null>(null);

  const form = useForm<StaffAssignmentForm>({
    resolver: zodResolver(staffAssignmentSchema),
    defaultValues: {
      staffMemberId: 0,
      assignmentStatus: "ASSIGNED",
      attendanceStatus: "PENDING",
      hoursWorked: 0,
      paymentAmount: undefined,
      paymentStatus: "PENDING",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: StaffAssignmentForm) => {
      return await apiRequest("POST", `/api/events/${eventId}/staff-assignments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Personál byl přidán" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: StaffAssignmentForm & { id: number }) => {
      return await apiRequest("PUT", `/api/events/${eventId}/staff-assignments/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Personál byl aktualizován" });
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
      return await apiRequest("DELETE", `/api/events/${eventId}/staff-assignments/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Personál byl odebrán" });
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (item: EventStaffAssignment) => {
    setEditingItem(item);
    form.reset({
      staffMemberId: item.staffMemberId,
      assignmentStatus: item.assignmentStatus,
      attendanceStatus: item.attendanceStatus,
      hoursWorked: item.hoursWorked,
      paymentAmount: item.paymentAmount,
      paymentStatus: item.paymentStatus,
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset({
      staffMemberId: 0,
      assignmentStatus: "ASSIGNED",
      attendanceStatus: "PENDING",
      hoursWorked: 0,
      paymentAmount: undefined,
      paymentStatus: "PENDING",
      notes: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: StaffAssignmentForm) => {
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
        <Button onClick={handleAdd} data-testid="button-add-staff">
          <Plus className="mr-2 h-4 w-4" />
          Přidat personál
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jméno</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status přiřazení</TableHead>
              <TableHead>Status docházky</TableHead>
              <TableHead>Hodiny</TableHead>
              <TableHead>Částka</TableHead>
              <TableHead>Status platby</TableHead>
              <TableHead>Poznámky</TableHead>
              <TableHead className="w-24">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffAssignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Zatím není přiřazen žádný personál
                </TableCell>
              </TableRow>
            ) : (
              staffAssignments.map((item) => (
                <TableRow key={item.id} data-testid={`row-staff-${item.id}`}>
                  <TableCell data-testid={`cell-staff-${item.id}-name`}>
                    {item.staffMember ? `${item.staffMember.firstName} ${item.staffMember.lastName}` : "-"}
                  </TableCell>
                  <TableCell data-testid={`cell-staff-${item.id}-email`}>
                    {item.staffMember?.email || "-"}
                  </TableCell>
                  <TableCell data-testid={`cell-staff-${item.id}-assignment`}>
                    {item.assignmentStatus}
                  </TableCell>
                  <TableCell data-testid={`cell-staff-${item.id}-attendance`}>
                    {item.attendanceStatus}
                  </TableCell>
                  <TableCell data-testid={`cell-staff-${item.id}-hours`}>{item.hoursWorked}</TableCell>
                  <TableCell data-testid={`cell-staff-${item.id}-amount`}>{item.paymentAmount}</TableCell>
                  <TableCell data-testid={`cell-staff-${item.id}-payment`}>{item.paymentStatus}</TableCell>
                  <TableCell data-testid={`cell-staff-${item.id}-notes`}>{item.notes}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(item)}
                        data-testid={`button-edit-staff-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(item.id)}
                        data-testid={`button-delete-staff-${item.id}`}
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
            <DialogTitle>{editingItem ? "Upravit personál" : "Přidat personál"}</DialogTitle>
            <DialogDescription>
              Vyplňte údaje o přiřazení personálu
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
                          <SelectValue placeholder="Vyberte" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.firstName} {member.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assignmentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status přiřazení *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-assignment-status" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attendanceStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status docházky *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-attendance-status" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hoursWorked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Odpracované hodiny</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-hours-worked"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Částka</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          data-testid="input-payment-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status platby *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-payment-status" />
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
                      <Textarea {...field} data-testid="textarea-staff-notes" />
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
                  data-testid="button-cancel-staff"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-staff"
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

// ============================================================================
// VOUCHERS TAB
// ============================================================================

interface VouchersTabProps {
  eventId: number;
  vouchers: EventVoucher[];
  isLoading: boolean;
}

function VouchersTab({ eventId, vouchers, isLoading }: VouchersTabProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventVoucher | null>(null);

  const { data: availableVouchers } = useQuery<Voucher[]>({
    queryKey: ["/api/vouchers"],
    queryFn: async () => {
      const res = await fetch("/api/vouchers");
      if (!res.ok) throw new Error("Failed to fetch vouchers");
      return res.json();
    },
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
      return await apiRequest("POST", `/api/events/${eventId}/vouchers`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Voucher byl přidán" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: VoucherForm & { id: number }) => {
      return await apiRequest("PUT", `/api/events/${eventId}/vouchers/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Voucher byl aktualizován" });
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
      return await apiRequest("DELETE", `/api/events/${eventId}/vouchers/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({ title: "Úspěch", description: "Voucher byl odebrán" });
    },
    onError: (error: Error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EventEdit() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/events/:id/edit");
  const [activeTab, setActiveTab] = useState("basic");

  const eventId = params?.id ? parseInt(params.id) : null;

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) throw new Error("Failed to fetch event");
      return res.json();
    },
    enabled: !!eventId,
  });

  const { data: guests, isLoading: guestsLoading } = useQuery<EventGuest[]>({
    queryKey: ["/api/events", eventId, "guests"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/guests`);
      if (!res.ok) throw new Error("Failed to fetch guests");
      return res.json();
    },
    enabled: !!eventId && activeTab === "guests",
  });

  const { data: menu, isLoading: menuLoading } = useQuery<EventMenu[]>({
    queryKey: ["/api/events", eventId, "menu"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/menu`);
      if (!res.ok) throw new Error("Failed to fetch menu");
      return res.json();
    },
    enabled: !!eventId && activeTab === "menu",
  });

  const { data: beverages, isLoading: beveragesLoading } = useQuery<EventBeverage[]>({
    queryKey: ["/api/events", eventId, "beverages"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/beverages`);
      if (!res.ok) throw new Error("Failed to fetch beverages");
      return res.json();
    },
    enabled: !!eventId && activeTab === "beverages",
  });

  const { data: schedule, isLoading: scheduleLoading } = useQuery<EventScheduleItem[]>({
    queryKey: ["/api/events", eventId, "schedule"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/schedule`);
      if (!res.ok) throw new Error("Failed to fetch schedule");
      return res.json();
    },
    enabled: !!eventId && activeTab === "schedule",
  });

  const { data: tables, isLoading: tablesLoading } = useQuery<EventTable[]>({
    queryKey: ["/api/events", eventId, "tables"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/tables`);
      if (!res.ok) throw new Error("Failed to fetch tables");
      return res.json();
    },
    enabled: !!eventId && activeTab === "tables",
  });

  const { data: staffAssignments, isLoading: staffLoading } = useQuery<EventStaffAssignment[]>({
    queryKey: ["/api/events", eventId, "staff-assignments"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/staff-assignments`);
      if (!res.ok) throw new Error("Failed to fetch staff assignments");
      return res.json();
    },
    enabled: !!eventId && activeTab === "staff",
  });

  const { data: eventVouchers, isLoading: vouchersLoading } = useQuery<EventVoucher[]>({
    queryKey: ["/api/events", eventId, "vouchers"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/vouchers`);
      if (!res.ok) throw new Error("Failed to fetch vouchers");
      return res.json();
    },
    enabled: !!eventId && activeTab === "vouchers",
  });

  const { data: staffMembers } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff-members"],
    queryFn: async () => {
      const res = await fetch("/api/staff-members");
      if (!res.ok) throw new Error("Failed to fetch staff members");
      return res.json();
    },
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

  if (isLoading) {
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
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
            <TabsList className="grid w-full grid-cols-8" data-testid="tabs-list">
              <TabsTrigger value="basic" data-testid="tab-trigger-basic">
                Základní
              </TabsTrigger>
              <TabsTrigger value="guests" data-testid="tab-trigger-guests">
                Hosté
              </TabsTrigger>
              <TabsTrigger value="menu" data-testid="tab-trigger-menu">
                Menu
              </TabsTrigger>
              <TabsTrigger value="beverages" data-testid="tab-trigger-beverages">
                Nápoje
              </TabsTrigger>
              <TabsTrigger value="schedule" data-testid="tab-trigger-schedule">
                Harmonogram
              </TabsTrigger>
              <TabsTrigger value="tables" data-testid="tab-trigger-tables">
                Stoly
              </TabsTrigger>
              <TabsTrigger value="staff" data-testid="tab-trigger-staff">
                Personál
              </TabsTrigger>
              <TabsTrigger value="vouchers" data-testid="tab-trigger-vouchers">
                Vouchery
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-6">
              <BasicInfoTab event={event} eventId={eventId} />
            </TabsContent>

            <TabsContent value="guests" className="mt-6">
              <GuestsTab
                eventId={eventId}
                guests={guests || []}
                isLoading={guestsLoading}
              />
            </TabsContent>

            <TabsContent value="menu" className="mt-6">
              <MenuTab
                eventId={eventId}
                menu={menu || []}
                isLoading={menuLoading}
              />
            </TabsContent>

            <TabsContent value="beverages" className="mt-6">
              <BeveragesTab
                eventId={eventId}
                beverages={beverages || []}
                isLoading={beveragesLoading}
              />
            </TabsContent>

            <TabsContent value="schedule" className="mt-6">
              <ScheduleTab
                eventId={eventId}
                schedule={schedule || []}
                isLoading={scheduleLoading}
              />
            </TabsContent>

            <TabsContent value="tables" className="mt-6">
              <TablesTab
                eventId={eventId}
                tables={tables || []}
                isLoading={tablesLoading}
              />
            </TabsContent>

            <TabsContent value="staff" className="mt-6">
              <StaffTab
                eventId={eventId}
                staffAssignments={staffAssignments || []}
                staffMembers={staffMembers || []}
                isLoading={staffLoading}
              />
            </TabsContent>

            <TabsContent value="vouchers" className="mt-6">
              <VouchersTab
                eventId={eventId}
                vouchers={eventVouchers || []}
                isLoading={vouchersLoading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
