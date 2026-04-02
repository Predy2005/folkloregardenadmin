import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import type {
  EventTransport, TransportCompany,
} from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Plus, Pencil, Trash2, Truck, DollarSign, Clock } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  ARRIVAL: "Příjezd",
  DEPARTURE: "Odjezd",
  BOTH: "Příjezd i odjezd",
  SHUTTLE: "Shuttle",
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "Nezaplaceno",
  INVOICED: "Fakturováno",
  PAID: "Zaplaceno",
};

const paymentBadgeVariant = (status: string) => {
  switch (status) {
    case "PAID": return "default" as const;
    case "INVOICED": return "outline" as const;
    default: return "secondary" as const;
  }
};

interface TransportTabProps {
  eventId: number;
}

interface AssignmentForm {
  companyId: string;
  vehicleId: string;
  driverId: string;
  transportType: string;
  scheduledTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  passengerCount: string;
  price: string;
  paymentStatus: string;
  invoiceNumber: string;
  notes: string;
}

const emptyForm: AssignmentForm = {
  companyId: "", vehicleId: "", driverId: "", transportType: "ARRIVAL",
  scheduledTime: "", pickupLocation: "", dropoffLocation: "",
  passengerCount: "", price: "", paymentStatus: "PENDING",
  invoiceNumber: "", notes: "",
};

export function TransportTab({ eventId }: TransportTabProps) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AssignmentForm>(emptyForm);

  // Fetch event transport assignments (from event detail endpoint)
  const { data: assignments = [], isLoading } = useQuery<EventTransport[]>({
    queryKey: ["event-transport", eventId],
    queryFn: async () => {
      // Get from transport controller — find assignments for this event
      const res = await api.get<EventTransport[]>(`/api/transport/by-event/${eventId}`);
      return res;
    },
  });

  const { data: companies = [] } = useQuery<TransportCompany[]>({
    queryKey: ["/api/transport"],
    queryFn: () => api.get("/api/transport"),
  });

  // Fetch reservation transfers for this event (from dashboard API)
  const { data: dashboardData } = useQuery<any>({
    queryKey: ["event-dashboard", eventId],
    queryFn: () => api.get(`/api/events/${eventId}/manager-dashboard`),
  });
  const reservationTransfers = dashboardData?.transport?.reservationsWithTaxi?.filter((r: any) => r.hasTaxi) ?? [];

  const saveMutation = useMutation({
    mutationFn: async (data: AssignmentForm) => {
      const payload = {
        eventId,
        companyId: parseInt(data.companyId),
        vehicleId: data.vehicleId ? parseInt(data.vehicleId) : null,
        driverId: data.driverId ? parseInt(data.driverId) : null,
        transportType: data.transportType || null,
        scheduledTime: data.scheduledTime || null,
        pickupLocation: data.pickupLocation || null,
        dropoffLocation: data.dropoffLocation || null,
        passengerCount: data.passengerCount ? parseInt(data.passengerCount) : null,
        price: data.price ? parseFloat(data.price) : null,
        paymentStatus: data.paymentStatus,
        invoiceNumber: data.invoiceNumber || null,
        notes: data.notes || null,
      };
      if (editingId) {
        return api.put(`/api/transport/event-assignments/${editingId}`, payload);
      }
      return api.post("/api/transport/event-assignments", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-transport", eventId] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      successToast(editingId ? "Doprava aktualizována" : "Doprava přidána");
    },
    onError: () => errorToast("Chyba při ukládání"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/transport/event-assignments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-transport", eventId] });
      successToast("Doprava odstraněna");
    },
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (a: EventTransport) => {
    setEditingId(a.id);
    setForm({
      companyId: a.companyId?.toString() ?? "",
      vehicleId: a.vehicleId?.toString() ?? "",
      driverId: a.driverId?.toString() ?? "",
      transportType: a.transportType ?? "ARRIVAL",
      scheduledTime: a.scheduledTime ?? "",
      pickupLocation: a.pickupLocation ?? "",
      dropoffLocation: a.dropoffLocation ?? "",
      passengerCount: a.passengerCount?.toString() ?? "",
      price: a.price?.toString() ?? "",
      paymentStatus: a.paymentStatus ?? "PENDING",
      invoiceNumber: a.invoiceNumber ?? "",
      notes: a.notes ?? "",
    });
    setDialogOpen(true);
  };

  const selectedCompany = companies.find((c) => c.id === parseInt(form.companyId));

  // Summary
  const totalPrice = assignments.reduce((s, a) => s + (parseFloat(a.price as any) || 0), 0);
  const pendingPrice = assignments.filter((a) => a.paymentStatus !== "PAID").reduce((s, a) => s + (parseFloat(a.price as any) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <Truck className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{assignments.length}</div>
            <div className="text-xs text-muted-foreground">Přiřazené dopravy</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{totalPrice.toLocaleString("cs-CZ")} Kč</div>
            <div className="text-xs text-muted-foreground">Celková cena</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{pendingPrice.toLocaleString("cs-CZ")} Kč</div>
            <div className="text-xs text-muted-foreground">Nezaplaceno</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Doprava k akci</h3>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Přidat dopravu
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Načítání...</p>
      ) : assignments.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">Žádná doprava přiřazena</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dopravce</TableHead>
              <TableHead>Vozidlo</TableHead>
              <TableHead>Řidič</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Čas</TableHead>
              <TableHead>Odkud → Kam</TableHead>
              <TableHead>Osob</TableHead>
              <TableHead>Cena</TableHead>
              <TableHead>Platba</TableHead>
              <TableHead>Faktura</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.companyName}</TableCell>
                <TableCell>{a.vehicleLicensePlate || "—"}</TableCell>
                <TableCell>{a.driverName || "—"}</TableCell>
                <TableCell>{TYPE_LABELS[a.transportType ?? ""] || "—"}</TableCell>
                <TableCell>{a.scheduledTime || "—"}</TableCell>
                <TableCell className="text-xs">
                  {a.pickupLocation && a.dropoffLocation
                    ? `${a.pickupLocation} → ${a.dropoffLocation}`
                    : a.pickupLocation || a.dropoffLocation || "—"}
                </TableCell>
                <TableCell>{a.passengerCount ?? "—"}</TableCell>
                <TableCell>{a.price ? `${parseFloat(a.price as any).toLocaleString("cs-CZ")} Kč` : "—"}</TableCell>
                <TableCell>
                  <Badge variant={paymentBadgeVariant(a.paymentStatus)}>
                    {PAYMENT_LABELS[a.paymentStatus] || a.paymentStatus}
                  </Badge>
                </TableCell>
                <TableCell>{a.invoiceNumber || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => { if (confirm("Smazat dopravu?")) deleteMutation.mutate(a.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Reservation transfers (from reservations linked to this event) */}
      {reservationTransfers.length > 0 && (
        <div className="space-y-2 pt-4 border-t">
          <h3 className="font-semibold text-sm text-muted-foreground">Doprava z rezervací ({reservationTransfers.length})</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kontakt</TableHead>
                <TableHead>Osob</TableHead>
                <TableHead>Adresa</TableHead>
                <TableHead>Dopravce</TableHead>
                <TableHead>Vozidlo</TableHead>
                <TableHead>Řidič</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservationTransfers.map((r: any) => {
                const transfers = r.transfers ?? [];
                if (transfers.length === 0) {
                  return (
                    <TableRow key={r.reservationId}>
                      <TableCell className="font-medium">{r.contactName}</TableCell>
                      <TableCell>{r.passengerCount}</TableCell>
                      <TableCell>{r.pickupAddress || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                    </TableRow>
                  );
                }
                return transfers.map((t: any, i: number) => (
                  <TableRow key={`${r.reservationId}-${i}`}>
                    {i === 0 && (
                      <TableCell className="font-medium" rowSpan={transfers.length}>
                        {r.contactName}
                      </TableCell>
                    )}
                    <TableCell>{t.personCount}</TableCell>
                    <TableCell>{t.address || "—"}</TableCell>
                    <TableCell>
                      {t.transportCompanyName ? (
                        <Badge variant="outline">{t.transportCompanyName}</Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{t.transportVehiclePlate || "—"}</TableCell>
                    <TableCell>{t.transportDriverName || "—"}</TableCell>
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Upravit dopravu" : "Přidat dopravu"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dopravce *</Label>
              <Select value={form.companyId} onValueChange={(v) => setForm({ ...form, companyId: v, vehicleId: "", driverId: "" })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Vybrat" /></SelectTrigger>
                <SelectContent>
                  {companies.filter(c => c.isActive).map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Typ dopravy</Label>
              <Select value={form.transportType} onValueChange={(v) => setForm({ ...form, transportType: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vozidlo</Label>
              <Select value={form.vehicleId || "none"} onValueChange={(v) => setForm({ ...form, vehicleId: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Libovolné" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Libovolné --</SelectItem>
                  {(selectedCompany?.vehicles ?? []).filter(v => v.isActive).map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.licensePlate} {v.brand ? `(${v.brand})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Řidič</Label>
              <Select value={form.driverId || "none"} onValueChange={(v) => setForm({ ...form, driverId: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Libovolný" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Libovolný --</SelectItem>
                  {(selectedCompany?.drivers ?? []).filter(d => d.isActive).map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.firstName} {d.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Čas</Label>
              <Input type="time" value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Počet osob</Label>
              <Input type="number" min={1} value={form.passengerCount} onChange={(e) => setForm({ ...form, passengerCount: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Místo vyzvednutí</Label>
              <Input value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Cíl</Label>
              <Input value={form.dropoffLocation} onChange={(e) => setForm({ ...form, dropoffLocation: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Cena (Kč)</Label>
              <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Stav platby</Label>
              <Select value={form.paymentStatus} onValueChange={(v) => setForm({ ...form, paymentStatus: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Číslo faktury</Label>
              <Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Poznámka</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.companyId || saveMutation.isPending}>
              {saveMutation.isPending ? "Ukládám..." : editingId ? "Uložit" : "Přidat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
