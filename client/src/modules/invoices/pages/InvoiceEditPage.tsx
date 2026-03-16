import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateInvoiceQueries } from "@/shared/lib/query-helpers";
import dayjs from "dayjs";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft, Save, Loader2, FileText } from "lucide-react";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import type { Invoice, CompanySettings } from "@shared/types";
import type { InvoiceFormData } from "@modules/invoices/types";
import CustomerSection from "@modules/invoices/components/CustomerSection";
import InvoiceItemsEditor from "@modules/invoices/components/InvoiceItemsEditor";
import InvoiceMetaSidebar from "@modules/invoices/components/InvoiceMetaSidebar";

export default function InvoiceEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isNew = !id || id === "new";

  // Form state
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceNumber: "",
    issueDate: dayjs().format("YYYY-MM-DD"),
    dueDate: dayjs().add(14, "day").format("YYYY-MM-DD"),
    taxableDate: dayjs().format("YYYY-MM-DD"),
    status: "DRAFT",
    customerName: "",
    customerCompany: "",
    customerStreet: "",
    customerCity: "",
    customerZipcode: "",
    customerIco: "",
    customerDic: "",
    customerEmail: "",
    customerPhone: "",
    items: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
    vatRate: 21,
    currency: "CZK",
    variableSymbol: "",
    note: "",
  });

  // Fetch existing invoice
  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ["/api/invoices", id],
    queryFn: () => api.get<Invoice>(`/api/invoices/${id}`),
    enabled: !isNew && !!id,
  });

  // Fetch company settings for defaults
  const { data: companySettings } = useQuery({
    queryKey: ["/api/company-settings"],
    queryFn: () => api.get<CompanySettings>("/api/company-settings"),
  });

  // Load invoice data when editing
  useEffect(() => {
    if (invoice && !isNew) {
      setFormData({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        taxableDate: invoice.taxableDate || invoice.issueDate,
        status: invoice.status,
        customerName: invoice.customer.name,
        customerCompany: invoice.customer.company || "",
        customerStreet: invoice.customer.street || "",
        customerCity: invoice.customer.city || "",
        customerZipcode: invoice.customer.zipcode || "",
        customerIco: invoice.customer.ico || "",
        customerDic: invoice.customer.dic || "",
        customerEmail: invoice.customer.email || "",
        customerPhone: invoice.customer.phone || "",
        items: invoice.items.length > 0
          ? invoice.items.map(item => ({
              ...item,
              quantity: Number(item.quantity) || 1,
              unitPrice: Number(item.unitPrice) || 0,
              total: Number(item.total) || 0,
            }))
          : [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
        vatRate: Number(invoice.vatRate) || 21,
        currency: invoice.currency,
        variableSymbol: invoice.variableSymbol,
        note: invoice.note || "",
      });
    }
  }, [invoice, isNew]);

  // Set default due days from company settings
  useEffect(() => {
    if (isNew && companySettings?.invoiceDueDays) {
      setFormData((prev) => ({
        ...prev,
        dueDate: dayjs().add(companySettings.invoiceDueDays, "day").format("YYYY-MM-DD"),
        vatRate: companySettings.defaultVatRate || 21,
      }));
    }
  }, [companySettings, isNew]);

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = subtotal * (formData.vatRate / 100);
  const total = subtotal + vatAmount;

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        subtotal: subtotal.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        total: total.toFixed(2),
      };

      if (isNew) {
        return api.post<Invoice>("/api/invoices", payload);
      } else {
        return api.put<Invoice>(`/api/invoices/${id}`, payload);
      }
    },
    onSuccess: () => {
      invalidateInvoiceQueries();
      successToast(isNew ? "Faktura vytvořena" : "Faktura uložena");
      navigate("/invoices");
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  // Send invoice mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/api/invoices/${id}/send-email`);
    },
    onSuccess: () => {
      invalidateInvoiceQueries();
      successToast("Faktura odeslána zákazníkovi");
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (!isNew && invoiceLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {isNew ? "Nová faktura" : `Faktura ${invoice?.invoiceNumber}`}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isNew ? "Vytvoření nové faktury" : "Úprava existující faktury"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && formData.customerEmail && (
            <Button
              variant="outline"
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Odeslat zákazníkovi
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isNew ? "Vytvořit fakturu" : "Uložit změny"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Invoice details */}
          <div className="lg:col-span-2 space-y-6">
            <CustomerSection formData={formData} onFormChange={setFormData} />

            <InvoiceItemsEditor
              formData={formData}
              onFormChange={setFormData}
              subtotal={subtotal}
              vatAmount={vatAmount}
              total={total}
            />
          </div>

          {/* Right column - Invoice meta */}
          <div className="space-y-6">
            <InvoiceMetaSidebar
              formData={formData}
              onFormChange={setFormData}
              isNew={isNew}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
