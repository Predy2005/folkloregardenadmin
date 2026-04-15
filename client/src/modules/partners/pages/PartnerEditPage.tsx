import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { PageHeader } from "@/shared/components/PageHeader";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import type { Partner, ReservationFood, Contact } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { searchByIco, parseCompanyData, validateVatVies } from "@/modules/contacts/utils/companySearch";
import { partnerSchema, type PartnerForm } from "../components/edit/types";
import { BasicInfoCard } from "../components/edit/BasicInfoCard";
import { PricingCard } from "../components/edit/PricingCard";
import { BillingCard } from "../components/edit/BillingCard";
import { PartnerReservationsTab } from "../components/edit/PartnerReservationsTab";

export default function PartnerEditPage() {
  const [, paramsEdit] = useRoute("/partners/:id/edit");
  const id = paramsEdit?.id;
  const [, navigate] = useLocation();
  const isNew = !id;
  const { defaultCurrency } = useCurrency();

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
      currency: defaultCurrency || "CZK",
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
        partnerType: (partner.partnerType as "HOTEL" | "RECEPTION" | "DISTRIBUTOR" | "OTHER") || "HOTEL",
        contactPerson: partner.contactPerson || "",
        email: partner.email || "",
        phone: partner.phone || "",
        address: partner.address || "",
        ic: partner.ic || "",
        dic: partner.dic || "",
        bankAccount: partner.bankAccount || "",
        currency: partner.currency || "CZK",
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleCustomPriceChange = (key: string, value: string) => {
    setCustomPricesLocal((prev) => ({ ...prev, [key]: value }));
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
            <BasicInfoCard
              form={form}
              aresLoading={aresLoading}
              onAresLookup={handleAresLookup}
            />
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <PricingCard
              form={form}
              pricingModel={pricingModel}
              defaultCurrency={defaultCurrency}
              foods={foods}
              customPricesLocal={customPricesLocal}
              onCustomPriceChange={handleCustomPriceChange}
            />
            <BillingCard form={form} />
          </div>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/partners")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <PageHeader
            title={isNew ? "Novy partner" : partner?.name || "Partner"}
            description={isNew
              ? fromContactId
                ? "Vytvoreni partnera z kontaktu"
                : "Vytvorte noveho affiliate partnera"
              : "Uprava udaju partnera"}
          />
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
            {id && <PartnerReservationsTab partnerId={Number(id)} />}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
