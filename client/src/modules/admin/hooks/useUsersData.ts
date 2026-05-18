import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/shared/lib/api";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { useFormDialog } from "@/shared/hooks/useFormDialog";
import { useBulkSelection } from "@/shared/hooks/useBulkSelection";
import { useAuth } from "@/modules/auth";
import type { Role, User } from "@shared/types";

const API_USERS = "/api/users";

export const userSchema = z.object({
  username: z.string().min(3, "Uživatelské jméno musí mít alespoň 3 znaky"),
  email: z.string().email("Zadejte platný email"),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, {
      message: "Heslo musí mít alespoň 6 znaků",
    }),
  roleIds: z.array(z.number()).min(1, "Vyberte alespoň jednu roli"),
});

export type UserForm = z.infer<typeof userSchema>;

export function useUsersData() {
  const qc = useQueryClient();
  const dialog = useFormDialog<User>();
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { data: users, isLoading } = useQuery({
    queryKey: [API_USERS],
    queryFn: () => api.get<User[]>(API_USERS),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["/api/roles"],
    queryFn: () => api.get<{ roles: Role[] }>("/api/roles"),
  });
  const roles = rolesData?.roles;

  const { data: userRolesData } = useQuery({
    queryKey: ["/api/permissions/users", dialog.editingItem?.id, "roles"],
    queryFn: () =>
      api.get<{
        userId: number;
        username: string;
        roles: { id: number; name: string; displayName?: string }[];
      }>(`/api/permissions/users/${dialog.editingItem?.id}/roles`),
    enabled: !!dialog.editingItem,
  });
  const userRoles = userRolesData?.roles;

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower);
      const matchesRole = roleFilter === "all" || user.roles?.includes(roleFilter);
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const selection = useBulkSelection({ items: filteredUsers, getId: (u: User) => u.id });

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { username: "", email: "", password: "", roleIds: [] },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: [API_USERS] });

  const createMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      const user = await api.post<User>(API_USERS, {
        username: data.username,
        email: data.email,
        password: data.password,
        roles: [],
      });
      await api.put(`/api/permissions/users/${user.id}/roles`, { roleIds: data.roleIds });
      return user;
    },
    onSuccess: () => {
      invalidate();
      dialog.close();
      form.reset();
      successToast("Uživatel byl úspěšně vytvořen");
    },
    onError: (error: Error) => errorToast(error),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserForm> }) => {
      const updateData: Record<string, string | undefined> = {
        username: data.username,
        email: data.email,
      };
      if (data.password) updateData.password = data.password;
      await api.put(`/api/users/${id}`, updateData);
      // BE `PermissionService::canManageUser` zakazuje měnit role sám sobě
      // (admin si tak nemůže udělit víc oprávnění). Pokud edituji sebe, role
      // update přeskočím — `PUT /api/users/{id}` výše už vyřídil email/heslo.
      const isSelfEdit = currentUser?.id === id;
      if (data.roleIds && !isSelfEdit) {
        await api.put(`/api/permissions/users/${id}/roles`, { roleIds: data.roleIds });
      }
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["/api/permissions/users"] });
      dialog.close();
      form.reset();
      successToast("Uživatel byl úspěšně upraven");
    },
    onError: (error: Error) => errorToast(error),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      invalidate();
      successToast("Uživatel byl úspěšně smazán");
    },
    onError: (error: Error) => errorToast(error),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.delete(`/api/users/${id}`)));
    },
    onSuccess: () => {
      invalidate();
      selection.clearSelection();
      successToast("Vybraní uživatelé byli úspěšně smazáni");
    },
    onError: (error: Error) => errorToast(error),
  });

  // Sync user's existing roles into form when editing
  useEffect(() => {
    if (!dialog.editingItem || !userRoles) return;
    form.setValue(
      "roleIds",
      userRoles.map((r) => r.id),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog.editingItem?.id, userRoles, form]);

  return {
    users,
    roles,
    filteredUsers,
    isLoading,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    selection,
    dialog,
    form,
    createMutation,
    updateMutation,
    deleteMutation,
    bulkDeleteMutation,
  };
}
