// file: client/src/pages/Contacts.tsx
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateContactQueries } from "@/shared/lib/query-helpers";
import type { Contact } from "@shared/types";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useLocation } from "wouter";
import ContactForm from "../components/ContactForm";
import { ContactTable } from "../components/ContactTable";
import { Plus, Upload } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [, navigate] = useLocation();

  // Fetch all contacts (no server-side pagination for now - filtering is client-side)
  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts/all"],
    queryFn: async () => {
      const res = await api.get<{ items: Contact[]; total: number }>("/api/contacts?limit=10000");
      return res.items;
    },
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    note: "",
    invoiceName: "",
    invoiceEmail: "",
    invoicePhone: "",
    invoiceIc: "",
    invoiceDic: "",
    clientComeFrom: "",
    billingStreet: "",
    billingCity: "",
    billingZip: "",
    billingCountry: "",
  });

  const resetForm = () => setForm({
    name: "",
    email: "",
    phone: "",
    company: "",
    note: "",
    invoiceName: "",
    invoiceEmail: "",
    invoicePhone: "",
    invoiceIc: "",
    invoiceDic: "",
    clientComeFrom: "",
    billingStreet: "",
    billingCity: "",
    billingZip: "",
    billingCountry: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => api.post("/api/contacts", form),
    onSuccess: () => {
      successToast("Kontakt vytvořen");
      setIsCreateOpen(false);
      resetForm();
      invalidateContactQueries();
    },
    onError: (error: Error) => errorToast(error),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/contacts/${id}`),
    onSuccess: () => {
      successToast("Kontakt smazán");
      invalidateContactQueries();
    },
    onError: (error: Error) => errorToast(error),
  });

  const seedMutation = useMutation({
    mutationFn: async () => api.post(`/api/contacts/seed-from-reservations`),
    onSuccess: (res: { created?: number; updated?: number }) => {
      successToast(`Načteno z rezervací - Vytvořeno: ${res.created ?? "?"}, Aktualizováno: ${res.updated ?? "?"}`);
      invalidateContactQueries();
    },
    onError: (error: Error) => errorToast(error),
  });

  const handleEdit = (contact: Contact) => {
    navigate(`/contacts/${contact.id}/edit`);
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tento kontakt?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewReservation = (contact: Contact) => {
    navigate(`/reservations/new?contactId=${contact.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Načítání kontaktů...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Adresář" description={`Celkem ${contacts?.length ?? 0} kontaktů`}>
        <Button variant="outline" onClick={() => seedMutation.mutate()}>
          <Upload className="w-4 h-4 mr-2" />
          Načíst z rezervací
        </Button>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Přidat kontakt
        </Button>
      </PageHeader>

      <Card>
        <CardContent>
          <ContactTable
            contacts={contacts || []}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onNewReservation={handleNewReservation}
          />
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(o) => {
          setIsCreateOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Přidat kontakt</DialogTitle>
          </DialogHeader>
          <ContactForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Zrušit
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.name || createMutation.isPending}
            >
              {createMutation.isPending ? "Ukládám..." : "Uložit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
