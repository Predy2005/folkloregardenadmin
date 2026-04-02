import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { staffRoleOptions, useStaffRoles } from "@modules/staff/utils/staffRoles";
import { staffSchema, type StaffForm } from "../types";
import type { StaffMember, StaffHistoryResponse } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { Badge } from "@/shared/components/ui/badge";
import { ArrowLeft, Save, Loader2, Users, Calendar, Clock, Banknote, AlertCircle } from "lucide-react";
import dayjs from "dayjs";

function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "paid":
      return <Badge variant="default">Zaplaceno</Badge>;
    case "partial":
      return <Badge variant="secondary">Částečně</Badge>;
    case "unpaid":
      return <Badge variant="destructive">Nezaplaceno</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function AttendanceStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "present":
      return <Badge variant="default">Přítomen</Badge>;
    case "absent":
      return <Badge variant="destructive">Nepřítomen</Badge>;
    case "confirmed":
      return <Badge variant="secondary">Potvrzeno</Badge>;
    default:
      return <Badge variant="outline">{status || "-"}</Badge>;
  }
}

function WorkHistoryTab({ staffId }: { staffId: string }) {
  const { data: history, isLoading } = useQuery<StaffHistoryResponse>({
    queryKey: ["/api/staff", staffId, "history"],
    queryFn: () => api.get(`/api/staff/${staffId}/history`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!history) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nepodařilo se načíst historii práce
      </div>
    );
  }

  const { summary, assignments } = history;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Celkem akcí
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Celkem hodin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalHours.toFixed(1)} h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Celkem vyplaceno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Number(summary.totalEarned).toLocaleString()} Kč
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Nezaplaceno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {Number(summary.totalUnpaid).toLocaleString()} Kč
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments table */}
      <Card>
        <CardHeader>
          <CardTitle>Přiřazení k akcím</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Zatím žádné přiřazení k akcím
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Akce</TableHead>
                  <TableHead>Pozice</TableHead>
                  <TableHead className="text-right">Hodiny</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead>Status platby</TableHead>
                  <TableHead>Docházka</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      {dayjs(assignment.eventDate).format("DD.MM.YYYY")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {assignment.eventName}
                    </TableCell>
                    <TableCell>{assignment.role}</TableCell>
                    <TableCell className="text-right">
                      {assignment.hoursWorked > 0 ? `${assignment.hoursWorked} h` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {assignment.paymentAmount
                        ? `${Number(assignment.paymentAmount).toLocaleString()} Kč`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={assignment.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <AttendanceStatusBadge status={assignment.attendanceStatus} />
                    </TableCell>
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

export default function StaffEditPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isNew = !id || id === "new";

  const { data: roles } = useStaffRoles();
  const options = staffRoleOptions(roles ?? []);

  const { data: member, isLoading } = useQuery<StaffMember>({
    queryKey: ["/api/staff", id],
    queryFn: () => api.get(`/api/staff/${id}`),
    enabled: !isNew && !!id,
  });

  const form = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      address: "",
      emergencyContact: "",
      emergencyPhone: "",
      position: "",
      hourlyRate: undefined,
      fixedRate: "",
      isGroup: false,
      groupSize: null,
      isActive: true,
      notes: "",
    },
  });

  useEffect(() => {
    if (member && !isNew) {
      form.reset({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        email: member.email || "",
        phone: member.phone || "",
        dateOfBirth: member.dateOfBirth || "",
        address: member.address || "",
        emergencyContact: member.emergencyContact || "",
        emergencyPhone: member.emergencyPhone || "",
        position: member.position || "",
        hourlyRate: member.hourlyRate != null ? Number(member.hourlyRate) : undefined,
        fixedRate: member.fixedRate != null ? String(member.fixedRate) : "",
        isGroup: member.isGroup ?? false,
        groupSize: member.groupSize ?? null,
        isActive: member.isActive,
        notes: member.notes || "",
      });
    }
  }, [member, isNew, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: StaffForm) => {
      if (isNew) {
        return api.post("/api/staff", data);
      } else {
        return api.put(`/api/staff/${id}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      successToast(isNew ? "Člen personálu vytvořen" : "Člen personálu uložen");
      navigate("/staff");
    },
    onError: (error: Error) => errorToast(error),
  });

  const handleSubmit = (data: StaffForm) => {
    saveMutation.mutate(data);
  };

  const watchIsGroup = form.watch("isGroup");

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const profileForm = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-6">
            {/* Basic info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Základní údaje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Group toggle */}
                <FormField
                  control={form.control}
                  name="isGroup"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Skupina / kapela
                        </FormLabel>
                        <FormDescription className="text-xs">
                          Zapněte pro hudební skupiny, kapely apod. s fixní cenou za celek
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{watchIsGroup ? "Název skupiny *" : "Jméno *"}</FormLabel>
                        <FormControl>
                          <Input placeholder={watchIsGroup ? "Kapela Xyz" : "Jan"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{watchIsGroup ? "Kontaktní osoba *" : "Příjmení *"}</FormLabel>
                        <FormControl>
                          <Input placeholder={watchIsGroup ? "Vedoucí kapely" : "Novák"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {watchIsGroup && (
                  <FormField
                    control={form.control}
                    name="groupSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Počet členů skupiny</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="5"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role / pozice *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte roli" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!watchIsGroup && (
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Datum narození</FormLabel>
                        <FormControl>
                          <Input placeholder="20.05.1982" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Aktivní</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sazby</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!watchIsGroup && (
                  <FormField
                    control={form.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hodinová sazba (Kč)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="200"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Částka se automaticky násobí odpracovanými hodinami
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="fixedRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {watchIsGroup ? "Fixní cena za skupinu (Kč) *" : "Fixní sazba (Kč)"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder={watchIsGroup ? "20000" : "1500"}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || "")}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {watchIsGroup
                          ? "Celková částka za celou skupinu / kapelu"
                          : "Fixní částka bez ohledu na hodiny (má přednost před hodinovou)"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kontakt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input placeholder="+420..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!watchIsGroup && (
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresa</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ulice, město..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Emergency + Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {watchIsGroup ? "Poznámky" : "Nouzový kontakt & poznámky"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!watchIsGroup && (
                  <>
                    <FormField
                      control={form.control}
                      name="emergencyContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nouzový kontakt</FormLabel>
                          <FormControl>
                            <Input placeholder="Jméno osoby" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emergencyPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nouzový telefon</FormLabel>
                          <FormControl>
                            <Input placeholder="+420..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poznámky</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={watchIsGroup ? "Repertoár, kontaktní údaje členů..." : "Interní poznámky..."}
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/staff")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {isNew ? "Nový člen personálu" : `${member?.firstName} ${member?.lastName}`}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isNew ? "Přidejte nového člena nebo skupinu" : "Úprava údajů"}
          </p>
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
          {isNew ? "Vytvořit" : "Uložit"}
        </Button>
      </div>

      {isNew ? (
        profileForm
      ) : (
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="history">Historie práce</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-6">
            {profileForm}
          </TabsContent>
          <TabsContent value="history" className="mt-6">
            {id && <WorkHistoryTab staffId={id} />}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
