import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import type { TransportDriver } from "@shared/types";
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
import { DriverDialog, driverSchema, type DriverForm } from "./DriverDialog";

export function DriversTab({ companyId }: { companyId: number }) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<TransportDriver | null>(null);

  const { data: drivers, isLoading } = useQuery<TransportDriver[]>({
    queryKey: ["/api/transport", companyId, "drivers"],
    queryFn: () => api.get(`/api/transport/${companyId}/drivers`),
  });

  const form = useForm<DriverForm>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      licenseNumber: "",
      licenseCategories: "",
      isActive: true,
      notes: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: DriverForm) => {
      if (editingDriver) {
        return api.put(`/api/transport/${companyId}/drivers/${editingDriver.id}`, data);
      }
      return api.post(`/api/transport/${companyId}/drivers`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transport", companyId, "drivers"] });
      qc.invalidateQueries({ queryKey: ["/api/transport"] });
      successToast(editingDriver ? "Ridic byl aktualizovan" : "Ridic byl vytvoren");
      closeDialog();
    },
    onError: (error: Error) => errorToast(error),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/transport/${companyId}/drivers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transport", companyId, "drivers"] });
      qc.invalidateQueries({ queryKey: ["/api/transport"] });
      successToast("Ridic byl smazan");
    },
    onError: (error: Error) => errorToast(error),
  });

  const openCreate = () => {
    setEditingDriver(null);
    form.reset({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      licenseNumber: "",
      licenseCategories: "",
      isActive: true,
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (driver: TransportDriver) => {
    setEditingDriver(driver);
    form.reset({
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone || "",
      email: driver.email || "",
      licenseNumber: driver.licenseNumber || "",
      licenseCategories: driver.licenseCategories || "",
      isActive: driver.isActive,
      notes: driver.notes || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingDriver(null);
    form.reset();
  };

  const handleDelete = (id: number) => {
    if (confirm("Opravdu chcete smazat tohoto ridice?")) {
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
        <h3 className="text-lg font-semibold">Ridici ({drivers?.length ?? 0})</h3>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Pridat ridice
        </Button>
      </div>

      {drivers && drivers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jmeno</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Cislo RP</TableHead>
              <TableHead>Kategorie RP</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.firstName} {d.lastName}</TableCell>
                <TableCell>{d.phone || "-"}</TableCell>
                <TableCell>{d.email || "-"}</TableCell>
                <TableCell>{d.licenseNumber || "-"}</TableCell>
                <TableCell>{d.licenseCategories || "-"}</TableCell>
                <TableCell>
                  <Badge variant={d.isActive ? "default" : "secondary"}>
                    {d.isActive ? "Aktivni" : "Neaktivni"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">Zatim zadni ridici</div>
      )}

      <DriverDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingDriver={editingDriver}
        form={form}
        saveMutation={saveMutation}
        onClose={closeDialog}
      />
    </div>
  );
}
