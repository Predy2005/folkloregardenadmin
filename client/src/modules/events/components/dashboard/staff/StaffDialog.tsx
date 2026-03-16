import { Phone, Mail, Plus, Loader2, Search, X, Check } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import type { StaffMember, StaffRequirement, StaffAssignmentWithContact } from "@shared/types";

export type DialogMode = "contacts" | "add";

interface StaffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: DialogMode;
  setMode: (mode: DialogMode) => void;
  selectedRoleLabel: string;
  selectedRoleId: number | null;
  staffSearch: string;
  setStaffSearch: (search: string) => void;
  roleFilter: string;
  setRoleFilter: (filter: string) => void;
  setSelectedRoleId: (id: number | null) => void;
  setSelectedRoleLabel: (label: string) => void;
  requirements: StaffRequirement[];
  filteredContacts: StaffAssignmentWithContact[];
  filteredAvailableStaff: StaffMember[];
  isLoadingStaff: boolean;
  onAddStaff: (staffMemberId: number, staffRoleId: number | null) => void;
  onMarkPresent: (assignmentId: number) => void;
  onRemoveStaff: (assignmentId: number) => void;
  isAdding: boolean;
  isUpdating: boolean;
  isRemoving: boolean;
  attendanceStatusStyles: Record<string, { label: string; className: string }>;
}

export function StaffDialog({
  isOpen,
  onClose,
  mode,
  setMode,
  selectedRoleLabel,
  selectedRoleId,
  staffSearch,
  setStaffSearch,
  roleFilter,
  setRoleFilter,
  setSelectedRoleId,
  setSelectedRoleLabel,
  requirements,
  filteredContacts,
  filteredAvailableStaff,
  isLoadingStaff,
  onAddStaff,
  onMarkPresent,
  onRemoveStaff,
  isAdding,
  isUpdating,
  isRemoving,
  attendanceStatusStyles,
}: StaffDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "contacts" ? "Kontakty na personal" : `Pridat personal - ${selectedRoleLabel}`}
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle tabs */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={mode === "contacts" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode("contacts");
              setRoleFilter("all");
            }}
          >
            <Phone className="h-4 w-4 mr-1" />
            Prirazeni
          </Button>
          <Button
            variant={mode === "add" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("add")}
          >
            <Plus className="h-4 w-4 mr-1" />
            Pridat
          </Button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat podle jmena nebo role..."
            value={staffSearch}
            onChange={(e) => setStaffSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Role filter */}
        <div className="flex flex-wrap gap-1.5 pb-2 border-b">
          <Button
            variant={roleFilter === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setRoleFilter("all")}
          >
            Vsichni
          </Button>
          {requirements.map((req) => {
            const count = mode === "contacts"
              ? filteredContacts.filter(a => a.roleId === req.roleId && a.staffMember).length
              : filteredAvailableStaff.length;
            return (
              <Button
                key={req.category}
                variant={roleFilter === String(req.roleId) ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setRoleFilter(String(req.roleId));
                  setSelectedRoleId(req.roleId);
                  setSelectedRoleLabel(req.label);
                }}
              >
                {req.label} {mode === "contacts" && `(${count})`}
              </Button>
            );
          })}
        </div>

        {/* Content */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {mode === "contacts" ? (
            <ContactsList
              contacts={filteredContacts}
              onMarkPresent={onMarkPresent}
              onRemove={onRemoveStaff}
              isUpdating={isUpdating}
              isRemoving={isRemoving}
              attendanceStatusStyles={attendanceStatusStyles}
            />
          ) : (
            <AvailableStaffList
              staffList={filteredAvailableStaff}
              isLoading={isLoadingStaff}
              onAdd={(staffId) => onAddStaff(staffId, selectedRoleId)}
              isAdding={isAdding}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ContactsListProps {
  contacts: StaffAssignmentWithContact[];
  onMarkPresent: (assignmentId: number) => void;
  onRemove: (assignmentId: number) => void;
  isUpdating: boolean;
  isRemoving: boolean;
  attendanceStatusStyles: Record<string, { label: string; className: string }>;
}

function ContactsList({
  contacts,
  onMarkPresent,
  onRemove,
  isUpdating,
  isRemoving,
  attendanceStatusStyles,
}: ContactsListProps) {
  if (contacts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Zadny personal v teto kategorii
      </p>
    );
  }

  return (
    <>
      {contacts.map((assignment) => (
        <div
          key={assignment.id}
          className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium">
              {assignment.staffMember?.name || "Neznamy"}
            </div>
            <div className="text-sm text-muted-foreground">
              {assignment.role}
            </div>
            <div className="flex items-center gap-3 mt-1">
              {assignment.staffMember?.phone && (
                <a
                  href={`tel:${assignment.staffMember.phone}`}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  {assignment.staffMember.phone}
                </a>
              )}
              {assignment.staffMember?.email && (
                <a
                  href={`mailto:${assignment.staffMember.email}`}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Mail className="h-3 w-3" />
                  {assignment.staffMember.email}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge
              className={`${attendanceStatusStyles[assignment.attendanceStatus]?.className || "bg-gray-500"} text-white text-xs`}
            >
              {attendanceStatusStyles[assignment.attendanceStatus]?.label || assignment.attendanceStatus}
            </Badge>
            {assignment.attendanceStatus !== "PRESENT" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                onClick={() => onMarkPresent(assignment.id)}
                disabled={isUpdating}
                title="Oznacit jako pritomneho"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-100"
              onClick={() => onRemove(assignment.id)}
              disabled={isRemoving}
              title="Odebrat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </>
  );
}

interface AvailableStaffListProps {
  staffList: StaffMember[];
  isLoading: boolean;
  onAdd: (staffId: number) => void;
  isAdding: boolean;
}

function AvailableStaffList({
  staffList,
  isLoading,
  onAdd,
  isAdding,
}: AvailableStaffListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (staffList.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Zadny dostupny personal
      </p>
    );
  }

  return (
    <>
      {staffList.map((staff) => (
        <button
          key={staff.id}
          onClick={() => onAdd(staff.id)}
          disabled={isAdding}
          className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
        >
          <div>
            <div className="font-medium">
              {staff.firstName} {staff.lastName}
            </div>
            <div className="text-sm text-muted-foreground">
              {staff.position || "Bez pozice"}
            </div>
          </div>
          {isAdding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      ))}
    </>
  );
}
