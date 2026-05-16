import { useRoute } from "wouter";
import { PageHeader } from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { BasicInfoCard } from "../components/edit/BasicInfoCard";
import { PricingCard } from "../components/edit/PricingCard";
import { BillingCard } from "../components/edit/BillingCard";
import { ApiKeyCard } from "../components/edit/ApiKeyCard";
import { SwaggerAccessCard } from "../components/edit/SwaggerAccessCard";
import { PartnerReservationsTab } from "../components/edit/PartnerReservationsTab";
import { PartnerContactsTab } from "../components/edit/PartnerContactsTab";
import { usePartnerForm } from "../hooks/usePartnerForm";
import { useAresLookup } from "../hooks/useAresLookup";
import type { PartnerForm } from "../components/edit/types";

export default function PartnerEditPage() {
  const [, paramsEdit] = useRoute("/partners/:id/edit");
  const id = paramsEdit?.id;

  const {
    form,
    partner,
    foods,
    pricingModel,
    customPricesLocal,
    handleCustomPriceChange,
    saveMutation,
    isLoading,
    isNew,
    fromContactId,
    defaultCurrency,
    navigate,
  } = usePartnerForm({ id });

  const { aresLoading, handleAresLookup } = useAresLookup(form);

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
          <div className="space-y-6">
            <BasicInfoCard
              form={form}
              aresLoading={aresLoading}
              onAresLookup={handleAresLookup}
            />
          </div>
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
            {!isNew && id && partner?.id && (
              <>
                <ApiKeyCard partnerId={partner.id} apiKey={partner.apiKey} />
                <SwaggerAccessCard
                  partnerId={partner.id}
                  swaggerAccess={partner.swaggerAccess}
                />
              </>
            )}
          </div>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/partners")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <PageHeader
            title={isNew ? "Novy partner" : partner?.name || "Partner"}
            description={
              isNew
                ? fromContactId
                  ? "Vytvoreni partnera z kontaktu"
                  : "Vytvorte noveho affiliate partnera"
                : "Uprava udaju partnera"
            }
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
            <TabsTrigger value="contacts">Kontaktní osoby</TabsTrigger>
            <TabsTrigger value="reservations">Rezervace a historie</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-6">
            {formContent}
          </TabsContent>
          <TabsContent value="contacts" className="mt-6">
            {id && <PartnerContactsTab partnerId={Number(id)} />}
          </TabsContent>
          <TabsContent value="reservations" className="mt-6">
            {id && <PartnerReservationsTab partnerId={Number(id)} />}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
