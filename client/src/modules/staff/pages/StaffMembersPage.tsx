// file: `client/src/pages/StaffMembers.tsx`
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { StaffMember } from "@shared/types";
import { Card, CardContent } from "@/shared/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffRoleOptions, useStaffRoles, translateStaffRole } from "@modules/staff/utils/staffRoles";
import { staffSchema, type StaffForm } from "../types";
import { StaffHeader, StaffListHeader } from "../components/StaffHeader";
import { StaffTable } from "../components/StaffTable";
import { StaffFormDialog } from "../components/StaffFormDialog";
import { useFormDialog } from "@/shared/hooks/useFormDialog";
import { useCrudMutations } from "@/shared/hooks/useCrudMutations";
import { api } from "@/shared/lib/api";

export default function StaffMembers() {
  const [search, setSearch] = useState("");
  const dialog = useFormDialog<StaffMember>();

  const { data: staff, isLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
    queryFn: async () => api.get("/api/staff"),
  });

  // načíst centrální role
  const { data: roles } = useStaffRoles();
  const options = staffRoleOptions(roles ?? []);

  const form = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      dateOfBirth: "",
      firstName: "",
      position: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      emergencyPhone: "",
      fixedRate: "",
      emergencyContact: "",
      isActive: true,
    },
  });

  const { createMutation, updateMutation, deleteMutation, isPending } = useCrudMutations<StaffForm>({
    endpoint: "/api/staff",
    queryKey: ["/api/staff"],
    entityName: "Člen personálu",
    onCreateSuccess: () => { dialog.close(); form.reset(); },
    onUpdateSuccess: () => dialog.close(),
  });

  const filteredStaff = staff?.filter(
    (member) =>
      `${member.firstName} ${member.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase()),
  );

  function resolveRoleLabel(position: string | number | null | undefined) {
    if (!position) return "Nepřiřazeno";
    return translateStaffRole(String(position));
  }

  const handleEdit = (member: StaffMember) => {
    dialog.openEdit(member);
    form.reset({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      dateOfBirth: member.dateOfBirth ?? "",
      address: member.address ?? "",
      phone: member.phone || "",
      emergencyContact: (member as any).emergencyContact || "",
      emergencyPhone: (member as any).emergencyPhone || "",
      position: member.position ?? "",
      hourlyRate:
        member.hourlyRate != null ? Number(member.hourlyRate) : undefined,
      isActive: member.isActive,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tohoto člena personálu?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <StaffHeader
        search={search}
        onSearchChange={setSearch}
        staffCount={staff?.length || 0}
        onCreateClick={() => { dialog.openCreate(); form.reset(); }}
      />

      <Card>
        <StaffListHeader
          search={search}
          onSearchChange={setSearch}
          staffCount={staff?.length || 0}
        />
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Načítání...
            </div>
          ) : filteredStaff && filteredStaff.length > 0 ? (
            <StaffTable
              members={filteredStaff}
              resolveRoleLabel={resolveRoleLabel}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "Žádní členové nenalezeni" : "Zatím žádní členové"}
            </div>
          )}
        </CardContent>
      </Card>

      <StaffFormDialog
        open={dialog.isOpen}
        isEdit={dialog.isEditing}
        form={form as any}
        onClose={dialog.close}
        onSubmit={(data: any) =>
          dialog.isEditing && dialog.editingItem
            ? updateMutation.mutate({ id: dialog.editingItem.id, data })
            : createMutation.mutate(data)
        }
        options={options}
        pending={isPending}
      />
    </div>
  );
}
