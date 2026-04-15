import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { StaffAttendance, StaffMember, Event } from "@shared/types";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { useAuth } from "@modules/auth";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { attendanceSchema, type AttendanceForm } from "../types";
import { Plus } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import dayjs from "dayjs";
import { AttendanceSummary } from "../components/AttendanceSummary";
import { AttendanceFilters } from "../components/AttendanceFilters";
import { AttendanceTable } from "../components/AttendanceTable";
import { CreateAttendanceDialog } from "../dialogs/CreateAttendanceDialog";
import { MarkPaidDialog } from "../dialogs/MarkPaidDialog";
import { useBulkSelection } from "@/shared/hooks/useBulkSelection";

export default function StaffAttendance() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [markPaidId, setMarkPaidId] = useState<number | null>(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [staffMemberFilter, setStaffMemberFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { isSuperAdmin } = useAuth();

  const { data: attendances, isLoading } = useQuery<StaffAttendance[]>({ queryKey: ["/api/staff-attendance"] });
  const { data: staff } = useQuery<StaffMember[]>({ queryKey: ["/api/staff"] });
  const { data: events } = useQuery<Event[]>({ queryKey: ["/api/events"] });

  const createForm = useForm<AttendanceForm>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: { attendanceDate: dayjs().format("YYYY-MM-DD"), hoursWorked: 8, notes: "", eventId: null },
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (staffMemberFilter !== "all") count++;
    if (eventFilter !== "all") count++;
    return count;
  }, [dateFrom, dateTo, staffMemberFilter, eventFilter]);

  const filteredAttendances = attendances?.filter((attendance) => {
    const name = attendance.staffMemberName ?? (attendance.staffMember ? `${attendance.staffMember.firstName} ${attendance.staffMember.lastName}` : "");
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "paid" && attendance.isPaid) || (statusFilter === "unpaid" && !attendance.isPaid);
    const matchesDateFrom = !dateFrom || dayjs(attendance.attendanceDate).isSame(dayjs(dateFrom), "day") || dayjs(attendance.attendanceDate).isAfter(dayjs(dateFrom), "day");
    const matchesDateTo = !dateTo || dayjs(attendance.attendanceDate).isSame(dayjs(dateTo), "day") || dayjs(attendance.attendanceDate).isBefore(dayjs(dateTo), "day");
    const matchesStaffMember = staffMemberFilter === "all" || String(attendance.staffMemberId) === staffMemberFilter;
    const matchesEvent = eventFilter === "all" || (eventFilter === "none" && !attendance.eventId) || String(attendance.eventId) === eventFilter;
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo && matchesStaffMember && matchesEvent;
  });

  const totalUnpaidHours = attendances?.filter((a) => !a.isPaid).reduce((sum, a) => sum + Number(a.hoursWorked), 0) || 0;
  const totalUnpaidAmount = attendances?.filter((a) => !a.isPaid && a.staffMember?.hourlyRate).reduce((sum, a) => sum + Number(a.hoursWorked) * (Number(a.staffMember?.hourlyRate) || 0), 0) || 0;

  const getId = useCallback((a: StaffAttendance) => a.id, []);
  const { selectedIds, isAllSelected: allSelected, toggleSelect, toggleSelectAll, clearSelection } = useBulkSelection({ items: filteredAttendances || [], getId });
  const someSelected = filteredAttendances ? filteredAttendances.some((a) => selectedIds.has(a.id)) && !allSelected : false;

  const createMutation = useMutation({
    mutationFn: async (data: AttendanceForm) => await api.post("/api/staff-attendance", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance"] }); setIsCreateOpen(false); createForm.reset(); successToast("Docházka byla zaznamenána"); },
    onError: (error: Error) => errorToast(error),
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async ({ id, paymentNote }: { id: number; paymentNote?: string }) => await api.put(`/api/staff-attendance/${id}/mark-paid`, { paymentNote }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance"] }); setMarkPaidId(null); setPaymentNote(""); successToast("Docházka označena jako zaplacená"); },
    onError: (error: Error) => errorToast(error),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => await api.delete(`/api/staff-attendance/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance"] }); successToast("Záznam docházky smazán"); },
    onError: (error: Error) => errorToast(error),
  });

  const bulkMarkPaidMutation = useMutation({
    mutationFn: async (ids: number[]) => await api.put("/api/staff-attendance/bulk-mark-paid", { ids }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance"] }); clearSelection(); successToast("Vybrané záznamy označeny jako zaplacené"); },
    onError: (error: Error) => errorToast(error),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => await api.delete("/api/staff-attendance/bulk-delete", { data: { ids } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance"] }); clearSelection(); successToast("Vybrané záznamy smazány"); },
    onError: (error: Error) => errorToast(error),
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Docházka personálu" description="Evidence odpracovaných hodin">
        <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90" data-testid="button-create-attendance">
          <Plus className="w-4 h-4 mr-2" />
          Nová docházka
        </Button>
      </PageHeader>

      <AttendanceSummary totalUnpaidHours={totalUnpaidHours} totalUnpaidAmount={totalUnpaidAmount} totalRecords={attendances?.length || 0} />

      <Card>
        <AttendanceFilters
          search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
          staffMemberFilter={staffMemberFilter} setStaffMemberFilter={setStaffMemberFilter}
          eventFilter={eventFilter} setEventFilter={setEventFilter}
          filtersOpen={filtersOpen} setFiltersOpen={setFiltersOpen}
          activeFilterCount={activeFilterCount} totalCount={attendances?.length || 0}
          staff={staff} events={events} isSuperAdmin={isSuperAdmin} selectedIds={selectedIds}
          onBulkMarkPaid={() => bulkMarkPaidMutation.mutate(Array.from(selectedIds))}
          onBulkDelete={() => { if (confirm(`Opravdu smazat ${selectedIds.size} záznamů docházky?`)) bulkDeleteMutation.mutate(Array.from(selectedIds)); }}
          onClearSelection={clearSelection}
          bulkMarkPaidPending={bulkMarkPaidMutation.isPending} bulkDeletePending={bulkDeleteMutation.isPending}
        />
        <CardContent>
          <AttendanceTable
            attendances={filteredAttendances || []} isLoading={isLoading}
            hasFilters={!!(search || statusFilter !== "all" || activeFilterCount > 0)}
            isSuperAdmin={isSuperAdmin} selectedIds={selectedIds}
            onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll}
            allSelected={allSelected} someSelected={someSelected}
            onMarkPaid={(id) => setMarkPaidId(id)} onDelete={(id) => deleteMutation.mutate(id)}
            markPaidPending={markAsPaidMutation.isPending} deletePending={deleteMutation.isPending}
          />
        </CardContent>
      </Card>

      <CreateAttendanceDialog
        isOpen={isCreateOpen} onOpenChange={setIsCreateOpen}
        form={createForm} staff={staff} events={events}
        isPending={createMutation.isPending} onSubmit={(data) => createMutation.mutate(data)}
      />

      <MarkPaidDialog
        markPaidId={markPaidId} paymentNote={paymentNote} setPaymentNote={setPaymentNote}
        onClose={() => { setMarkPaidId(null); setPaymentNote(""); }}
        onConfirm={() => { if (markPaidId !== null) markAsPaidMutation.mutate({ id: markPaidId, paymentNote: paymentNote || undefined }); }}
        isPending={markAsPaidMutation.isPending}
      />
    </div>
  );
}
