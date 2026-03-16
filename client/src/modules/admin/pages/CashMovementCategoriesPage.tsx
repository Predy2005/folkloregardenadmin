import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { PageHeader } from "@/shared/components/PageHeader";
import type { CashMovementCategory } from "@shared/types";
import dayjs from "dayjs";

const QK = ["/api/cash-movement-categories"];

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Příjem",
  EXPENSE: "Výdaj",
  BOTH: "Obojí",
};

const TYPE_COLORS: Record<string, string> = {
  INCOME: "bg-green-100 text-green-700",
  EXPENSE: "bg-red-100 text-red-700",
  BOTH: "bg-blue-100 text-blue-700",
};

export default function CashMovementCategoriesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CashMovementCategory | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("BOTH");

  const { data: categories, isLoading } = useQuery<CashMovementCategory[]>({
    queryKey: QK,
    queryFn: () => api.get("/api/cash-movement-categories"),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; type: string }) =>
      api.post("/api/cash-movement-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK });
      closeDialog();
      successToast("Kategorie vytvořena");
    },
    onError: (e: Error) => errorToast(e),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; type: string }) =>
      api.put(`/api/cash-movement-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK });
      closeDialog();
      successToast("Kategorie upravena");
    },
    onError: (e: Error) => errorToast(e),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/cash-movement-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK });
      successToast("Kategorie smazána");
    },
    onError: (e: Error) => errorToast(e),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setName("");
    setType("BOTH");
  };

  const handleCreate = () => {
    setEditingItem(null);
    setName("");
    setType("BOTH");
    setDialogOpen(true);
  };

  const handleEdit = (cat: CashMovementCategory) => {
    setEditingItem(cat);
    setName(cat.name);
    setType(cat.type);
    setDialogOpen(true);
  };

  const handleDelete = (cat: CashMovementCategory) => {
    if (confirm(`Opravdu chcete smazat kategorii "${cat.name}"?`)) {
      deleteMutation.mutate(cat.id);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, name: name.trim(), type });
    } else {
      createMutation.mutate({ name: name.trim(), type });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Načítání kategorií...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Kategorie pokladny" description="Správa kategorií příjmů a výdajů">
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nová kategorie
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seznam kategorií</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Název</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-center">Počet použití</TableHead>
                  <TableHead>Naposledy použito</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!categories?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Žádné kategorie
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TYPE_COLORS[cat.type] || ""}>
                          {TYPE_LABELS[cat.type] || cat.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{cat.usageCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dayjs(cat.lastUsedAt).format("DD.MM.YYYY HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cat)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Upravit kategorii" : "Nová kategorie"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Název</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Název kategorie"
                autoFocus
              />
            </div>
            <div>
              <Label>Typ</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Výdaj</SelectItem>
                  <SelectItem value="INCOME">Příjem</SelectItem>
                  <SelectItem value="BOTH">Obojí</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Zrušit</Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Ukládání..."
                : editingItem ? "Uložit" : "Vytvořit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
