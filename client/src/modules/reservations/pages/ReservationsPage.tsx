import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";
import type {
  PricingDefault,
  Reservation,
  ReservationFood,
} from "@shared/types";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/shared/hooks/use-toast";
import {
  isAiConfigured,
  parseReservationWithAI,
  resolveMenuToFoodId,
} from "@modules/reservations/utils/ai";
import { ReservationTable } from "../components/ReservationTable";
import { ReservationDetailDialog } from "../components/ReservationDetailDialog";

// Schema for person in reservation
const personSchema = z.object({
  type: z.enum(["adult", "child", "infant", "driver", "guide"]),
  menu: z.string(),
  price: z.coerce.number().min(0),
});

// Main reservation schema
const reservationSchema = z.object({
  date: z.string().min(1, "Datum je povinné"),
  contactName: z.string().min(1, "Jméno je povinné"),
  contactEmail: z.string().email("Neplatný email"),
  contactPhone: z.string().min(1, "Telefon je povinný"),
  contactNationality: z.string().min(1, "Národnost je povinná"),
  clientComeFrom: z.string().optional(),
  contactNote: z.string().optional(),
  invoiceSameAsContact: z.boolean().default(true),
  invoiceName: z.string().optional(),
  invoiceCompany: z.string().optional(),
  invoiceIc: z.string().optional(),
  invoiceDic: z.string().optional(),
  invoiceEmail: z.string().optional(),
  invoicePhone: z.string().optional(),
  transferSelected: z.boolean().default(false),
  transferCount: z.coerce.number().optional(),
  transferAddress: z.string().optional(),
  agreement: z.boolean().refine((val) => val === true, {
    message: "Musíte souhlasit s VOP",
  }),
  persons: z.array(personSchema).min(1, "Musíte přidat alespoň jednu osobu"),
  status: z
    .enum([
      "RECEIVED",
      "WAITING_PAYMENT",
      "PAID",
      "CANCELLED",
      "AUTHORIZED",
      "CONFIRMED",
    ])
    .default("RECEIVED"),
});

type ReservationForm = z.infer<typeof reservationSchema>;

export default function Reservations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] =
    useState<Reservation | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Fetch data
  const { data: reservations, isLoading } = useQuery({
    queryKey: ["/api/reservations"],
    queryFn: () => api.get<Reservation[]>("/api/reservations"),
  });

  const { data: foods } = useQuery({
    queryKey: ["/api/reservation-foods"],
    queryFn: () => api.get<ReservationFood[]>("/api/reservation-foods"),
  });

  const { data: pricing } = useQuery<PricingDefault>({
    queryKey: ["/api/pricing/defaults"],
  });

  // AI assistant state
  const [aiInput, setAiInput] = useState("");
  const [aiJson, setAiJson] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Form
  const form = useForm<ReservationForm>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      date: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      contactNationality: "Česká republika",
      clientComeFrom: "",
      contactNote: "",
      invoiceSameAsContact: true,
      invoiceName: "",
      invoiceCompany: "",
      invoiceIc: "",
      invoiceDic: "",
      invoiceEmail: "",
      invoicePhone: "",
      transferSelected: false,
      transferCount: 0,
      transferAddress: "",
      agreement: false,
      persons: [],
      status: "RECEIVED",
    },
  });

  const {
    fields: personFields,
    append: appendPerson,
    remove: removePerson,
    update: updatePerson,
  } = useFieldArray({
    control: form.control,
    name: "persons",
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: ReservationForm) => api.post("/api/reservations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Rezervace byla úspěšně vytvořena" });
    },
    onError: () => {
      toast({ title: "Chyba při vytváření rezervace", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReservationForm }) =>
      api.put(`/api/reservations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      setIsDialogOpen(false);
      setEditingReservation(null);
      form.reset();
      toast({ title: "Rezervace byla úspěšně aktualizována" });
    },
    onError: () => {
      toast({
        title: "Chyba při aktualizaci rezervace",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/reservations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      toast({ title: "Rezervace byla úspěšně smazána" });
    },
    onError: () => {
      toast({ title: "Chyba při mazání rezervace", variant: "destructive" });
    },
  });

  const sendPaymentEmailMutation = useMutation({
    mutationFn: (id: number) =>
      api.post(`/api/reservations/${id}/send-payment-email`),
    onSuccess: () => {
      toast({ title: "Platební email byl odeslán" });
    },
    onError: () => {
      toast({
        title: "Chyba při odesílání platebního emailu",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleCreate = () => {
    navigate("/reservations/new");
  };

  const handleEdit = (reservation: Reservation) => {
    navigate(`/reservations/${reservation.id}/edit`);
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tuto rezervaci?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewDetail = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsDetailOpen(true);
  };

  const handleSendPaymentEmail = (id: number) => {
    if (confirm("Opravdu chcete odeslat platební email?")) {
      sendPaymentEmailMutation.mutate(id);
    }
  };

  const onSubmit = (data: ReservationForm) => {
    if (editingReservation) {
      updateMutation.mutate({ id: editingReservation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Helper: Add person
  const addPerson = (
    type: "adult" | "child" | "infant" | "driver" | "guide",
  ) => {
    const defaultPrice =
      type === "adult"
        ? pricing?.adultPrice || 1250
        : type === "child"
          ? pricing?.childPrice || 800
          : type === "infant"
            ? pricing?.infantPrice || 0
            : 0; // driver & guide zdarma

    appendPerson({
      type,
      menu:
        type === "infant" || type === "driver" || type === "guide"
          ? "Bez jídla"
          : "",
      price: Number(defaultPrice) || 0,
    });
  };

  // AI: analyze input
  const handleAiAnalyze = async () => {
    setAiError(null);
    setAiJson(null);
    if (!isAiConfigured()) {
      setAiError("AI není nakonfigurováno. Nastavte VITE_AI_BASE_URL v .env.");
      return;
    }
    if (!foods) {
      setAiError("Seznam menu (foods) není načten. Zkuste to prosím znovu.");
      return;
    }
    setAiLoading(true);
    try {
      const result = await parseReservationWithAI({ text: aiInput, foods });
      setAiJson(result);
    } catch (e: any) {
      setAiError(e?.message || "Chyba při volání AI");
    } finally {
      setAiLoading(false);
    }
  };

  type FormPerson = z.infer<typeof personSchema>;

  // AI: apply parsed data into form
  const handleAiApply = () => {
    if (!aiJson) return;
    if (!foods) return;

    try {
      // Datum (povinné)
      if (aiJson.reservation?.date) {
        form.setValue("date", aiJson.reservation.date);
      }

      // Status pokud je uveden
      if (aiJson.reservation?.status) {
        form.setValue("status", aiJson.reservation.status);
      } else {
        form.setValue("status", "RECEIVED");
      }

      // Poznámky a čas + free TL/driver připojit do contactNote
      const timeNote = aiJson.reservation?.time
        ? `Čas: ${aiJson.reservation.time}. `
        : "";
      const notes = aiJson.reservation?.notes
        ? `${aiJson.reservation.notes}`
        : "";
      const freeNoteParts: string[] = [];
      if (aiJson.pax?.freeTourLeaders)
        freeNoteParts.push(`Free TL: ${aiJson.pax.freeTourLeaders}`);
      if (aiJson.pax?.freeDrivers)
        freeNoteParts.push(`Free driver: ${aiJson.pax.freeDrivers}`);
      const freeNote = freeNoteParts.length
        ? ` ${freeNoteParts.join(", ")}`
        : "";
      const combinedNote = `${timeNote}${notes}${freeNote}`.trim();
      if (combinedNote) {
        form.setValue("contactNote", combinedNote);
      }

      // Kontakt
      if (aiJson.contact) {
        if (aiJson.contact.name)
          form.setValue("contactName", aiJson.contact.name);
        if (aiJson.contact.email)
          form.setValue("contactEmail", aiJson.contact.email);
        if (aiJson.contact.phone)
          form.setValue("contactPhone", aiJson.contact.phone);
        if (aiJson.contact.nationality)
          form.setValue("contactNationality", aiJson.contact.nationality);
        // Fakturace
        const anyInvoice =
          aiJson.contact.invoiceName ||
          aiJson.contact.invoiceCompany ||
          aiJson.contact.invoiceIc ||
          aiJson.contact.invoiceDic ||
          aiJson.contact.invoiceEmail ||
          aiJson.contact.invoicePhone;
        if (anyInvoice) {
          form.setValue("invoiceSameAsContact", false);
          if (aiJson.contact.invoiceName)
            form.setValue("invoiceName", aiJson.contact.invoiceName);
          if (aiJson.contact.invoiceCompany)
            form.setValue("invoiceCompany", aiJson.contact.invoiceCompany);
          if (aiJson.contact.invoiceIc)
            form.setValue("invoiceIc", aiJson.contact.invoiceIc);
          if (aiJson.contact.invoiceDic)
            form.setValue("invoiceDic", aiJson.contact.invoiceDic);
          if (aiJson.contact.invoiceEmail)
            form.setValue("invoiceEmail", aiJson.contact.invoiceEmail);
          if (aiJson.contact.invoicePhone)
            form.setValue("invoicePhone", aiJson.contact.invoicePhone);
        }
      }

      // Agreement automaticky, aby bylo možné uložit
      form.setValue("agreement", true);

      // Sestavení persons z pax a menus
      const adults = Number(aiJson.pax?.adults || 0);
      const children = Number(aiJson.pax?.children || 0);
      const infants = Number(aiJson.pax?.infants || 0);
      const freeDrivers = Number(aiJson.pax?.freeDrivers || 0);
      const freeTourLeaders = Number(aiJson.pax?.freeTourLeaders || 0);

      // Rozpad dle menus; pokud nejsou, vytvoříme generické osoby
      const persons: FormPerson[] = [];

      const addPersonsForMenu = (menuName: string, count: number) => {
        if (count <= 0) return;
        const food = resolveMenuToFoodId(menuName, foods);
        const priceFromFood = food?.price ?? undefined;
        const isChild = food?.isChildrenMenu ?? false;
        const defaultPrice = isChild
          ? (pricing?.childPrice ?? priceFromFood ?? 0)
          : (pricing?.adultPrice ?? priceFromFood ?? 0);
        for (let i = 0; i < count; i++) {
          persons.push({
            type: isChild ? "child" : "adult",
            menu: food?.name || menuName,
            price: Number(defaultPrice),
          });
        }
      };

      if (Array.isArray(aiJson.menus) && aiJson.menus.length > 0) {
        aiJson.menus.forEach((m: any) => {
          const unitPrice =
            typeof m.unitPrice === "number" ? m.unitPrice : undefined;
          const food = resolveMenuToFoodId(m.menuName, foods);
          const isChild = food?.isChildrenMenu ?? false;
          const fallback = isChild
            ? (pricing?.childPrice ?? food?.price ?? 0)
            : (pricing?.adultPrice ?? food?.price ?? 0);
          for (let i = 0; i < (m.count || 0); i++) {
            persons.push({
              type: isChild ? "child" : "adult",
              menu: food?.name || m.menuName,
              price: Number(unitPrice ?? fallback),
            });
          }
        });
      }

      // Pokud po meníčkách máme méně osob než dospělí/children, doplníme do default menu
      const currentAdults = persons.filter((p) => p.type === "adult").length;
      const currentChildren = persons.filter((p) => p.type === "child").length;
      if (currentAdults < adults) {
        addPersonsForMenu("Traditional", adults - currentAdults);
      }
      if (currentChildren < children) {
        // najdi nějaké dětské menu
        const childMenu =
          foods.find((f) => f.isChildrenMenu)?.name || "Children menu";
        addPersonsForMenu(childMenu, children - currentChildren);
      }

      // Infants bez jídla
      for (let i = 0; i < infants; i++) {
        persons.push({
          type: "infant",
          menu: "Bez jídla",
          price: Number(pricing?.infantPrice ?? 0),
        });
      }

      // Free role: driver a guide zdarma, bez jídla
      for (let i = 0; i < freeDrivers; i++) {
        persons.push({
          type: "driver",
          menu: "Bez jídla",
          price: 0,
        });
      }
      for (let i = 0; i < freeTourLeaders; i++) {
        persons.push({
          type: "guide",
          menu: "Bez jídla",
          price: 0,
        });
      }

      // Nastavit osoby
      form.setValue("persons", persons);

      toast({ title: "AI návrh načten do formuláře" });
    } catch (e: any) {
      toast({
        title: "Chyba při aplikaci AI dat",
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  // Watch form values for total calculation
  const watchedPersons = form.watch("persons");
  const watchedTransferSelected = form.watch("transferSelected");
  const watchedTransferCount = form.watch("transferCount");

  // Calculate total (memoized)
  const totalPrice = useMemo(() => {
    const personsTotal = (watchedPersons || []).reduce(
      (sum, person) => sum + (person.price || 0),
      0,
    );
    const transferTotal = watchedTransferSelected
      ? (watchedTransferCount || 0) * 300
      : 0;
    return personsTotal + transferTotal;
  }, [watchedPersons, watchedTransferSelected, watchedTransferCount]);

  // Filter handled inside ReservationTable

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Načítání rezervací...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Rezervace
          </h1>
          <p className="text-muted-foreground mt-1">Správa všech rezervací</p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-reservation"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nová rezervace
        </Button>
      </div>

      <Card>
        <CardContent>
          <ReservationTable
            reservations={reservations || []}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onView={handleViewDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSendPayment={handleSendPaymentEmail}
          />
        </CardContent>
      </Card>

      <ReservationDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        reservation={selectedReservation}
      />
    </div>
  );
}
