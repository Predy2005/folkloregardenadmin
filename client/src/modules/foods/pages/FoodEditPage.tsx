import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { PageHeader } from "@/shared/components/PageHeader";
import { queryClient } from "@/shared/lib/queryClient";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ArrowLeft, ChefHat } from "lucide-react";
import type { ReservationFood } from "@shared/types";
import { BasicInfoTab, foodSchema, type FoodForm } from "../components/edit/BasicInfoTab";
import { PriceOverridesTab } from "../components/edit/PriceOverridesTab";
import { AvailabilityTab } from "../components/edit/AvailabilityTab";
import { RecipesTab } from "../components/edit/RecipesTab";

export default function FoodEdit() {
  const [, navigate] = useLocation();
  const [isEditMatch, params] = useRoute("/foods/:id/edit");
  const isEdit = !!isEditMatch;
  const foodId = params?.id ? Number(params.id) : null;

  const form = useForm<FoodForm>({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      surcharge: 0,
      isChildrenMenu: false,
      externalId: "",
    },
  });

  const { data: food, isLoading } = useQuery({
    enabled: isEdit && !!foodId,
    queryKey: ["/api/reservation-foods", foodId],
    queryFn: async () => {
      const foods = await api.get<ReservationFood[]>("/api/reservation-foods");
      return foods.find((f) => f.id === foodId);
    },
  });

  useEffect(() => {
    if (isEdit && food) {
      form.reset({
        name: food.name,
        description: food.description || "",
        price: food.price,
        surcharge: food.surcharge || 0,
        isChildrenMenu: food.isChildrenMenu,
        externalId: food.externalId || "",
      });
    }
  }, [isEdit, food, form]);

  const createMutation = useMutation({
    mutationFn: (data: FoodForm) => api.post("/api/reservation-foods", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservation-foods"] });
      successToast("Jídlo bylo úspěšně vytvořeno");
      navigate("/foods");
    },
    onError: () => {
      errorToast("Chyba při vytváření jídla");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FoodForm) => api.put(`/api/reservation-foods/${foodId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservation-foods"] });
      successToast("Jídlo bylo úspěšně aktualizováno");
    },
    onError: () => {
      errorToast("Chyba při aktualizaci jídla");
    },
  });

  const onSubmit = (data: FoodForm) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Načítání jídla...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/foods")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <PageHeader
            title={isEdit ? `Upravit: ${food?.name}` : "Nové jídlo"}
            description={isEdit ? "Úprava existujícího jídla" : "Vytvoření nového jídla do nabídky"}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/foods")}>
            Zrušit
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Ukládání..."
              : isEdit
              ? "Uložit změny"
              : "Vytvořit jídlo"}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">Základní informace</TabsTrigger>
          <TabsTrigger value="price-overrides" disabled={!isEdit}>
            Cenové přepisy
          </TabsTrigger>
          <TabsTrigger value="availability" disabled={!isEdit}>
            Dostupnost
          </TabsTrigger>
          <TabsTrigger value="recipes" disabled={!isEdit}>
            <ChefHat className="w-4 h-4 mr-1" />
            Receptury
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <BasicInfoTab form={form} />
        </TabsContent>

        <TabsContent value="price-overrides">
          {foodId && <PriceOverridesTab foodId={foodId} />}
        </TabsContent>

        <TabsContent value="availability">
          {foodId && <AvailabilityTab foodId={foodId} />}
        </TabsContent>

        <TabsContent value="recipes">
          {foodId && <RecipesTab foodId={foodId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
