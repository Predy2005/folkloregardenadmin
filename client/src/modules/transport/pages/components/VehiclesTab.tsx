import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import type { TransportVehicle } from "@shared/types";
import { VEHICLE_TYPE_LABELS } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { VehicleDialog, vehicleSchema, type VehicleForm } from "./VehicleDialog";

export function VehiclesTab({ companyId }: { companyId: number }) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<TransportVehicle | null>(null);

  const { data: vehicles, isLoading } = useQuery<TransportVehicle[]>({
    queryKey: ["/api/transport", companyId, "vehicles"],
    queryFn: () => api.get(`/api/transport/${companyId}/vehicles`),
  });

  const form = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      licensePlate: "",
      vehicleType: "BUS",
      brand: "",
      model: "",
      capacity: 50,
      color: "",
      yearOfManufacture: undefined,
      isActive: true,
      notes: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: VehicleForm) => {
      if (editingVehicle) {
        return api.put(`/api/transport/${companyId}/vehicles/${editingVehicle.id}`, data);
      }
      return api.post(`/api/transport/${companyId}/vehicles`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transport", companyId, "vehicles"] });
      qc.invalidateQueries({ queryKey: ["/api/transport"] });
      successToast(editingVehicle ? "Vozidlo bylo aktualizovano" : "Vozidlo bylo vytvoreno");
      closeDialog();
    },
    onError: (error: Error) => errorToast(error),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/transport/${companyId}/vehicles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transport", companyId, "vehicles"] });
      qc.invalidateQueries({ queryKey: ["/api/transport"] });
      successToast("Vozidlo bylo smazano");
    },
    onError: (error: Error) => errorToast(error),
  });

  const openCreate = () => {
    setEditingVehicle(null);
    form.reset({
      licensePlate: "",
      vehicleType: "BUS",
      brand: "",
      model: "",
      capacity: 50,
      color: "",
      yearOfManufacture: undefined,
      isActive: true,
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (vehicle: TransportVehicle) => {
    setEditingVehicle(vehicle);
    form.reset({
      licensePlate: vehicle.licensePlate,
      vehicleType: vehicle.vehicleType,
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      capacity: vehicle.capacity,
      color: vehicle.color || "",
      yearOfManufacture: vehicle.yearOfManufacture || undefined,
      isActive: vehicle.isActive,
      notes: vehicle.notes || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingVehicle(null);
    form.reset();
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat toto vozidlo?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Vozidla ({vehicles?.length ?? 0})</h3>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Pridat vozidlo
        </Button>
      </div>

      {vehicles && vehicles.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SPZ</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Znacka / Model</TableHead>
              <TableHead className="text-right">Kapacita</TableHead>
              <TableHead>Barva</TableHead>
              <TableHead>Rok</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.licensePlate}</TableCell>
                <TableCell>
                  <Badge variant="outline">{VEHICLE_TYPE_LABELS[v.vehicleType]}</Badge>
                </TableCell>
                <TableCell>{[v.brand, v.model].filter(Boolean).join(" ") || "-"}</TableCell>
                <TableCell className="text-right">{v.capacity}</TableCell>
                <TableCell>{v.color || "-"}</TableCell>
                <TableCell>{v.yearOfManufacture || "-"}</TableCell>
                <TableCell>
                  <Badge variant={v.isActive ? "default" : "secondary"}>
                    {v.isActive ? "Aktivni" : "Neaktivni"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">Zatim zadna vozidla</div>
      )}

      <VehicleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingVehicle={editingVehicle}
        form={form}
        saveMutation={saveMutation}
        onClose={closeDialog}
      />
    </div>
  );
}
