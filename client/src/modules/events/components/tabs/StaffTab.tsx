import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import { useToggleSet } from "@/shared/hooks/useToggleSet";
import type { EventStaffAssignment, StaffMember } from "@shared/types";
import type { DashboardData } from "../../types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { formatCurrency } from "@/shared/lib/formatting";
import {
  useRecalculateStaffRequirements,
  useUpdateStaffRequirement,
  useResetStaffRequirement,
} from "../../hooks";
import { usePayAllStaff } from "../../hooks/useDashboardMutations";
import {
  Loader2,
  Plus,
  UserCheck,
  Check,
  X,
  DollarSign,
  Clock,
  Users,
  RefreshCw,
  AlertTriangle,
  Banknote,
} from "lucide-react";
import { AddStaffDialog, PaymentDialog, StaffCategorySection, StaffAssignmentRow } from "./staff";

export interface StaffTabProps {
  eventId: number;
  staffAssignments: EventStaffAssignment[];
  staffMembers: StaffMember[];
  isLoading: boolean;
}

export default function StaffTab({ eventId, staffAssignments, staffMembers, isLoading }: StaffTabProps) {
  const [addStaffCategory, setAddStaffCategory] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<EventStaffAssignment | null>(null);
  const expandedCategories = useToggleSet<string>();

  // Mutations for staff requirements
  const recalculateMutation = useRecalculateStaffRequirements(eventId);
  const updateRequirementMutation = useUpdateStaffRequirement(eventId);
  const resetRequirementMutation = useResetStaffRequirement(eventId);
  const payAllStaffMutation = usePayAllStaff(eventId);

  // Fetch dashboard data for staffing requirements
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/events", eventId, "manager-dashboard"],
    queryFn: () => api.get(`/api/events/${eventId}/manager-dashboard`),
    enabled: !!eventId,
  });

  const staffing = dashboardData?.staffing;

  // Get assigned staff IDs
  const assignedStaffIds = useMemo(() =>
    new Set(staffAssignments.map(a => a.staffMemberId)),
    [staffAssignments]
  );

  // Calculate totals
  const totals = useMemo(() => {
    const presentCount = staffAssignments.filter(a => a.attendanceStatus === "PRESENT").length;
    const paidCount = staffAssignments.filter(a => a.paymentStatus === "PAID").length;
    const totalHours = staffAssignments.reduce((sum, a) => sum + (a.hoursWorked || 0), 0);
    const totalPayment = staffAssignments.reduce((sum, a) => sum + (a.paymentAmount || 0), 0);
    const totalRequired = staffing?.required.reduce((sum, r) => sum + r.required, 0) || 0;
    const totalAssigned = staffAssignments.length;
    return { presentCount, paidCount, totalHours, totalPayment, totalRequired, totalAssigned };
  }, [staffAssignments, staffing]);

  // Toggle category expansion
  const toggleCategory = expandedCategories.toggle;

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/events/${eventId}/staff-assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
      successToast("Personál byl odebrán");
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const updateAllAttendanceMutation = useMutation({
    mutationFn: async (status: string) => {
      const promises = staffAssignments.map((a) =>
        api.put(`/api/events/${eventId}/staff-assignments/${a.id}/attendance`, { status })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
      successToast("Přítomnost aktualizována");
    },
    onError: () => {
      errorToast("Nepodařilo se aktualizovat přítomnost");
    },
  });

  const openPaymentDialog = (assignment: EventStaffAssignment) => {
    setSelectedAssignment(assignment);
    setPaymentDialogOpen(true);
  };

  const handleUpdateRequired = (category: string, count: number) => {
    updateRequirementMutation.mutate({ category, count });
  };

  const handleResetToAuto = (category: string) => {
    resetRequirementMutation.mutate(category);
  };

  if (isLoading || dashboardLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasShortfall = totals.totalAssigned < totals.totalRequired;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Personál</span>
            </div>
            <div className={`text-2xl font-bold ${hasShortfall ? "text-red-600" : "text-green-600"}`}>
              {totals.totalAssigned}/{totals.totalRequired}
            </div>
            {hasShortfall && (
              <div className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Chybí {totals.totalRequired - totals.totalAssigned}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Přítomno</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {totals.presentCount}/{staffAssignments.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Odpracováno</span>
            </div>
            <div className="text-2xl font-bold">{totals.totalHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">K výplatě</span>
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.totalPayment)}
            </div>
            <div className="text-xs text-muted-foreground">
              {totals.paidCount}/{staffAssignments.length} vyplaceno
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main staff card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Přehled personálu
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => recalculateMutation.mutate(false)}
                disabled={recalculateMutation.isPending}
                title="Přepočítat požadavky podle počtu hostů"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${recalculateMutation.isPending ? "animate-spin" : ""}`} />
                Přepočítat
              </Button>
              <Button size="sm" onClick={() => setAddStaffCategory("all")} data-testid="button-add-staff">
                <Plus className="h-4 w-4 mr-1" />
                Přidat
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick actions */}
          {staffAssignments.length > 0 && (
            <div className="flex gap-2 items-center pb-2 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateAllAttendanceMutation.mutate("PRESENT")}
                disabled={updateAllAttendanceMutation.isPending}
              >
                {updateAllAttendanceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Všichni přítomni
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateAllAttendanceMutation.mutate("UNKNOWN")}
                disabled={updateAllAttendanceMutation.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
              {totals.paidCount < staffAssignments.length && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => payAllStaffMutation.mutate()}
                  disabled={payAllStaffMutation.isPending}
                  className="ml-auto text-green-600 hover:text-green-700"
                >
                  {payAllStaffMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Banknote className="h-4 w-4 mr-1" />
                  )}
                  Vyplatit vše
                </Button>
              )}
            </div>
          )}

          {/* Staff by category */}
          {staffing && staffing.required.length > 0 ? (
            <div className="space-y-2">
              {staffing.required.map((req) => (
                <StaffCategorySection
                  key={req.category}
                  requirement={req}
                  assignments={staffAssignments}
                  isExpanded={expandedCategories.isOpen(req.category)}
                  onToggle={() => toggleCategory(req.category)}
                  onAddStaff={() => setAddStaffCategory(req.category)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onPayment={openPaymentDialog}
                  onUpdateRequired={handleUpdateRequired}
                  onResetToAuto={handleResetToAuto}
                  isUpdatingRequirement={updateRequirementMutation.isPending || resetRequirementMutation.isPending}
                  eventId={eventId}
                />
              ))}
            </div>
          ) : staffAssignments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Zatím není přiřazen žádný personál
            </div>
          ) : (
            <div className="space-y-1">
              {staffAssignments.map((assignment) => (
                <StaffAssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  eventId={eventId}
                  onDelete={() => deleteMutation.mutate(assignment.id)}
                  onPayment={() => openPaymentDialog(assignment)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <AddStaffDialog
        open={addStaffCategory !== null}
        onOpenChange={(open) => !open && setAddStaffCategory(null)}
        category={addStaffCategory}
        eventId={eventId}
        assignedStaffIds={assignedStaffIds}
        staffMembers={staffMembers}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        assignment={selectedAssignment}
        eventId={eventId}
        staffMember={staffMembers.find(m => m.id === selectedAssignment?.staffMemberId)}
      />
    </div>
  );
}
