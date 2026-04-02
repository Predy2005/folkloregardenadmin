import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { formatCurrency } from "@/shared/lib/formatting";
import type { Partner, ReservationFood, Contact, Reservation } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { ArrowLeft, Save, Loader2, Search, Calendar, Users, Banknote } from "lucide-react";
import { searchByIco, parseCompanyData, validateVatVies } from "@/modules/contacts/utils/companySearch";
import { StatusBadge } from "@/shared/components/StatusBadge";
import dayjs from "dayjs";

// ---- Schema ----
const partnerSchema = z.object({
  name: z.string().min(1, "Zadejte nazev partnera"),
  partnerType: z.enum(["HOTEL", "RECEPTION", "DISTRIBUTOR", "OTHER"]),
  contactPerson: z.string().optional(),
  email: z.string().email("Zadejte platny email").or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  ic: z.string().optional(),
  dic: z.string().optional(),
  bankAccount: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
  pricingModel: z.enum(["DEFAULT", "CUSTOM", "FLAT"]),
  flatPriceAdult: z.string().nullable().optional(),
  flatPriceChild: z.string().nullable().optional(),
  flatPriceInfant: z.string().nullable().optional(),
  customMenuPrices: z.record(z.string(), z.number()).nullable().optional(),
  billingPeriod: z.enum(["PER_RESERVATION", "MONTHLY", "QUARTERLY"]),
  billingEmail: z.string().optional(),
  invoiceCompany: z.string().optional(),
  invoiceStreet: z.string().optional(),
  invoiceCity: z.string().optional(),
  invoiceZipcode: z.string().optional(),
  commissionRate: z.string(),
  detectionEmails: z.string().optional(),
  detectionKeywords: z.string().optional(),
});

type PartnerForm = z.infer<typeof partnerSchema>;

const PARTNER_TYPE_LABELS: Record<string, string> = {
  HOTEL: "Hotel",
  RECEPTION: "Recepce",
  DISTRIBUTOR: "Distributor",
  OTHER: "Ostatni",
};

// ---- Reservations Tab ----
interface PartnerReservation {
  id: number;
  date: string;
  contactName: string;
  contactEmail: string;
  personsCount: number;
  totalPrice: number;
  status: string;
}

interface PartnerReservationsResponse {
  items: PartnerReservation[];
  summary: {
    totalReservations: number;
    totalPersons: number;
    totalRevenue: number;
  };
}

function ReservationsTab({ partnerId }: { partnerId: number }) {
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery<PartnerReservationsResponse>({
    queryKey: ["/api/partner", partnerId, "reservations"],
    queryFn: () => api.get(`/api/partner/${partnerId}/reservations`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = data?.items ?? [];
  const summary = data?.summary ?? { totalReservations: 0, totalPersons: 0, totalRevenue: 0 };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{summary.totalReservations}</p>
                <p className="text-sm text-muted-foreground">Celkem rezervaci</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{summary.totalPersons}</p>
                <p className="text-sm text-muted-foreground">Celkem osob</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Banknote className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">Celkova trzba</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservations table */}
      <Card>
        <CardHeader>
          <CardTitle>Rezervace partnera</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Zadne rezervace tohoto partnera
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead className="text-right">Osoby</TableHead>
                  <TableHead className="text-right">Cena</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {dayjs(r.date).format("DD.MM.YYYY")}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{r.contactName}</div>
                        <div className="text-muted-foreground text-xs">{r.contactEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{r.personsCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.totalPrice)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status as Reservation["status"]} type="reservation" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/reservations/${r.id}/edit`)}
                      >
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Main Page ----
export default function PartnerEditPage() {
  const [, paramsEdit] = useRoute("/partners/:id/edit");
  const [, paramsNew] = useRoute("/partners/new");
  const id = paramsEdit?.id;
  const [, navigate] = useLocation();
  const isNew = !id;

  // Parse ?fromContact=ID
  const fromContactId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const val = params.get("fromContact");
    return val ? Number(val) : null;
  }, []);

  // Fetch partner data when editing
  const { data: partner, isLoading } = useQuery<Partner>({
    queryKey: ["/api/partner", id],
    queryFn: () => api.get(`/api/partner/${id}`),
    enabled: !isNew && !!id,
  });

  // Fetch contact data when creating from contact
  const { data: contactData } = useQuery<Contact>({
    queryKey: ["/api/contacts", fromContactId],
    queryFn: () => api.get(`/api/contacts/${fromContactId}`),
    enabled: isNew && !!fromContactId,
  });

  // Fetch foods for custom pricing
  const { data: foods } = useQuery<ReservationFood[]>({
    queryKey: ["/api/reservation-foods"],
    queryFn: () => api.get("/api/reservation-foods"),
  });

  const form = useForm<PartnerForm>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: "",
      partnerType: "HOTEL",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      ic: "",
      dic: "",
      bankAccount: "",
      isActive: true,
      notes: "",
      pricingModel: "DEFAULT",
      flatPriceAdult: null,
      flatPriceChild: null,
      flatPriceInfant: null,
      customMenuPrices: null,
      billingPeriod: "PER_RESERVATION",
      billingEmail: "",
      invoiceCompany: "",
      invoiceStreet: "",
      invoiceCity: "",
      invoiceZipcode: "",
      commissionRate: "10",
      detectionEmails: "",
      detectionKeywords: "",
    },
  });

  const pricingModel = form.watch("pricingModel");
  const [customPricesLocal, setCustomPricesLocal] = useState<Record<string, string>>({});
  const [aresLoading, setAresLoading] = useState(false);

  // Populate form from partner (edit mode)
  useEffect(() => {
    if (partner && !isNew) {
      form.reset({
        name: partner.name,
        partnerType: (partner.partnerType as any) || "HOTEL",
        contactPerson: partner.contactPerson || "",
        email: partner.email || "",
        phone: partner.phone || "",
        address: partner.address || "",
        ic: partner.ic || "",
        dic: partner.dic || "",
        bankAccount: partner.bankAccount || "",
        isActive: partner.isActive,
        notes: partner.notes || "",
        pricingModel: partner.pricingModel || "DEFAULT",
        flatPriceAdult: partner.flatPriceAdult ?? null,
        flatPriceChild: partner.flatPriceChild ?? null,
        flatPriceInfant: partner.flatPriceInfant ?? null,
        customMenuPrices: partner.customMenuPrices || null,
        billingPeriod: partner.billingPeriod || "PER_RESERVATION",
        billingEmail: partner.billingEmail || "",
        invoiceCompany: partner.invoiceCompany || "",
        invoiceStreet: partner.invoiceStreet || "",
        invoiceCity: partner.invoiceCity || "",
        invoiceZipcode: partner.invoiceZipcode || "",
        commissionRate: String(partner.commissionRate ?? "10"),
        detectionEmails: (partner.detectionEmails || []).join("\n"),
        detectionKeywords: (partner.detectionKeywords || []).join("\n"),
      });
      // Set custom prices
      const menuPrices = partner.customMenuPrices || {};
      const local: Record<string, string> = {};
      if (foods) {
        foods.forEach((f) => {
          const key = String(f.id);
          local[key] = menuPrices[key] != null ? String(menuPrices[key]) : "";
        });
      }
      setCustomPricesLocal(local);
    }
  }, [partner, isNew, form, foods]);

  // Pre-fill from contact (create mode)
  useEffect(() => {
    if (contactData && isNew && fromContactId) {
      form.reset({
        ...form.getValues(),
        name: contactData.company || contactData.name || "",
        contactPerson: contactData.name || "",
        email: contactData.email || "",
        phone: contactData.phone || "",
        ic: contactData.invoiceIc || "",
        dic: contactData.invoiceDic || "",
        invoiceCompany: contactData.company || "",
        invoiceStreet: contactData.billingStreet || "",
        invoiceCity: contactData.billingCity || "",
        invoiceZipcode: contactData.billingZip || "",
        billingEmail: contactData.invoiceEmail || contactData.email || "",
      });
    }
  }, [contactData, isNew, fromContactId, form]);

  // Sync custom prices when switching to CUSTOM
  useEffect(() => {
    if (pricingModel === "CUSTOM" && foods && foods.length > 0) {
      const currentPrices = form.getValues("customMenuPrices") || {};
      const local: Record<string, string> = {};
      foods.forEach((f) => {
        const key = String(f.id);
        local[key] = currentPrices[key] != null ? String(currentPrices[key]) : "";
      });
      setCustomPricesLocal(local);
    }
  }, [pricingModel, foods]);

  // ARES/VIES lookup
  const handleAresLookup = async () => {
    const ic = form.getValues("ic");
    const dic = form.getValues("dic");
    setAresLoading(true);
    try {
      // Try VIES first if DIC looks like EU VAT
      if (dic && /^[A-Za-z]{2}\d/.test(dic.trim())) {
        const viesResult = await validateVatVies(dic.trim());
        if (viesResult && viesResult.valid && viesResult.name) {
          form.setValue("name", viesResult.name);
          if (viesResult.street) form.setValue("invoiceStreet", viesResult.street);
          if (viesResult.city) form.setValue("invoiceCity", viesResult.city);
          if (viesResult.zip) form.setValue("invoiceZipcode", viesResult.zip);
          form.setValue("invoiceCompany", viesResult.name);
          successToast("Data nactena z VIES");
          return;
        }
      }
      // Fallback to ARES by ICO
      if (ic) {
        const results = await searchByIco(ic.trim());
        if (results.length > 0) {
          const parsed = parseCompanyData(results[0]);
          form.setValue("name", parsed.name);
          form.setValue("invoiceCompany", parsed.name);
          if (parsed.dic) form.setValue("dic", parsed.dic);
          form.setValue("invoiceStreet", parsed.street);
          form.setValue("invoiceCity", parsed.city);
          form.setValue("invoiceZipcode", parsed.zip);
          if (!form.getValues("address")) {
            form.setValue("address", `${parsed.street}, ${parsed.city}`);
          }
          successToast("Data nactena z ARES");
          return;
        }
      }
      errorToast("Firma nenalezena");
    } catch {
      errorToast("Chyba pri vyhledavani firmy");
    } finally {
      setAresLoading(false);
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: PartnerForm) => {
      const payload = {
        ...data,
        detectionEmails: data.detectionEmails
          ? data.detectionEmails.split("\n").map((e) => e.trim()).filter(Boolean)
          : [],
        detectionKeywords: data.detectionKeywords
          ? data.detectionKeywords.split("\n").map((k) => k.trim()).filter(Boolean)
          : [],
        flatPriceAdult: data.pricingModel === "FLAT" ? data.flatPriceAdult : null,
        flatPriceChild: data.pricingModel === "FLAT" ? data.flatPriceChild : null,
        flatPriceInfant: data.pricingModel === "FLAT" ? data.flatPriceInfant : null,
        customMenuPrices:
          data.pricingModel === "CUSTOM"
            ? Object.fromEntries(
                Object.entries(customPricesLocal)
                  .filter(([, v]) => v !== "")
                  .map(([k, v]) => [k, parseFloat(v)])
              )
            : null,
      };
      if (isNew) {
        return api.post("/api/partner", payload);
      } else {
        return api.put(`/api/partner/${id}`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      successToast(isNew ? "Partner vytvoren" : "Partner ulozen");
      navigate("/partners");
    },
    onError: (error: Error) => errorToast(error),
  });

  const handleSubmit = (data: PartnerForm) => {
    saveMutation.mutate(data);
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Zakladni udaje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazev partnera *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nazev partnera" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="partnerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ partnera</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte typ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="HOTEL">Hotel</SelectItem>
                          <SelectItem value="RECEPTION">Recepce</SelectItem>
                          <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                          <SelectItem value="OTHER">Ostatni</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kontaktni osoba</FormLabel>
                        <FormControl>
                          <Input placeholder="Jmeno kontaktni osoby" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input placeholder="+420..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Adresa partnera" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="ic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ICO</FormLabel>
                        <FormControl>
                          <Input placeholder="12345678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DIC</FormLabel>
                        <FormControl>
                          <Input placeholder="CZ12345678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={aresLoading}
                      onClick={handleAresLookup}
                    >
                      {aresLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4 mr-2" />
                      )}
                      ARES / VIES
                    </Button>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="bankAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bankovni ucet</FormLabel>
                      <FormControl>
                        <Input placeholder="123456789/0100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Aktivni</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poznamky</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Interni poznamky k partnerovi..." rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Pricing card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cenotvorba</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="pricingModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cenovy model</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte cenovy model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DEFAULT">Systemove ceny</SelectItem>
                          <SelectItem value="FLAT">Jednotna cena</SelectItem>
                          <SelectItem value="CUSTOM">Vlastni ceny dle menu</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {pricingModel === "DEFAULT" && (
                  <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
                    Pouzivaji se systemove ceny. Zadne specialni nastaveni neni potreba.
                  </div>
                )}

                {pricingModel === "FLAT" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-sm">
                      Jednotna cena pro vsechny rezervace tohoto partnera.
                    </div>
                    <FormField
                      control={form.control}
                      name="flatPriceAdult"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dospely (Kc)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="flatPriceChild"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dite (Kc)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="flatPriceInfant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Miminko (Kc)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {pricingModel === "CUSTOM" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
                      Nastavte vlastni ceny pro kazde menu. Prazdne pole = systemova cena.
                    </div>
                    {foods && foods.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Menu</TableHead>
                            <TableHead>Systemova cena</TableHead>
                            <TableHead>Partnerska cena</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {foods.map((food) => {
                            const key = String(food.id);
                            return (
                              <TableRow key={food.id}>
                                <TableCell className="font-medium">{food.name}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {food.price} Kc
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="Systemova cena"
                                    className="w-32"
                                    value={customPricesLocal[key] ?? ""}
                                    onChange={(e) => {
                                      setCustomPricesLocal((prev) => ({
                                        ...prev,
                                        [key]: e.target.value,
                                      }));
                                    }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-sm text-muted-foreground">Nacitani polozek menu...</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fakturace a detekce</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="billingPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fakturacni obdobi</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte obdobi" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PER_RESERVATION">Za kazdou rezervaci</SelectItem>
                          <SelectItem value="MONTHLY">Mesicne</SelectItem>
                          <SelectItem value="QUARTERLY">Ctvrtletne</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billingEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fakturacni email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="fakturace@partner.cz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="invoiceCompany"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fakturacni firma</FormLabel>
                        <FormControl>
                          <Input placeholder="Nazev firmy" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="invoiceStreet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ulice</FormLabel>
                        <FormControl>
                          <Input placeholder="Ulice a cislo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="invoiceCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mesto</FormLabel>
                        <FormControl>
                          <Input placeholder="Mesto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="invoiceZipcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PSC</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="commissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provize (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4 space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Automaticka detekce partnera
                  </h3>
                  <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                    Pokud email nebo jmeno kontaktu v rezervaci odpovida nize uvedenym hodnotam,
                    partner bude automaticky detekovan.
                  </div>
                  <FormField
                    control={form.control}
                    name="detectionEmails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detekcni emaily (jeden na radek)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={"recepce@hotel.cz\nbooking@hotel.cz"}
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="detectionKeywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detekcni klicova slova (jedno na radek)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={"Hotel Prague\nPrague Tours"}
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partners")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {isNew ? "Novy partner" : partner?.name || "Partner"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isNew
              ? fromContactId
                ? "Vytvoreni partnera z kontaktu"
                : "Vytvorte noveho affiliate partnera"
              : "Uprava udaju partnera"}
          </p>
        </div>
        <Button
          onClick={form.handleSubmit(handleSubmit)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isNew ? "Vytvorit" : "Ulozit"}
        </Button>
      </div>

      {isNew ? (
        formContent
      ) : (
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Zakladni udaje</TabsTrigger>
            <TabsTrigger value="reservations">Rezervace a historie</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-6">
            {formContent}
          </TabsContent>
          <TabsContent value="reservations" className="mt-6">
            {id && <ReservationsTab partnerId={Number(id)} />}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
