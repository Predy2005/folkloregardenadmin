import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import type { StaffAttendance, StaffMember } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import dayjs from "dayjs";

const attendanceSchema = z.object({
  staffMemberId: z.number().min(1, "Vyberte člena personálu"),
  date: z.string().min(1, "Zadejte datum"),
  hoursWorked: z.number().min(0.1, "Počet hodin musí být větší než 0"),
  note: z.string().optional(),
});

type AttendanceForm = z.infer<typeof attendanceSchema>;

export default function StaffAttendance() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: attendances, isLoading } = useQuery<StaffAttendance[]>({
    queryKey: ["/api/staff-attendance"],
  });

  const { data: staff } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
  });

  const createForm = useForm<AttendanceForm>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      date: dayjs().format("YYYY-MM-DD"),
      hoursWorked: 8,
      note: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AttendanceForm) => {
      return await api.post("/api/staff-attendance", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Úspěch",
        description: "Docházka byla zaznamenána",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se zaznamenat docházku",
        variant: "destructive",
      });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.put(`/api/staff-attendance/${id}/mark-paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance"] });
      toast({
        title: "Úspěch",
        description: "Docházka označena jako zaplacená",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se označit docházku jako zaplacenou",
        variant: "destructive",
      });
    },
  });

  const filteredAttendances = attendances?.filter((attendance) => {
    const matchesSearch = attendance.staffMember
      ? `${attendance.staffMember.firstName} ${attendance.staffMember.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase())
      : true;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "paid" && attendance.isPaid) ||
      (statusFilter === "unpaid" && !attendance.isPaid);
    return matchesSearch && matchesStatus;
  });

  const totalUnpaidHours = attendances
    ?.filter((a) => !a.isPaid)
    .reduce((sum, a) => sum + a.hoursWorked, 0) || 0;

  const totalUnpaidAmount = attendances
    ?.filter((a) => !a.isPaid && a.staffMember?.hourlyRate)
    .reduce((sum, a) => sum + a.hoursWorked * (a.staffMember?.hourlyRate || 0), 0) || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Docházka personálu</h1>
          <p className="text-muted-foreground">Evidence odpracovaných hodin</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-attendance"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nová docházka
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Nezaplacené hodiny</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {totalUnpaidHours.toFixed(1)} h
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              ≈ {totalUnpaidAmount.toLocaleString()} Kč
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Celkový počet záznamů</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendances?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Docházka
              </CardTitle>
              <CardDescription>
                Celkem: {attendances?.length || 0} záznamů
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Všechny stavy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny stavy</SelectItem>
                  <SelectItem value="unpaid">Nezaplacené</SelectItem>
                  <SelectItem value="paid">Zaplacené</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat člena..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-attendance"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Načítání...</div>
          ) : filteredAttendances && filteredAttendances.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Člen personálu</TableHead>
                  <TableHead className="text-right">Hodiny</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead>Poznámka</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendances.map((attendance) => {
                  const amount = attendance.staffMember?.hourlyRate
                    ? attendance.hoursWorked * attendance.staffMember.hourlyRate
                    : 0;
                  return (
                    <TableRow key={attendance.id} data-testid={`row-attendance-${attendance.id}`}>
                      <TableCell>
                        {dayjs(attendance.date).format("DD.MM.YYYY")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {attendance.staffMember
                          ? `${attendance.staffMember.firstName} ${attendance.staffMember.lastName}`
                          : `ID: ${attendance.staffMemberId}`}
                      </TableCell>
                      <TableCell className="text-right">
                        {attendance.hoursWorked} h
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {amount > 0 ? `${amount.toLocaleString()} Kč` : "-"}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground max-w-xs truncate">
                          {attendance.note || "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        {attendance.isPaid ? (
                          <Badge variant="default">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Zaplaceno
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Nezaplaceno
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!attendance.isPaid && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsPaidMutation.mutate(attendance.id)}
                            disabled={markAsPaidMutation.isPending}
                            data-testid={`button-mark-paid-${attendance.id}`}
                          >
                            Označit jako zaplaceno
                          </Button>
                        )}
                        {attendance.isPaid && attendance.paidAt && (
                          <span className="text-sm text-muted-foreground">
                            {dayjs(attendance.paidAt).format("DD.MM.YYYY")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {search || statusFilter !== "all" ? "Žádné záznamy nenalezeny" : "Zatím žádné záznamy"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nová docházka</DialogTitle>
            <DialogDescription>Zaznamenejte odpracované hodiny</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="staffMemberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Člen personálu *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-staff-member">
                          <SelectValue placeholder="Vyberte člena" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staff?.filter((m) => m.active).map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.firstName} {member.lastName}
                            {member.hourlyRate && ` (${member.hourlyRate} Kč/h)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="hoursWorked"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Počet hodin *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        min="0.1"
                        placeholder="8"
                        data-testid="input-hours"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poznámka</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Poznámka k docházce" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {createMutation.isPending ? "Vytváření..." : "Vytvořit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
