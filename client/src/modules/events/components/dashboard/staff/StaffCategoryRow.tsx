import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Plus, Check, X, Pencil, RotateCcw } from "lucide-react";
import { Phone } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { InfoTooltip } from "@/shared/components/ui/info-tooltip";
import { Input } from "@/shared/components/ui/input";
import type { StaffRequirement, StaffAssignmentWithContact } from "@shared/types";

interface StaffCategoryRowProps {
  requirement: StaffRequirement;
  assignments: StaffAssignmentWithContact[];
  isExpanded: boolean;
  onToggle: () => void;
  onAddStaff: () => void;
  onMarkPresent: (assignmentId: number) => void;
  onRemoveStaff: (assignmentId: number) => void;
  onUpdateRequired?: (category: string, count: number) => void;
  onResetToAuto?: (category: string) => void;
  isUpdating: boolean;
  isRemoving: boolean;
  isUpdatingRequirement?: boolean;
  attendanceStatusStyles: Record<string, { label: string; className: string }>;
}

export function StaffCategoryRow({
  requirement,
  assignments,
  isExpanded,
  onToggle,
  onAddStaff,
  onMarkPresent,
  onRemoveStaff,
  onUpdateRequired,
  onResetToAuto,
  isUpdating,
  isRemoving,
  isUpdatingRequirement,
  attendanceStatusStyles,
}: StaffCategoryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(requirement.required);
  const hasShortfall = requirement.shortfall > 0;

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(requirement.required);
    setIsEditing(true);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateRequired && editValue !== requirement.required) {
      onUpdateRequired(requirement.category, editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditValue(requirement.required);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onResetToAuto) {
      onResetToAuto(requirement.category);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Category header - clickable */}
      <div
        className="flex items-center justify-between text-sm p-2 cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{requirement.label}</span>
          {requirement.isManualOverride && (
            <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-yellow-50 text-yellow-700 border-yellow-300">
              ručně
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <span className="text-muted-foreground">{requirement.assigned}/</span>
              <Input
                type="number"
                min={0}
                value={editValue}
                onChange={(e) => setEditValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 h-6 text-center text-sm p-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave(e as unknown as React.MouseEvent);
                  if (e.key === "Escape") handleCancel(e as unknown as React.MouseEvent);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-green-600 hover:text-green-700"
                onClick={handleSave}
                disabled={isUpdatingRequirement}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground"
                onClick={handleCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <InfoTooltip
                content={
                  <div className="space-y-1">
                    <div><span className="font-medium">Přiřazeno:</span> {requirement.assigned}</div>
                    <div><span className="font-medium">Potřeba:</span> {requirement.required}</div>
                    {requirement.isManualOverride && (
                      <div className="text-yellow-600 text-xs">Ručně upraveno</div>
                    )}
                    {hasShortfall && (
                      <div className="text-red-500 text-xs">Chybí: {requirement.shortfall}</div>
                    )}
                  </div>
                }
              >
                <span
                  className={`font-medium cursor-help ${
                    hasShortfall ? "text-red-500" : "text-green-600"
                  }`}
                >
                  {requirement.assigned}/{requirement.required}
                </span>
              </InfoTooltip>
              {onUpdateRequired && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  onClick={handleStartEdit}
                  title="Upravit požadavek"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {requirement.isManualOverride && onResetToAuto && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-yellow-600 hover:text-yellow-700"
                  onClick={handleReset}
                  title="Resetovat na automatický výpočet"
                  disabled={isUpdatingRequirement}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </>
          )}
          {!isEditing && hasShortfall && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          {!isEditing && !hasShortfall && requirement.required > 0 && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onAddStaff();
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded staff list */}
      {isExpanded && assignments.length > 0 && (
        <div className="border-t bg-violet-50/50 dark:bg-violet-950/20 p-2 space-y-1">
          {assignments.map((assignment) => (
            <StaffAssignmentItem
              key={assignment.id}
              assignment={assignment}
              onMarkPresent={() => onMarkPresent(assignment.id)}
              onRemove={() => onRemoveStaff(assignment.id)}
              isUpdating={isUpdating}
              isRemoving={isRemoving}
              attendanceStatusStyles={attendanceStatusStyles}
            />
          ))}
        </div>
      )}

      {/* Show empty state when expanded but no assignments */}
      {isExpanded && assignments.length === 0 && (
        <div className="border-t bg-violet-50/50 dark:bg-violet-950/20 p-3 text-center text-sm text-muted-foreground">
          Zadny prirazeny personal
        </div>
      )}
    </div>
  );
}

interface StaffAssignmentItemProps {
  assignment: StaffAssignmentWithContact;
  onMarkPresent: () => void;
  onRemove: () => void;
  isUpdating: boolean;
  isRemoving: boolean;
  attendanceStatusStyles: Record<string, { label: string; className: string }>;
}

function StaffAssignmentItem({
  assignment,
  onMarkPresent,
  onRemove,
  isUpdating,
  isRemoving,
  attendanceStatusStyles,
}: StaffAssignmentItemProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-background rounded border text-sm">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="font-medium truncate">
          {assignment.staffMember?.name || "Neznámý"}
        </span>
        {assignment.staffMember?.phone && (
          <a
            href={`tel:${assignment.staffMember.phone}`}
            className="text-xs text-muted-foreground hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="flex items-center gap-1">
        {/* Attendance status badge */}
        <Badge
          className={`${attendanceStatusStyles[assignment.attendanceStatus]?.className || "bg-gray-500"} text-white text-xs`}
        >
          {attendanceStatusStyles[assignment.attendanceStatus]?.label || assignment.attendanceStatus}
        </Badge>
        {/* Mark as present button */}
        {assignment.attendanceStatus !== "PRESENT" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
            onClick={(e) => {
              e.stopPropagation();
              onMarkPresent();
            }}
            disabled={isUpdating}
            title="Oznacit jako pritomneho"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        {/* Remove button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-100"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={isRemoving}
          title="Odebrat"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
