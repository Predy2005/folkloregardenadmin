// file: client/src/pages/Contacts.tsx
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import type { Contact } from "@shared/types";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";
import { useLocation } from "wouter";
import ContactForm from "../components/ContactForm";
import { ContactTable } from "../components/ContactTable";
import { Plus, Upload } from "lucide-react";

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();
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
      toast({ title: "Kontakt vytvořen" });
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/all"] });
    },
    onError: () => toast({ title: "Chyba", description: "Nepodařilo se vytvořit kontakt", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/contacts/${id}`),
    onSuccess: () => {
      toast({ title: "Kontakt smazán" });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/all"] });
    },
    onError: () => toast({ title: "Chyba", description: "Nepodařilo se smazat kontakt", variant: "destructive" }),
  });

  const seedMutation = useMutation({
    mutationFn: async () => api.post(`/api/contacts/seed-from-reservations`),
    onSuccess: (res: any) => {
      toast({ title: "Načteno z rezervací", description: `Vytvořeno: ${res.created ?? "?"}, Aktualizováno: ${res.updated ?? "?"}` });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/all"] });
    },
    onError: () => toast({ title: "Chyba", description: "Načtení z rezervací selhalo", variant: "destructive" }),
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Adresář
          </h1>
          <p className="text-muted-foreground mt-1">
            Celkem {contacts?.length ?? 0} kontaktů
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => seedMutation.mutate()}>
            <Upload className="w-4 h-4 mr-2" />
            Načíst z rezervací
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-gradient-to-r from-primary to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Přidat kontakt
          </Button>
        </div>
      </div>

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
