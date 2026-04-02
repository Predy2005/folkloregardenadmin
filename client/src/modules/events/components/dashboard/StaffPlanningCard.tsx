import { useState } from "react";
import { UserCheck, Phone, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { InfoTooltip } from "@/shared/components/ui/info-tooltip";
import { api } from "@/shared/lib/api";
import { useToggleSet } from "@/shared/hooks/useToggleSet";
import { ATTENDANCE_STATUS_STYLES } from "@/shared/lib/constants";
import {
  useAddStaffAssignment,
  useRemoveStaffAssignment,
  useUpdateStaffAttendance,
  useRecalculateStaffRequirements,
  useUpdateStaffRequirement,
  useResetStaffRequirement,
} from "../../hooks";
import type { StaffingOverview, StaffMember } from "@shared/types";
import { StaffCategoryRow, StaffDialog, type DialogMode } from "./staff";

interface StaffPlanningCardProps {
  staffing: StaffingOverview;
  eventId: number;
}

export function StaffPlanningCard({ staffing, eventId }: StaffPlanningCardProps) {
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("contacts");
  const expandedCategories = useToggleSet<string>();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedRoleLabel, setSelectedRoleLabel] = useState<string>("");
  const [staffSearch, setStaffSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const addStaffMutation = useAddStaffAssignment(eventId);
  const removeStaffMutation = useRemoveStaffAssignment(eventId);
  const updateAttendanceMutation = useUpdateStaffAttendance(eventId);
  const recalculateMutation = useRecalculateStaffRequirements(eventId);
  const updateRequirementMutation = useUpdateStaffRequirement(eventId);
  const resetRequirementMutation = useResetStaffRequirement(eventId);

  // Calculate totals - use 'assigned' for planning view
  const hasShortfall = staffing.required.some((r) => r.shortfall > 0);
  const totalRequired = staffing.required.reduce((sum, r) => sum + r.required, 0);
  const totalAssigned = staffing.required.reduce((sum, r) => sum + r.assigned, 0);

  // Fetch available staff members
  const { data: availableStaff, isLoading: isLoadingStaff } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
    queryFn: () => api.get("/api/staff"),
    enabled: staffDialogOpen,
  });

  // Filter assigned contacts by role and search
  const filteredContacts = staffing.assignments.filter((a) => {
    if (!a.staffMember) return false;
    if (roleFilter !== "all") {
      const filterRoleId = Number(roleFilter);
      if (a.roleId !== filterRoleId) return false;
    }
    if (staffSearch) {
      const search = staffSearch.toLowerCase();
      const name = a.staffMember.name?.toLowerCase() || "";
      const role = a.role?.toLowerCase() || "";
      return name.includes(search) || role.includes(search);
    }
    return true;
  });

  // Filter available staff for adding (exclude already assigned, filter by role)
  const assignedStaffIds = new Set(staffing.assignments.map(a => a.staffMember?.id).filter(Boolean));
  const filteredAvailableStaff = (availableStaff || []).filter(staff => {
    if (assignedStaffIds.has(staff.id)) return false;

    // Filter by selected role category
    if (roleFilter !== "all" && selectedRoleLabel) {
      const req = staffing.required.find(r => String(r.roleId) === roleFilter);
      if (req) {
        const categoryBase = req.category.replace(/_[A-Z_]+$/, '').toLowerCase();
        const categoryMap: Record<string, string[]> = {
          waiter: ['WAITER', 'HEAD_WAITER'],
          chef: ['CHEF', 'HEAD_CHEF', 'SOUS_CHEF', 'PREP_COOK'],
          coordinator: ['COORDINATOR'],
          bartender: ['BARTENDER'],
          hostess: ['HOSTESS'],
          security: ['SECURITY'],
          musician: ['MUSICIAN'],
          dancer: ['DANCER'],
          photographer: ['PHOTOGRAPHER'],
          sound_tech: ['SOUND_TECH'],
          cleaner: ['CLEANER'],
          driver: ['DRIVER'],
          manager: ['MANAGER'],
        };
        const allowedPositions = categoryMap[categoryBase] || [];
        if (allowedPositions.length > 0 && staff.position) {
          if (!allowedPositions.includes(staff.position.toUpperCase())) return false;
        }
      }
    }

    if (!staffSearch) return true;
    const search = staffSearch.toLowerCase();
    const name = `${staff.firstName} ${staff.lastName}`.toLowerCase();
    return name.includes(search) || staff.position?.toLowerCase().includes(search);
  });

  const toggleCategory = expandedCategories.toggle;

  const getAssignmentsForRole = (roleId: number | null) => {
    return staffing.assignments.filter(a => a.roleId === roleId);
  };

  const openStaffDialog = (mode: DialogMode, category?: string, roleId?: number | null) => {
    setDialogMode(mode);
    setSelectedRoleLabel(category || "");
    setSelectedRoleId(roleId ?? null);
    if (mode === "add" && roleId !== undefined) {
      setRoleFilter(roleId !== null ? String(roleId) : "all");
    }
    setStaffSearch("");
    setStaffDialogOpen(true);
  };

  const closeStaffDialog = () => {
    setStaffDialogOpen(false);
    setStaffSearch("");
    setRoleFilter("all");
  };

  const handleAddStaff = (staffMemberId: number, staffRoleId: number | null) => {
    addStaffMutation.mutate({ staffMemberId, staffRoleId });
  };

  const handleMarkPresent = (assignmentId: number) => {
    updateAttendanceMutation.mutate({ assignmentId, status: "PRESENT" });
  };

  const handleRemoveStaff = (assignmentId: number) => {
    removeStaffMutation.mutate(assignmentId);
  };

  const handleRecalculate = () => {
    recalculateMutation.mutate(false);
  };

  const handleUpdateRequired = (category: string, count: number) => {
    updateRequirementMutation.mutate({ category, count });
  };

  const handleResetToAuto = (category: string) => {
    resetRequirementMutation.mutate(category);
  };

  const isUpdatingRequirement = updateRequirementMutation.isPending || resetRequirementMutation.isPending;

  return (
    <>
      <div className="p-4 space-y-3">
        {/* Quick stats toolbar */}
        <div className="flex items-center justify-between">
          <InfoTooltip
            content={
              <div className="space-y-1">
                <div><span className="font-medium">Přiřazeno:</span> {totalAssigned} osob</div>
                <div><span className="font-medium">Potřeba:</span> {totalRequired} osob</div>
                {hasShortfall && (
                  <div className="text-red-500 text-xs pt-1 border-t">
                    Chybí {totalRequired - totalAssigned} osob
                  </div>
                )}
              </div>
            }
          >
            <Badge
              variant={hasShortfall ? "destructive" : "secondary"}
              className="cursor-help"
            >
              {totalAssigned}/{totalRequired}
            </Badge>
          </InfoTooltip>
          <InfoTooltip content="Přepočítat požadavky na personál podle počtu hostů">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRecalculate}
              disabled={recalculateMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 ${recalculateMutation.isPending ? "animate-spin" : ""}`} />
            </Button>
          </InfoTooltip>
        </div>

        {/* Requirements overview with expandable staff list */}
        <div className="space-y-1">
          {staffing.required.map((req) => (
            <StaffCategoryRow
              key={req.category}
              requirement={req}
              assignments={getAssignmentsForRole(req.roleId)}
              isExpanded={expandedCategories.isOpen(req.category)}
              onToggle={() => toggleCategory(req.category)}
              onAddStaff={() => openStaffDialog("add", req.label, req.roleId)}
              onMarkPresent={handleMarkPresent}
              onRemoveStaff={handleRemoveStaff}
              onUpdateRequired={handleUpdateRequired}
              onResetToAuto={handleResetToAuto}
              isUpdating={updateAttendanceMutation.isPending}
              isRemoving={removeStaffMutation.isPending}
              isUpdatingRequirement={isUpdatingRequirement}
              attendanceStatusStyles={ATTENDANCE_STATUS_STYLES}
            />
          ))}
        </div>

        {/* Show staff dialog button */}
        <Button
          variant="outline"
          className="w-full min-h-[44px] touch-manipulation"
          onClick={() => openStaffDialog("contacts")}
        >
          <Phone className="h-4 w-4 mr-2" />
          Seznam kontaktu
        </Button>
      </div>

      <StaffDialog
        isOpen={staffDialogOpen}
        onClose={closeStaffDialog}
        mode={dialogMode}
        setMode={setDialogMode}
        selectedRoleLabel={selectedRoleLabel}
        selectedRoleId={selectedRoleId}
        staffSearch={staffSearch}
        setStaffSearch={setStaffSearch}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        setSelectedRoleId={setSelectedRoleId}
        setSelectedRoleLabel={setSelectedRoleLabel}
        requirements={staffing.required}
        filteredContacts={filteredContacts}
        filteredAvailableStaff={filteredAvailableStaff}
        isLoadingStaff={isLoadingStaff}
        onAddStaff={handleAddStaff}
        onMarkPresent={handleMarkPresent}
        onRemoveStaff={handleRemoveStaff}
        isAdding={addStaffMutation.isPending}
        isUpdating={updateAttendanceMutation.isPending}
        isRemoving={removeStaffMutation.isPending}
        attendanceStatusStyles={ATTENDANCE_STATUS_STYLES}
      />
    </>
  );
}
