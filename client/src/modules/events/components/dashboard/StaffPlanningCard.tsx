import { useState } from "react";
import {
  UserCheck,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import type { StaffingOverview, StaffAssignmentWithContact } from "@shared/types";

interface StaffPlanningCardProps {
  staffing: StaffingOverview;
  eventId: number;
}

const ATTENDANCE_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  UNKNOWN: { label: "Neznámý", className: "bg-gray-500" },
  CONFIRMED: { label: "Potvrzen", className: "bg-blue-500" },
  PRESENT: { label: "Přítomen", className: "bg-green-500" },
  ABSENT: { label: "Nepřítomen", className: "bg-red-500" },
  LEFT_EARLY: { label: "Odešel dříve", className: "bg-orange-500" },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Nezaplaceno", className: "bg-orange-500" },
  PAID: { label: "Zaplaceno", className: "bg-green-500" },
  PARTIAL: { label: "Částečně", className: "bg-yellow-500" },
};

export function StaffPlanningCard({ staffing, eventId }: StaffPlanningCardProps) {
  const [showContacts, setShowContacts] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const hasShortfall = staffing.required.some((r) => r.shortfall > 0);
  const presentCount = staffing.assignments.filter(
    (a) => a.attendanceStatus === "PRESENT"
  ).length;
  const totalAssigned = staffing.assignments.length;

  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };

  // Group assignments by role
  const assignmentsByRole = staffing.assignments.reduce(
    (acc, assignment) => {
      const role = assignment.role || "Bez role";
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(assignment);
      return acc;
    },
    {} as Record<string, StaffAssignmentWithContact[]>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCheck className="h-5 w-5 text-primary" />
          Personál
          <Badge
            variant={hasShortfall ? "destructive" : "secondary"}
            className="ml-auto"
          >
            {presentCount}/{totalAssigned} přítomno
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Requirements overview */}
        <div className="space-y-1.5">
          {staffing.required.map((req) => (
            <div
              key={req.category}
              className="flex items-center justify-between text-sm"
            >
              <span>{req.label}</span>
              <div className="flex items-center gap-2">
                <span
                  className={`font-medium ${
                    req.shortfall > 0 ? "text-red-500" : "text-green-600"
                  }`}
                >
                  {req.assigned}/{req.required}
                </span>
                {req.shortfall > 0 && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                {req.shortfall === 0 && req.required > 0 && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Staff list by role */}
        {Object.keys(assignmentsByRole).length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">
              Přiřazení
            </h4>
            {Object.entries(assignmentsByRole).map(([role, assignments]) => (
              <div key={role} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(role)}
                  className="w-full flex items-center justify-between p-2 bg-muted/30 hover:bg-muted/50 touch-manipulation min-h-[44px]"
                >
                  <div className="flex items-center gap-2">
                    {expandedCategories.has(role) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium text-sm">{role}</span>
                    <Badge variant="outline" className="text-xs">
                      {assignments.length}
                    </Badge>
                  </div>
                </button>

                {expandedCategories.has(role) && (
                  <div className="p-2 space-y-2">
                    {assignments.map((assignment) => (
                      <AssignmentItem
                        key={assignment.id}
                        assignment={assignment}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Show contacts button */}
        <Dialog open={showContacts} onOpenChange={setShowContacts}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full min-h-[44px] touch-manipulation"
            >
              <Phone className="h-4 w-4 mr-2" />
              Seznam kontaktů
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Kontakty na personál</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {staffing.assignments
                .filter((a) => a.staffMember)
                .map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {assignment.staffMember?.name || "Neznámý"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {assignment.role}
                      </div>
                      {assignment.staffMember?.phone && (
                        <a
                          href={`tel:${assignment.staffMember.phone}`}
                          className="flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                        >
                          <Phone className="h-3 w-3" />
                          {assignment.staffMember.phone}
                        </a>
                      )}
                      {assignment.staffMember?.email && (
                        <a
                          href={`mailto:${assignment.staffMember.email}`}
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          {assignment.staffMember.email}
                        </a>
                      )}
                    </div>
                    <Badge
                      className={`${ATTENDANCE_STATUS_LABELS[assignment.attendanceStatus]?.className || "bg-gray-500"} text-white text-xs`}
                    >
                      {ATTENDANCE_STATUS_LABELS[assignment.attendanceStatus]
                        ?.label || assignment.attendanceStatus}
                    </Badge>
                  </div>
                ))}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface AssignmentItemProps {
  assignment: StaffAssignmentWithContact;
}

function AssignmentItem({ assignment }: AssignmentItemProps) {
  const attendanceInfo = ATTENDANCE_STATUS_LABELS[assignment.attendanceStatus];
  const paymentInfo = PAYMENT_STATUS_LABELS[assignment.paymentStatus];

  return (
    <div className="flex items-center justify-between p-2 bg-background rounded border">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {assignment.staffMember?.name || "Nepřiřazeno"}
        </div>
        {assignment.staffMember?.phone && (
          <a
            href={`tel:${assignment.staffMember.phone}`}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            {assignment.staffMember.phone}
          </a>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Badge
          className={`${attendanceInfo?.className || "bg-gray-500"} text-white text-xs`}
        >
          {attendanceInfo?.label || assignment.attendanceStatus}
        </Badge>
        {assignment.paymentAmount && (
          <Badge
            variant="outline"
            className="text-xs flex items-center gap-1"
          >
            <Banknote className="h-3 w-3" />
            {assignment.paymentAmount} Kč
          </Badge>
        )}
      </div>
    </div>
  );
}
