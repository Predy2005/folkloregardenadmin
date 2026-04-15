import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import {
  type Event,
  type StaffMember,
  type EventTag,
} from "@shared/types";
import { Form } from "@/shared/components/ui/form";
import { Button } from "@/shared/components/ui/button";
import { Loader2 } from "lucide-react";
import { EventDetailsSection, OrganizerSection, CoordinatorCateringSection } from "./basic-info";

const basicInfoSchema = z.object({
  // Základní údaje
  name: z.string().min(1, "Zadejte název akce"),
  eventType: z.enum(["folklorni_show", "svatba", "event", "privat"], {
    required_error: "Vyberte typ akce",
  }),
  eventSubcategory: z.string().optional(),
  eventTags: z.array(z.string()).optional(),
  eventDate: z.string().min(1, "Zadejte datum"),
  eventTime: z.string().min(1, "Zadejte čas"),
  durationMinutes: z.number().min(1, "Zadejte dobu trvání"),
  language: z.string().min(1, "Zadejte jazyk"),
  status: z.enum(["DRAFT", "PLANNED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"], {
    required_error: "Vyberte status",
  }),

  // Počet hostů
  guestsPaid: z.number().min(0, "Počet musí být alespoň 0"),
  guestsFree: z.number().min(0, "Počet musí být alespoň 0"),

  // Prostory (dynamic from buildings/rooms)
  spaces: z
    .array(z.string())
    .min(1, "Vyberte alespoň jeden prostor"),

  // Organizátor
  organizerCompany: z.string().optional(),
  organizerPerson: z.string().optional(),
  organizerEmail: z.string().email("Neplatný email").optional().or(z.literal("")),
  organizerPhone: z.string().optional(),

  // Koordinátor
  isExternalCoordinator: z.boolean().default(false),
  coordinatorId: z.number().nullable().optional(),
  externalCoordinatorName: z.string().optional(),
  externalCoordinatorEmail: z.string().email("Neplatný email").optional().or(z.literal("")),
  externalCoordinatorPhone: z.string().optional(),
  externalCoordinatorNote: z.string().optional(),

  // Catering
  cateringType: z.string().optional(),
  cateringCommissionPercent: z.number().min(0).max(100).optional().nullable(),
});

export type BasicInfoForm = z.infer<typeof basicInfoSchema>;

export interface BasicInfoTabProps {
  event: Event;
  eventId: number;
}

export default function BasicInfoTab({ event, eventId }: BasicInfoTabProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Načtení staff members pro koordinátora
  const { data: staffMembers } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
    queryFn: async () => api.get("/api/staff"),
  });

  // Načtení existujících tagů pro našeptávání
  const { data: existingTags } = useQuery<EventTag[]>({
    queryKey: ["/api/event-tags"],
    queryFn: async () => {
      try {
        return await api.get("/api/event-tags");
      } catch {
        return [];
      }
    },
  });

  const form = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: event.name,
      eventType: event.eventType,
      eventSubcategory: event.eventSubcategory || "",
      eventTags: event.eventTags || [],
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      durationMinutes: event.durationMinutes,
      language: event.language,
      status: event.status,
      guestsPaid: event.guestsPaid,
      guestsFree: event.guestsFree,
      spaces: event.spaces?.map((s: string | { spaceName: string }) => typeof s === 'string' ? s : s.spaceName) ?? [],
      organizerCompany: event.organizerCompany || "",
      organizerPerson: event.organizerPerson || "",
      organizerEmail: event.organizerEmail || "",
      organizerPhone: event.organizerPhone || "",
      isExternalCoordinator: event.isExternalCoordinator || false,
      coordinatorId: event.coordinatorId || null,
      externalCoordinatorName: event.externalCoordinatorName || "",
      externalCoordinatorEmail: event.externalCoordinatorEmail || "",
      externalCoordinatorPhone: event.externalCoordinatorPhone || "",
      externalCoordinatorNote: event.externalCoordinatorNote || "",
      cateringType: event.cateringType || "",
      cateringCommissionPercent: event.cateringCommissionPercent || null,
    },
  });

  const watchedEventType = form.watch("eventType");
  const isFolklorniShow = watchedEventType === "folklorni_show";

  const onSubmit = async (data: BasicInfoForm) => {
    setIsSubmitting(true);
    try {
      await api.put(`/api/events/${eventId}`, data);
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      successToast("Událost byla úspěšně aktualizována");
    } catch (error: unknown) {
      errorToast(error instanceof Error ? error.message : "Nepodařilo se aktualizovat událost");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <EventDetailsSection form={form} existingTags={existingTags} eventId={eventId} />
        <OrganizerSection form={form} />
        <CoordinatorCateringSection
          form={form}
          staffMembers={staffMembers}
          isFolklorniShow={isFolklorniShow}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} data-testid="button-save-basic-info">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Uložit změny
          </Button>
        </div>
      </form>
    </Form>
  );
}
