import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { formatCurrency } from "@/shared/lib/formatting";
import type {
  TransportCompany,
  TransportVehicle,
  TransportDriver,
  EventTransport,
  VehicleType,
  TransportPaymentStatus,
} from "@shared/types";
import {
  VEHICLE_TYPE_LABELS,
  TRANSPORT_TYPE_LABELS,
  TRANSPORT_PAYMENT_STATUS_LABELS,
} from "@shared/types";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { ArrowLeft, Save, Loader2, Plus, Pencil, Trash2, Calendar, Car, Users, Banknote } from "lucide-react";
import dayjs from "dayjs";

// ---- Schemas ----
const companySchema = z.object({
  name: z.string().min(1, "Zadejte nazev dopravce"),
  contactPerson: z.string().optional(),
  email: z.string().email("Zadejte platny email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  ic: z.string().optional(),
  dic: z.string().optional(),
  bankAccount: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

type CompanyForm = z.infer<typeof companySchema>;

const vehicleSchema = z.object({
  licensePlate: z.string().min(1, "Zadejte SPZ"),
  vehicleType: z.enum(["BUS", "MINIBUS", "VAN", "CAR", "OTHER"]),
  brand: z.string().optional(),
  model: z.string().optional(),
  capacity: z.coerce.number().min(1, "Zadejte kapacitu"),
  color: z.string().optional(),
  yearOfManufacture: z.coerce.number().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

type VehicleForm = z.infer<typeof vehicleSchema>;

const driverSchema = z.object({
  firstName: z.string().min(1, "Zadejte jmeno"),
  lastName: z.string().min(1, "Zadejte prijmeni"),
  phone: z.string().optional(),
  email: z.string().email("Zadejte platny email").or(z.literal("")).optional(),
  licenseNumber: z.string().optional(),
  licenseCategories: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

type DriverForm = z.infer<typeof driverSchema>;

// ---- Payment status badge variant ----
function paymentStatusVariant(status: TransportPaymentStatus) {
  switch (status) {
    case "PAID": return "default" as const;
    case "INVOICED": return "outline" as const;
    default: return "secondary" as const;
  }
}

// ---- Vehicles Tab ----
function VehiclesTab({ companyId }: { companyId: number }) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<TransportVehicle | null>(null);

  const { data: vehicles, isLoading } = useQuery<TransportVehicle[]>({
    queryKey: ["/api/transport", companyId, "vehicles"],
    queryFn: () => api.get(`/api/transport/${companyId}/vehicles`),
  });

  const form = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      licensePlate: "",
      vehicleType: "BUS",
      brand: "",
      model: "",
      capacity: 50,
      color: "",
      yearOfManufacture: undefined,
      isActive: true,
      notes: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: VehicleForm) => {
      if (editingVehicle) {
        return api.put(`/api/transport/${companyId}/vehicles/${editingVehicle.id}`, data);
      }
      return api.post(`/api/transport/${companyId}/vehicles`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transport", companyId, "vehicles"] });
      qc.invalidateQueries({ queryKey: ["/api/transport"] });
      successToast(editingVehicle ? "Vozidlo bylo aktualizovano" : "Vozidlo bylo vytvoreno");
      closeDialog();
    },
    onError: (error: Error) => errorToast(error),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/transport/${companyId}/vehicles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transport", companyId, "vehicles"] });
      qc.invalidateQueries({ queryKey: ["/api/transport"] });
      successToast("Vozidlo bylo smazano");
    },
    onError: (error: Error) => errorToast(error),
  });

  const openCreate = () => {
    setEditingVehicle(null);
    form.reset({
      licensePlate: "",
      vehicleType: "BUS",
      brand: "",
      model: "",
      capacity: 50,
      color: "",
      yearOfManufacture: undefined,
      isActive: true,
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (vehicle: TransportVehicle) => {
    setEditingVehicle(vehicle);
    form.reset({
      licensePlate: vehicle.licensePlate,
      vehicleType: vehicle.vehicleType,
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      capacity: vehicle.capacity,
      color: vehicle.color || "",
      yearOfManufacture: vehicle.yearOfManufacture || undefined,
      isActive: vehicle.isActive,
      notes: vehicle.notes || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingVehicle(null);
    form.reset();
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat toto vozidlo?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Vozidla ({vehicles?.length ?? 0})</h3>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Pridat vozidlo
        </Button>
      </div>

      {vehicles && vehicles.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SPZ</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Znacka / Model</TableHead>
              <TableHead className="text-right">Kapacita</TableHead>
              <TableHead>Barva</TableHead>
              <TableHead>Rok</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.licensePlate}</TableCell>
                <TableCell>
                  <Badge variant="outline">{VEHICLE_TYPE_LABELS[v.vehicleType]}</Badge>
                </TableCell>
                <TableCell>{[v.brand, v.model].filter(Boolean).join(" ") || "-"}</TableCell>
                <TableCell className="text-right">{v.capacity}</TableCell>
                <TableCell>{v.color || "-"}</TableCell>
                <TableCell>{v.yearOfManufacture || "-"}</TableCell>
                <TableCell>
                  <Badge variant={v.isActive ? "default" : "secondary"}>
                    {v.isActive ? "Aktivni" : "Neaktivni"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">Zatim zadna vozidla</div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? "Upravit vozidlo" : "Pridat vozidlo"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="licensePlate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SPZ *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="vehicleType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ vozidla</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((key) => (
                          <SelectItem key={key} value={key}>{VEHICLE_TYPE_LABELS[key]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Znacka</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="model" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="capacity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kapacita *</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="color" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barva</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="yearOfManufacture" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rok vyroby</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Aktivni</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Poznamky</FormLabel>
                  <FormControl><Textarea rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>Zrusit</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingVehicle ? "Ulozit" : "Pridat"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Drivers Tab ----
function DriversTab({ companyId }: { companyId: number }) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<TransportDriver | null>(null);

  const { data: drivers, isLoading } = useQuery<TransportDriver[]>({
    queryKey: ["/api/transport", companyId, "drivers"],
    queryFn: () => api.get(`/api/transport/${companyId}/drivers`),
  });

  const form = useForm<DriverForm>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      licenseNumber: "",
      licenseCategories: "",
      isActive: true,
      notes: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: DriverForm) => {
      if (editingDriver) {
        return api.put(`/api/transport/${companyId}/drivers/${editingDriver.id}`, data);
      }
      return api.post(`/api/transport/${companyId}/drivers`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transport", companyId, "drivers"] });
      qc.invalidateQueries({ queryKey: ["/api/transport"] });
      successToast(editingDriver ? "Ridic byl aktualizovan" : "Ridic byl vytvoren");
      closeDialog();
    },
    onError: (error: Error) => errorToast(error),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/transport/${companyId}/drivers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transport", companyId, "drivers"] });
      qc.invalidateQueries({ queryKey: ["/api/transport"] });
      successToast("Ridic byl smazan");
    },
    onError: (error: Error) => errorToast(error),
  });

  const openCreate = () => {
    setEditingDriver(null);
    form.reset({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      licenseNumber: "",
      licenseCategories: "",
      isActive: true,
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (driver: TransportDriver) => {
    setEditingDriver(driver);
    form.reset({
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone || "",
      email: driver.email || "",
      licenseNumber: driver.licenseNumber || "",
      licenseCategories: driver.licenseCategories || "",
      isActive: driver.isActive,
      notes: driver.notes || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingDriver(null);
    form.reset();
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tohoto ridice?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Ridici ({drivers?.length ?? 0})</h3>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Pridat ridice
        </Button>
      </div>

      {drivers && drivers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jmeno</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Cislo RP</TableHead>
              <TableHead>Kategorie RP</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.firstName} {d.lastName}</TableCell>
                <TableCell>{d.phone || "-"}</TableCell>
                <TableCell>{d.email || "-"}</TableCell>
                <TableCell>{d.licenseNumber || "-"}</TableCell>
                <TableCell>{d.licenseCategories || "-"}</TableCell>
                <TableCell>
                  <Badge variant={d.isActive ? "default" : "secondary"}>
                    {d.isActive ? "Aktivni" : "Neaktivni"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">Zatim zadni ridici</div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDriver ? "Upravit ridice" : "Pridat ridice"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jmeno *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prijmeni *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cislo ridicaku</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="licenseCategories" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategorie ridicaku</FormLabel>
                    <FormControl><Input {...field} placeholder="B, C, D..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormLabel>Aktivni</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Poznamky</FormLabel>
                  <FormControl><Textarea rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>Zrusit</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingDriver ? "Ulozit" : "Pridat"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Events History Tab ----
function EventsHistoryTab({ companyId }: { companyId: number }) {
  const [, navigate] = useLocation();

  const { data: eventsData, isLoading } = useQuery<{ items: EventTransport[]; summary: { totalEvents: number; totalRevenue: number; pendingPayments: number } }>({
    queryKey: ["/api/transport", companyId, "events"],
    queryFn: () => api.get(`/api/transport/${companyId}/events`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = eventsData?.items ?? [];
  const totalEvents = eventsData?.summary?.totalEvents ?? items.length;
  const totalRevenue = eventsData?.summary?.totalRevenue ?? 0;
  const pendingCount = items.filter((e) => e.paymentStatus === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalEvents}</p>
                <p className="text-sm text-muted-foreground">Celkem akci</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Banknote className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                <p className="text-sm text-muted-foreground">Celkova trzba</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Nezaplaceno</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events table */}
      <Card>
        <CardHeader>
          <CardTitle>Historie akci</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Zatim zadne akce
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Akce</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Vozidlo</TableHead>
                  <TableHead>Ridic</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-right">Cena</TableHead>
                  <TableHead>Platba</TableHead>
                  <TableHead>Faktura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => e.eventId && navigate(`/events/${e.eventId}/edit`)}>
                    <TableCell className="font-medium">{e.eventName || "-"}</TableCell>
                    <TableCell>{e.eventDate ? dayjs(e.eventDate).format("DD.MM.YYYY") : "-"}</TableCell>
                    <TableCell>{e.vehicleLicensePlate || "-"}</TableCell>
                    <TableCell>{e.driverName || "-"}</TableCell>
                    <TableCell>
                      {e.transportType ? (
                        <Badge variant="outline">{TRANSPORT_TYPE_LABELS[e.transportType]}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">{e.price != null ? formatCurrency(e.price) : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={paymentStatusVariant(e.paymentStatus)}>
                        {TRANSPORT_PAYMENT_STATUS_LABELS[e.paymentStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>{e.invoiceNumber || "-"}</TableCell>
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

// ---- Main Edit Page ----
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
    onSuccess: (result: any) => {
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
          <Card>
            <CardHeader>
              <CardTitle>Zakladni informace</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nazev *</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="contactPerson" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kontaktni osoba</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresa</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="ic" render={({ field }) => (
                      <FormItem>
                        <FormLabel>IC</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="dic" render={({ field }) => (
                      <FormItem>
                        <FormLabel>DIC</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="bankAccount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bankovni ucet</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="isActive" render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormLabel>Aktivni</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poznamky</FormLabel>
                      <FormControl><Textarea rows={4} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Save className="w-4 h-4 mr-2" />
                      {isNew ? "Vytvorit" : "Ulozit"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
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
              <EventsHistoryTab companyId={companyId} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
