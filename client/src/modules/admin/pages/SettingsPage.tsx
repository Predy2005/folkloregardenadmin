import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Building2, CreditCard, FileText, Coins, Save, Loader2 } from "lucide-react";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { CompanySettingsTab, BankSettingsTab, InvoiceSettingsTab, CurrencySettingsTab } from "../components/settings";
import type { CompanySettings } from "@shared/types";
import { PageHeader } from "@/shared/components/PageHeader";

export default function Settings() {
  const [formData, setFormData] = useState<Partial<CompanySettings>>({});

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/company-settings"],
    queryFn: () => api.get<CompanySettings>("/api/company-settings"),
  });

  // Update form when data loads
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CompanySettings>) =>
      api.put<CompanySettings>("/api/company-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-settings"] });
      successToast("Nastavení bylo úspěšně uloženo");
    },
    onError: () => {
      errorToast("Chyba při ukládání nastavení");
    },
  });

  const handleChange = (field: keyof CompanySettings, value: string | number | boolean | string[] | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Nastavení" description="Nastavení firmy, fakturace a bankovních údajů" />

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Firma
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Bankovní údaje
            </TabsTrigger>
            <TabsTrigger value="invoice" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Fakturace
            </TabsTrigger>
            <TabsTrigger value="currency" className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Měny
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <CompanySettingsTab
              formData={formData}
              handleChange={handleChange}
              setFormData={setFormData}
            />
          </TabsContent>

          <TabsContent value="bank">
            <BankSettingsTab formData={formData} handleChange={handleChange} />
          </TabsContent>

          <TabsContent value="invoice">
            <InvoiceSettingsTab formData={formData} handleChange={handleChange} />
          </TabsContent>

          <TabsContent value="currency">
            <CurrencySettingsTab formData={formData} handleChange={handleChange} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Uložit nastavení
          </Button>
        </div>
      </form>
    </div>
  );
}
