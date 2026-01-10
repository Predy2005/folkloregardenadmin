// file: `client/src/pages/StaffMembers.tsx`
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import type { StaffMember } from "@shared/types";
import { Card, CardContent } from "@/shared/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/shared/hooks/use-toast";
import { staffRoleOptions, useStaffRoles } from "@modules/staff/utils/staffRoles";
import { StaffHeader, StaffListHeader } from "../components/StaffHeader";
import { StaffTable } from "../components/StaffTable";
import { StaffFormDialog } from "../components/StaffFormDialog";

const staffSchema = z.object({
  firstName: z.string().min(1, "Zadejte jméno"),
  lastName: z.string().min(1, "Zadejte příjmení"),
  email: z.string().email("Zadejte platný email"),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  dateOfBirth: z.string().optional(),
  emergencyPhone: z.string().optional(),
  address: z.string().optional(),
  fixedRate: z.string().optional(),
  position: z.number().int().min(1, "Vyberte roli"),
  hourlyRate: z.number().optional(),
  isActive: z.boolean().default(true),
});

type StaffForm = z.infer<typeof staffSchema>;

export default function StaffMembers() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const { toast } = useToast();

  const { data: staff, isLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
    queryFn: async () => api.get("/api/staff"),
  });

  // načíst centrální role
  const { data: roles } = useStaffRoles();
  const options = staffRoleOptions(roles ?? []);

  const createForm = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      dateOfBirth: "",
      firstName: "",
      position: 1,
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

  const editForm = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: StaffForm) => {
      return await api.post("/api/staff", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Úspěch",
        description: "Člen personálu byl vytvořen",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit člena personálu",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: StaffForm }) => {
      return await api.put(`/api/staff/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setIsEditOpen(false);
      setEditingStaff(null);
      toast({
        title: "Úspěch",
        description: "Člen personálu byl aktualizován",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat člena personálu",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/api/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Úspěch",
        description: "Člen personálu byl smazán",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat člena personálu",
        variant: "destructive",
      });
    },
  });

  const filteredStaff = staff?.filter(
    (member) =>
      `${member.firstName} ${member.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase()),
  );

  function resolveRoleLabel(position: number) {
    const found = roles?.find((r) => Number(r.id) === Number(position));

    return found?.name;
  }

  const handleEdit = (member: StaffMember) => {
    setEditingStaff(member);

    editForm.reset({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      dateOfBirth: member.dateOfBirth,
      address: member.address,
      phone: member.phone || "",
      emergencyContact: (member as any).emergencyContact || "",
      emergencyPhone: (member as any).emergencyPhone || "",
      position: member.position,
      hourlyRate:
        member.hourlyRate != null ? Number(member.hourlyRate) : undefined,
      isActive: member.isActive,
    });
    setIsEditOpen(true);
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
        onCreateClick={() => setIsCreateOpen(true)}
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
        open={isCreateOpen || isEditOpen}
        isEdit={isEditOpen}
        form={isEditOpen ? (editForm as any) : (createForm as any)}
        onClose={() => {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setEditingStaff(null);
        }}
        onSubmit={(data: any) =>
          isEditOpen && editingStaff
            ? updateMutation.mutate({ id: editingStaff.id, data })
            : createMutation.mutate(data)
        }
        options={options}
        pending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
