import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { staffRoleOptions, useStaffRoles } from "@modules/staff/utils/staffRoles";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { staffSchema, type StaffForm } from "../types";
import type { StaffMember } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Form } from "@/shared/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { StaffInfoForm } from "../components/StaffInfoForm";
import { StaffRatesCard } from "../components/StaffRatesCard";
import { StaffAssignmentsTab } from "../components/StaffAssignmentsTab";

export default function StaffEditPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isNew = !id || id === "new";
  const { defaultCurrency } = useCurrency();

  const { data: roles } = useStaffRoles();
  const options = staffRoleOptions(roles ?? []);

  const { data: member, isLoading } = useQuery<StaffMember>({
    queryKey: ["/api/staff", id],
    queryFn: () => api.get(`/api/staff/${id}`),
    enabled: !isNew && !!id,
  });

  const form = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      address: "",
      emergencyContact: "",
      emergencyPhone: "",
      position: "",
      hourlyRate: undefined,
      fixedRate: "",
      isGroup: false,
      groupSize: null,
      isActive: true,
      notes: "",
    },
  });

  useEffect(() => {
    if (member && !isNew) {
      form.reset({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        email: member.email || "",
        phone: member.phone || "",
        dateOfBirth: member.dateOfBirth || "",
        address: member.address || "",
        emergencyContact: member.emergencyContact || "",
        emergencyPhone: member.emergencyPhone || "",
        position: member.position || "",
        hourlyRate: member.hourlyRate != null ? Number(member.hourlyRate) : undefined,
        fixedRate: member.fixedRate != null ? String(member.fixedRate) : "",
        isGroup: member.isGroup ?? false,
        groupSize: member.groupSize ?? null,
        isActive: member.isActive,
        notes: member.notes || "",
      });
    }
  }, [member, isNew, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: StaffForm) => {
      if (isNew) {
        return api.post("/api/staff", data);
      } else {
        return api.put(`/api/staff/${id}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      successToast(isNew ? "Člen personálu vytvořen" : "Člen personálu uložen");
      navigate("/staff");
    },
    onError: (error: Error) => errorToast(error),
  });

  const handleSubmit = (data: StaffForm) => {
    saveMutation.mutate(data);
  };

  const watchIsGroup = form.watch("isGroup");

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const profileForm = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column - basic info + rates */}
          <div className="space-y-6">
            <StaffInfoForm form={form} watchIsGroup={watchIsGroup} roleOptions={options} column="left" />
            <StaffRatesCard form={form} watchIsGroup={watchIsGroup} defaultCurrency={defaultCurrency} />
          </div>

          {/* Right column - contact + emergency/notes */}
          <div className="space-y-6">
            <StaffInfoForm form={form} watchIsGroup={watchIsGroup} roleOptions={options} column="right" />
          </div>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/staff")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {isNew ? "Nový člen personálu" : `${member?.firstName} ${member?.lastName}`}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isNew ? "Přidejte nového člena nebo skupinu" : "Úprava údajů"}
          </p>
        </div>
        <Button
          onClick={form.handleSubmit(handleSubmit)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isNew ? "Vytvořit" : "Uložit"}
        </Button>
      </div>

      {isNew ? (
        profileForm
      ) : (
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="history">Historie práce</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-6">
            {profileForm}
          </TabsContent>
          <TabsContent value="history" className="mt-6">
            {id && <StaffAssignmentsTab staffId={id} />}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
