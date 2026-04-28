import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { EventStaffAssignment, StaffRequirement } from "@shared/types";
import { translateStaffRole } from "@modules/staff/utils/staffRoles";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { errorToast } from "@/shared/lib/toast-helpers";
import { formatCurrency } from "@/shared/lib/formatting";
import {
  Loader2,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  UserPlus,
  DollarSign,
  Clock,
  Pencil,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { matchRoleToCategory } from "./staffUtils";

// =================== StaffCategorySection ===================

export interface StaffCategorySectionProps {
  requirement: StaffRequirement;
  assignments: EventStaffAssignment[];
  isExpanded: boolean;
  onToggle: () => void;
  onAddStaff: () => void;
  onDelete: (id: number) => void;
  onPayment: (assignment: EventStaffAssignment) => void;
  onUpdateRequired: (category: string, count: number) => void;
  onResetToAuto: (category: string) => void;
  isUpdatingRequirement: boolean;
  eventId: number;
}

export default function StaffCategorySection({
  requirement,
  assignments,
  isExpanded,
  onToggle,
  onAddStaff,
  onDelete,
  onPayment,
  onUpdateRequired,
  onResetToAuto,
  isUpdatingRequirement,
  eventId,
}: StaffCategorySectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(requirement.required);

  const { label, required, assigned, category, assignmentIds } = requirement;
  const hasShortfall = assigned < required;
  const isFulfilled = assigned >= required;

  // Get assignments for this category - use backend IDs if available, fallback to position matching
  const categoryAssignments = assignmentIds?.length
    ? assignments.filter((a) => assignmentIds.includes(a.id))
    : assignments.filter((a) => {
        const member = a.staffMember;
        if (!member) return false;
        return matchRoleToCategory(member.position || "", category);
      });

  const handleSave = () => {
    if (editValue !== requirement.required) {
      onUpdateRequired(category, editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(requirement.required);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Category header */}
      <div
        className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${
          hasShortfall
            ? "bg-red-50 dark:bg-red-950/20"
            : isFulfilled && required > 0
            ? "bg-green-50 dark:bg-green-950/20"
            : "bg-muted/30"
        }`}
        onClick={onToggle}
      >
        {categoryAssignments.length > 0 ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )
        ) : (
          <div className="w-4" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{label}</span>
            {requirement.isManualOverride && (
              <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-yellow-50 text-yellow-700 border-yellow-300">
                ručně
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">{assigned}/</span>
              <Input
                type="number"
                min={0}
                value={editValue}
                onChange={(e) => setEditValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 h-7 text-center text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={handleSave} disabled={isUpdatingRequirement}>
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Badge
                variant={hasShortfall ? "destructive" : isFulfilled && required > 0 ? "default" : "secondary"}
                className={`${isFulfilled && required > 0 ? "bg-green-600" : ""}`}
              >
                {assigned}/{required}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => { setEditValue(required); setIsEditing(true); }}
                title="Upravit požadavek"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              {requirement.isManualOverride && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-yellow-600"
                  onClick={() => onResetToAuto(category)}
                  title="Reset na auto"
                  disabled={isUpdatingRequirement}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onAddStaff}
                title="Přidat personál"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Expanded assignments */}
      {isExpanded && categoryAssignments.length > 0 && (
        <div className="border-t bg-background p-2 space-y-1">
          {categoryAssignments.map((assignment) => (
            <StaffAssignmentRow
              key={assignment.id}
              assignment={assignment}
              eventId={eventId}
              onDelete={() => onDelete(assignment.id)}
              onPayment={() => onPayment(assignment)}
              compact
            />
          ))}
        </div>
      )}

      {/* Empty state when expanded */}
      {isExpanded && categoryAssignments.length === 0 && (
        <div className="border-t bg-background p-3 text-center text-sm text-muted-foreground">
          Žádný přiřazený personál
        </div>
      )}
    </div>
  );
}

// =================== StaffAssignmentRow ===================

export interface StaffAssignmentRowProps {
  assignment: EventStaffAssignment;
  eventId: number;
  onDelete: () => void;
  onPayment: () => void;
  compact?: boolean;
}

export function StaffAssignmentRow({ assignment, eventId, onDelete, onPayment, compact }: StaffAssignmentRowProps) {
  const isPresent = assignment.attendanceStatus === "PRESENT";
  const isAbsent = assignment.attendanceStatus === "ABSENT";
  const isPaid = assignment.paymentStatus === "PAID";

  const updateAttendanceMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return api.put(`/api/events/${eventId}/staff-assignments/${assignment.id}/attendance`, {
        status: newStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
    },
    onError: () => {
      errorToast("Nepodařilo se aktualizovat přítomnost");
    },
  });

  const isPending = updateAttendanceMutation.isPending;
  const staffName = assignment.staffMember
    ? `${assignment.staffMember.firstName} ${assignment.staffMember.lastName}`
    : "Neznámý";

  return (
    <div
      className={`flex items-center gap-2 ${compact ? "p-2" : "p-3"} rounded border text-sm transition-colors ${
        isPresent
          ? "bg-green-50 dark:bg-green-950/20 border-green-200"
          : isAbsent
          ? "bg-red-50 dark:bg-red-950/20 border-red-200"
          : "bg-background"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate flex items-center gap-1.5">
          {staffName}
          {assignment.staffMember?.isGroup && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal">
              {assignment.staffMember.groupSize ? `${assignment.staffMember.groupSize} os.` : "skupina"}
            </Badge>
          )}
          <ConfirmationBadge assignment={assignment} />
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
          {assignment.staffMember?.position && (
            <span>{translateStaffRole(assignment.staffMember.position)}</span>
          )}
          {assignment.hoursWorked > 0 && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {assignment.hoursWorked}h
            </span>
          )}
          {assignment.paymentAmount != null && assignment.paymentAmount > 0 && (
            <span className={`flex items-center gap-0.5 ${isPaid ? 'text-green-600' : ''}`}>
              {formatCurrency(assignment.paymentAmount)}
              {isPaid && <Check className="h-3 w-3" />}
            </span>
          )}
          {assignment.assignmentStatus === "DECLINED" && assignment.declineReason && (
            <span className="text-red-600 italic">
              Důvod: {assignment.declineReason}
            </span>
          )}
          {assignment.assignmentStatus === "CONFIRMED" && assignment.confirmedAt && (
            <span className="text-green-700">
              Potvrzeno {new Date(assignment.confirmedAt).toLocaleDateString("cs-CZ", {
                day: "numeric",
                month: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1 shrink-0">
        <Button
          variant={isPresent ? "default" : "outline"}
          size="icon"
          className={`h-8 w-8 ${isPresent ? "bg-green-600 hover:bg-green-700" : ""}`}
          onClick={() => updateAttendanceMutation.mutate(isPresent ? "UNKNOWN" : "PRESENT")}
          disabled={isPending}
          title={isPresent ? "Zrušit přítomnost" : "Přítomen"}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          variant={isAbsent ? "destructive" : "outline"}
          size="icon"
          className="h-8 w-8"
          onClick={() => updateAttendanceMutation.mutate(isAbsent ? "UNKNOWN" : "ABSENT")}
          disabled={isPending}
          title={isAbsent ? "Zrušit nepřítomnost" : "Nepřítomen"}
        >
          <X className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPayment} title="Platba">
          <DollarSign className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onDelete}
          title="Odstranit"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// =================== ConfirmationBadge ===================

/**
 * Badge ukazující, jestli personál v mobilní app reagoval na nominaci:
 *   - ASSIGNED  → „Čeká na potvrzení" (oranžová)
 *   - CONFIRMED → „Potvrzeno"        (zelená)
 *   - DECLINED  → „Odhlásil se"      (červená)
 *
 * Hover/title obsahuje detailní info (kdy potvrdil / důvod odhlášení).
 */
export function ConfirmationBadge({ assignment }: { assignment: EventStaffAssignment | { assignmentStatus: string; confirmedAt?: string | null; declineReason?: string | null } }) {
  const status = assignment.assignmentStatus;
  if (status === "CONFIRMED") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 h-4 font-normal border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800"
        title={
          assignment.confirmedAt
            ? `Potvrzeno v mobilu ${new Date(assignment.confirmedAt).toLocaleString("cs-CZ")}`
            : "Personál v mobilu potvrdil účast"
        }
      >
        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
        Potvrdil
      </Badge>
    );
  }
  if (status === "DECLINED") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 h-4 font-normal border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800"
        title={
          assignment.declineReason
            ? `Odhlásil se v mobilu — důvod: ${assignment.declineReason}`
            : "Personál se v mobilu odhlásil"
        }
      >
        <XCircle className="h-2.5 w-2.5 mr-0.5" />
        Odhlásil se
      </Badge>
    );
  }
  // ASSIGNED nebo cokoliv jiného → čeká na potvrzení
  return (
    <Badge
      variant="outline"
      className="text-[10px] px-1.5 py-0 h-4 font-normal border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
      title="Personál ještě v mobilu nereagoval na nominaci"
    >
      <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
      Čeká
    </Badge>
  );
}
