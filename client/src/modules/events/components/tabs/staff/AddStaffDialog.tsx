import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { StaffMember } from "@shared/types";
import { translateStaffRole, STAFF_ROLE_LABELS } from "@modules/staff/utils/staffRoles";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { Loader2, UserPlus, Search, Phone } from "lucide-react";
import { getPositionsForCategory } from "./staffUtils";

export interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string | null;
  eventId: number;
  assignedStaffIds: Set<number>;
  staffMembers: StaffMember[];
}

export default function AddStaffDialog({
  open,
  onOpenChange,
  category,
  eventId,
  assignedStaffIds,
  staffMembers,
}: AddStaffDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter staff members
  const filteredStaff = useMemo(() => {
    let filtered = staffMembers.filter(s => s.isActive);

    // Filter by category if specified
    if (category && category !== "all") {
      const positions = getPositionsForCategory(category);
      if (positions.length > 0) {
        filtered = filtered.filter(s =>
          s.position && positions.includes(s.position.toUpperCase())
        );
      }
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term) ||
        s.position?.toLowerCase().includes(term)
      );
    }

    // Filter out already assigned
    filtered = filtered.filter(s => !assignedStaffIds.has(s.id));

    return filtered;
  }, [staffMembers, category, searchTerm, assignedStaffIds]);

  // Group by position
  const groupedStaff = useMemo(() => {
    const groups: Record<string, StaffMember[]> = {};
    filteredStaff.forEach(s => {
      const pos = s.position || "Ostatní";
      if (!groups[pos]) groups[pos] = [];
      groups[pos].push(s);
    });
    return groups;
  }, [filteredStaff]);

  const addStaffMutation = useMutation({
    mutationFn: async (staffMember: StaffMember) => {
      return api.post(`/api/events/${eventId}/staff-assignments`, {
        staffMemberId: staffMember.id,
        assignmentStatus: "ASSIGNED",
        attendanceStatus: "UNKNOWN",
        hoursWorked: 0,
        paymentStatus: "PENDING",
      });
    },
    onSuccess: (_, staffMember) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "staff-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
      successToast(`${staffMember.firstName} ${staffMember.lastName}`);
    },
    onError: () => {
      errorToast("Nepodařilo se přiřadit personál");
    },
  });

  const categoryLabel = category && category !== "all"
    ? translateStaffRole(category.replace(/_[A-Z_]+$/, ''))
    : "Personál";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Přidat {categoryLabel}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat personál..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {staffMembers.length === 0
                ? "Žádný personál v databázi"
                : "Žádný dostupný personál"
              }
            </div>
          ) : (
            Object.entries(groupedStaff).map(([position, members]) => (
              <div key={position}>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  {STAFF_ROLE_LABELS[position] || position} ({members.length})
                </div>
                <div className="space-y-1">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {member.firstName} {member.lastName}
                        </div>
                        {member.phone && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addStaffMutation.mutate(member)}
                        disabled={addStaffMutation.isPending}
                      >
                        {addStaffMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
