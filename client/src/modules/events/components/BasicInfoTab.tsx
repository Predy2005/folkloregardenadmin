import { useState, useMemo } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/shared/hooks/use-toast";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import {
  EVENT_SPACE_LABELS,
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  EVENT_SUBCATEGORY_LABELS,
  CATERING_TYPE_LABELS,
  type Event,
  type StaffMember,
  type EventTag,
} from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Loader2, X, Plus } from "lucide-react";

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

  // Prostory
  spaces: z
    .array(z.enum(["roubenka", "terasa", "stodolka", "cely_areal"]))
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

  // Finance
  totalPrice: z.number().min(0).optional().nullable(),
  depositAmount: z.number().min(0).optional().nullable(),
  depositPaid: z.boolean().default(false),
  paymentMethod: z.string().optional(),

  // Fakturační údaje
  invoiceCompany: z.string().optional(),
  invoiceIc: z.string().optional(),
  invoiceDic: z.string().optional(),
  invoiceAddress: z.string().optional(),

  // Catering
  cateringType: z.string().optional(),
  cateringCommissionPercent: z.number().min(0).max(100).optional().nullable(),
});

export type BasicInfoForm = z.infer<typeof basicInfoSchema>;

export interface BasicInfoTabProps {
  event: Event;
  eventId: number;
}

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Hotově" },
  { value: "BANK_TRANSFER", label: "Bankovní převod" },
  { value: "CARD", label: "Kartou" },
  { value: "INVOICE", label: "Faktura" },
];

export default function BasicInfoTab({ event, eventId }: BasicInfoTabProps) {
  const { toast } = useToast();
  const [newTag, setNewTag] = useState("");
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
      spaces: event.spaces,
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
      totalPrice: event.totalPrice || null,
      depositAmount: event.depositAmount || null,
      depositPaid: event.depositPaid,
      paymentMethod: event.paymentMethod || "",
      invoiceCompany: event.invoiceCompany || "",
      invoiceIc: event.invoiceIc || "",
      invoiceDic: event.invoiceDic || "",
      invoiceAddress: event.invoiceAddress || "",
      cateringType: event.cateringType || "",
      cateringCommissionPercent: event.cateringCommissionPercent || null,
    },
  });

  const watchedEventType = form.watch("eventType");
  const watchedCateringType = form.watch("cateringType");
  const watchedTotalPrice = form.watch("totalPrice");
  const watchedCommissionPercent = form.watch("cateringCommissionPercent");
  const watchedTags = form.watch("eventTags") || [];
  const watchedIsExternalCoordinator = form.watch("isExternalCoordinator");

  // Výpočet provize
  const calculatedCommission = useMemo(() => {
    if (watchedCateringType !== "ventura" || !watchedTotalPrice || !watchedCommissionPercent) {
      return null;
    }
    return (watchedTotalPrice * watchedCommissionPercent) / 100;
  }, [watchedCateringType, watchedTotalPrice, watchedCommissionPercent]);

  const guestsTotal = (form.watch("guestsPaid") || 0) + (form.watch("guestsFree") || 0);

  // Filtrované tagy pro našeptávání
  const suggestedTags = useMemo(() => {
    if (!existingTags || !newTag) return [];
    const lowerTag = newTag.toLowerCase();
    return existingTags
      .filter(t => t.name.toLowerCase().includes(lowerTag) && !watchedTags.includes(t.name))
      .slice(0, 5);
  }, [existingTags, newTag, watchedTags]);

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (trimmed && !watchedTags.includes(trimmed)) {
      form.setValue("eventTags", [...watchedTags, trimmed]);
    }
    setNewTag("");
  };

  const removeTag = (tagName: string) => {
    form.setValue("eventTags", watchedTags.filter(t => t !== tagName));
  };

  const onSubmit = async (data: BasicInfoForm) => {
    setIsSubmitting(true);
    try {
      // Přidáme vypočtenou provizi
      const submitData = {
        ...data,
        cateringCommissionAmount: calculatedCommission,
      };
      await api.put(`/api/events/${eventId}`, submitData);
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Úspěch", description: "Událost byla úspěšně aktualizována" });
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error?.message || "Nepodařilo se aktualizovat událost",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFolklorniShow = watchedEventType === "folklorni_show";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Základní údaje */}
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

              {!isFolklorniShow && (
                <FormField
                  control={form.control}
                  name="eventSubcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subkategorie</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte subkategorii" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">-- Nevybráno --</SelectItem>
                          {Object.entries(EVENT_SUBCATEGORY_LABELS).map(([value, label]) => (
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
              )}

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
            </div>

            {/* Tagy */}
            {!isFolklorniShow && (
              <FormField
                control={form.control}
                name="eventTags"
                render={() => (
                  <FormItem>
                    <FormLabel>Tagy</FormLabel>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {watchedTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="relative">
                      <div className="flex gap-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Přidat tag..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addTag(newTag);
                            }
                          }}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => addTag(newTag)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {suggestedTags.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md">
                          {suggestedTags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              className="w-full px-3 py-2 text-left hover:bg-accent text-sm"
                              onClick={() => addTag(tag.name)}
                            >
                              {tag.name} <span className="text-muted-foreground">({tag.usageCount}x)</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <FormDescription>Stiskněte Enter nebo klikněte na + pro přidání tagu</FormDescription>
                  </FormItem>
                )}
              />
            )}

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
                    <FormLabel>Doba trvání (min) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
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
                    <Input {...field} data-testid="input-language" className="w-48" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="guestsPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placení hosté</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
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
                    <FormLabel>Volní hosté</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-guests-free"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-end pb-2">
                <div className="text-sm font-medium" data-testid="text-guests-total">
                  Celkem: <span className="text-lg">{guestsTotal}</span>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="spaces"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prostory *</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(EVENT_SPACE_LABELS).map(([value, label]) => (
                      <label key={value} className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={field.value?.includes(value as any)}
                          onCheckedChange={(checked) => {
                            const v = value as keyof typeof EVENT_SPACE_LABELS;
                            const current = new Set(field.value || []);
                            if (checked) current.add(v as any);
                            else current.delete(v as any);
                            field.onChange(Array.from(current));
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Organizátor */}
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
                    <FormLabel>Firma</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Název firmy" />
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
                      <Input {...field} placeholder="Jméno kontaktní osoby" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="organizerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@example.com" />
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
                      <Input {...field} placeholder="+420 xxx xxx xxx" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Koordinátor */}
        <Card>
          <CardHeader>
            <CardTitle>Koordinátor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="isExternalCoordinator"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">Externí koordinátor (ne z našeho personálu)</FormLabel>
                </FormItem>
              )}
            />

            {!watchedIsExternalCoordinator ? (
              <FormField
                control={form.control}
                name="coordinatorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Koordinátor z personálu</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v && v !== "__none__" ? parseInt(v) : null)}
                      value={field.value?.toString() || "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte koordinátora" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-- Nevybráno --</SelectItem>
                        {staffMembers?.filter(s => s.isActive).map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.firstName} {member.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(!staffMembers || staffMembers.length === 0) && (
                      <FormDescription className="text-orange-600">
                        Žádný personál nebyl nalezen. Zkontrolujte oprávnění nebo přidejte členy personálu.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="externalCoordinatorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jméno koordinátora *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Jméno a příjmení" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="externalCoordinatorPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+420 xxx xxx xxx" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="externalCoordinatorEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="externalCoordinatorNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poznámka ke koordinátorovi</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Poznámka..." rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Finance */}
        <Card>
          <CardHeader>
            <CardTitle>Finance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="totalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Celková částka (Kč)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0"
                      />
                    </FormControl>
                    {isFolklorniShow && (
                      <FormDescription>Pro folklorní show se načítá z rezervace</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Záloha (Kč)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Způsob platby</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte způsob" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-- Nevybráno --</SelectItem>
                        {PAYMENT_METHOD_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="depositPaid"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">Záloha zaplacena</FormLabel>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Fakturační údaje */}
        <Card>
          <CardHeader>
            <CardTitle>Fakturační údaje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Firma</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Název firmy pro fakturaci" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="invoiceIc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IČ</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="12345678" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceDic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DIČ</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="CZ12345678" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <FormField
              control={form.control}
              name="invoiceAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fakturační adresa</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Ulice, Město, PSČ" rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Catering - pouze pro non-folklorni_show */}
        {!isFolklorniShow && (
          <Card>
            <CardHeader>
              <CardTitle>Catering</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cateringType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ cateringu</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte typ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">-- Nevybráno --</SelectItem>
                          {Object.entries(CATERING_TYPE_LABELS).map(([value, label]) => (
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

                {watchedCateringType === "ventura" && (
                  <>
                    <FormField
                      control={form.control}
                      name="cateringCommissionPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provize (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end pb-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Provize: </span>
                        <span className="font-medium text-lg">
                          {calculatedCommission !== null
                            ? `${calculatedCommission.toLocaleString("cs-CZ")} Kč`
                            : "---"}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
