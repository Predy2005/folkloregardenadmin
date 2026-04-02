// file: client/src/pages/ContactEdit.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateContactQueries } from "@/shared/lib/query-helpers";
import type { Contact, Reservation } from "@shared/types";
import { RESERVATION_STATUS_LABELS } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import ContactForm from "../components/ContactForm";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { ArrowLeft, Loader2, Plus, Calendar, Users, Banknote, Users2 } from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatting";
import dayjs from "dayjs";

interface ContactReservation {
  id: number;
  date: string;
  status: Reservation["status"];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  personsCount: number;
  totalPrice: number;
  createdAt: string;
}

interface ContactReservationsResponse {
  items: ContactReservation[];
  total: number;
}

export default function ContactEdit() {
  const [, params] = useRoute("/contacts/:id/edit");
  const id = useMemo(() => Number(params?.id), [params?.id]);
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery<Contact>({
    queryKey: ["/api/contacts", id],
    enabled: Number.isFinite(id),
    queryFn: async () => api.get(`/api/contacts/${id}`),
  });

  const { data: reservationsData, isLoading: isLoadingReservations } = useQuery<ContactReservationsResponse>({
    queryKey: ["/api/contacts", id, "reservations"],
    enabled: Number.isFinite(id),
    queryFn: async () => api.get(`/api/contacts/${id}/reservations`),
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

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        company: data.company ?? "",
        note: data.note ?? "",
        invoiceName: data.invoiceName ?? "",
        invoiceEmail: data.invoiceEmail ?? "",
        invoicePhone: data.invoicePhone ?? "",
        invoiceIc: data.invoiceIc ?? "",
        invoiceDic: data.invoiceDic ?? "",
        clientComeFrom: data.clientComeFrom ?? "",
        billingStreet: data.billingStreet ?? "",
        billingCity: data.billingCity ?? "",
        billingZip: data.billingZip ?? "",
        billingCountry: data.billingCountry ?? "",
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async () => api.put(`/api/contacts/${id}`, form),
    onSuccess: () => {
      successToast("Kontakt uložen");
      invalidateContactQueries(Number(id));
      navigate("/contacts");
    },
    onError: () => errorToast("Nepodařilo se uložit kontakt"),
  });

  const reservations = reservationsData?.items ?? [];
  const reservationsTotal = reservationsData?.total ?? 0;

  // Stats for reservations
  const stats = useMemo(() => {
    const total = reservations.length;
    const totalRevenue = reservations.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
    const totalPersons = reservations.reduce((sum, r) => sum + (r.personsCount || 0), 0);
    return { total, totalRevenue, totalPersons };
  }, [reservations]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/contacts")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Zpět
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{data?.name || "Kontakt"}</h1>
            {data?.email && <p className="text-sm text-muted-foreground">{data.email}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/partners/new?fromContact=${id}`)}>
            <Users2 className="w-4 h-4 mr-2" />
            Vytvorit partnera
          </Button>
          <Button onClick={() => navigate(`/reservations/new?contactId=${id}`)}>
            <Plus className="h-4 w-4 mr-2" /> Nová rezervace
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
          <Loader2 className="h-4 w-4 animate-spin" /> Načítání…
        </div>
      ) : (
        <Tabs defaultValue="info" className="w-full">
          <TabsList>
            <TabsTrigger value="info">Kontaktní údaje</TabsTrigger>
            <TabsTrigger value="reservations">
              Rezervace ({reservationsTotal})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <ContactForm form={form} setForm={setForm} />
                  <div className="flex justify-end">
                    <Button onClick={() => updateMutation.mutate()} disabled={!form.name || updateMutation.isPending}>
                      {updateMutation.isPending ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Ukládám…</>) : ("Uložit změny")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reservations" className="space-y-4">
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-sm text-muted-foreground">Rezervací celkem</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.totalPersons}</p>
                      <p className="text-sm text-muted-foreground">Osob celkem</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Banknote className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                      <p className="text-sm text-muted-foreground">Celkový obrat</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reservations list */}
            <Card>
              <CardHeader>
                <CardTitle>Historie rezervací</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingReservations ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Načítání rezervací…
                  </div>
                ) : reservations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Tento kontakt nemá žádné rezervace</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => navigate(`/reservations/new?contactId=${id}`)}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Vytvořit první rezervaci
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-4">Datum</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-4">Osob</th>
                          <th className="py-2 pr-4 text-right">Cena</th>
                          <th className="py-2 pr-4 text-right">Akce</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservations.map((r) => (
                          <tr key={r.id} className="border-b hover:bg-muted/50">
                            <td className="py-2 pr-4 font-medium">
                              {dayjs(r.date).format("D. M. YYYY")}
                            </td>
                            <td className="py-2 pr-4">
                              <StatusBadge status={r.status} type="reservation" />
                            </td>
                            <td className="py-2 pr-4">{r.personsCount}</td>
                            <td className="py-2 pr-4 text-right">
                              {formatCurrency(r.totalPrice)}
                            </td>
                            <td className="py-2 pr-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/reservations/${r.id}/edit`)}
                              >
                                Detail
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
