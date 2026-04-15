import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import type { TransportCompany } from "@shared/types";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CompanyInfoForm, companySchema, type CompanyForm } from "./components/CompanyInfoForm";
import { VehiclesTab } from "./components/VehiclesTab";
import { DriversTab } from "./components/DriversTab";
import { TransportEventsTab } from "./components/TransportEventsTab";

export default function TransportCompanyEditPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/transport/:id/edit");
  const isNew = !params?.id;
  const companyId = params?.id ? Number(params.id) : null;

  const { data: company, isLoading } = useQuery<TransportCompany>({
    queryKey: ["/api/transport", companyId],
    queryFn: () => api.get(`/api/transport/${companyId}`),
    enabled: !!companyId,
  });

  const form = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      ic: "",
      dic: "",
      bankAccount: "",
      isActive: true,
      notes: "",
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        contactPerson: company.contactPerson || "",
        email: company.email || "",
        phone: company.phone || "",
        address: company.address || "",
        ic: company.ic || "",
        dic: company.dic || "",
        bankAccount: company.bankAccount || "",
        isActive: company.isActive,
        notes: company.notes || "",
      });
    }
  }, [company]);

  const saveMutation = useMutation({
    mutationFn: (data: CompanyForm) => {
      if (isNew) {
        return api.post("/api/transport", data);
      }
      return api.put(`/api/transport/${companyId}`, data);
    },
    onSuccess: (result: { id?: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transport"] });
      successToast(isNew ? "Dopravce byl vytvoren" : "Dopravce byl aktualizovan");
      if (isNew && result?.id) {
        navigate(`/transport/${result.id}/edit`);
      }
    },
    onError: (error: Error) => errorToast(error),
  });

  const onSubmit = (data: CompanyForm) => {
    saveMutation.mutate(data);
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/transport")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isNew ? "Novy dopravce" : company?.name || "Dopravce"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNew ? "Vytvoreni noveho dopravce" : "Uprava dopravni spolecnosti"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informace</TabsTrigger>
          {!isNew && <TabsTrigger value="vehicles">Vozidla</TabsTrigger>}
          {!isNew && <TabsTrigger value="drivers">Ridici</TabsTrigger>}
          {!isNew && <TabsTrigger value="events">Historie akci</TabsTrigger>}
        </TabsList>

        <TabsContent value="info">
          <CompanyInfoForm
            form={form}
            saveMutation={saveMutation}
            isNew={isNew}
            onSubmit={onSubmit}
          />
        </TabsContent>

        {!isNew && companyId && (
          <>
            <TabsContent value="vehicles">
              <Card>
                <CardContent className="pt-6">
                  <VehiclesTab companyId={companyId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="drivers">
              <Card>
                <CardContent className="pt-6">
                  <DriversTab companyId={companyId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events">
              <TransportEventsTab companyId={companyId} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
