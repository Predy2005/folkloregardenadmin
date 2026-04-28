import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { PageHeader } from "@/shared/components/PageHeader";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Plus, Pencil, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import type { PartnerCategory } from "@modules/partners/hooks/usePartnerCategories";

interface FormState {
  id: number | null;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

const emptyForm: FormState = {
  id: null,
  name: "",
  slug: "",
  displayOrder: 0,
  isActive: true,
};

const QUERY_KEY = ["/api/partner-categories"] as const;

export default function PartnerCategoriesPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<PartnerCategory[]>("/api/partner-categories"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (data: Omit<FormState, "id">) =>
      api.post<PartnerCategory>("/api/partner-categories", data),
    onSuccess: () => {
      invalidate();
      successToast("Kategorie přidána");
      setDialogOpen(false);
    },
    onError: (e: Error) => errorToast(e),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormState) =>
      api.put<PartnerCategory>(`/api/partner-categories/${data.id}`, {
        name: data.name,
        slug: data.slug,
        displayOrder: data.displayOrder,
        isActive: data.isActive,
      }),
    onSuccess: () => {
      invalidate();
      successToast("Kategorie aktualizována");
      setDialogOpen(false);
    },
    onError: (e: Error) => errorToast(e),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/partner-categories/${id}`),
    onSuccess: () => {
      invalidate();
      successToast("Kategorie smazána (partneři si zachovali svou hodnotu)");
      setDeleteId(null);
    },
    onError: (e: Error) => errorToast(e),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: PartnerCategory) => {
    setForm({
      id: c.id,
      name: c.name,
      slug: c.slug,
      displayOrder: c.displayOrder,
      isActive: c.isActive,
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (form.name.trim() === "") {
      errorToast("Zadej název");
      return;
    }
    if (form.id === null) {
      const { id: _ignored, ...payload } = form;
      void _ignored;
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Kategorie partnerů"
        description="Číselník kategorií, které se nabízí v dropdownu při editaci partnera"
      >
        <Button variant="outline" onClick={() => navigate("/partners")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zpět na partnery
        </Button>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Přidat kategorii
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !categories?.length ? (
            <div className="text-center py-8 text-muted-foreground">Zatím žádné kategorie</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Název</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-center">Stav</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-muted-foreground">{c.displayOrder}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{c.slug}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={c.isActive ? "default" : "secondary"} className={c.isActive ? "bg-green-600" : ""}>
                          {c.isActive ? "Aktivní" : "Neaktivní"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteId(c.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id === null ? "Nová kategorie" : "Upravit kategorii"}</DialogTitle>
            <DialogDescription>
              Slug je stable identifikátor (uppercase, bez mezer) — ukládá se k partnerům. Pokud nezadáš, vygeneruje se z názvu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="cat-name">Název *</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="např. Cestovní kancelář"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="cat-slug">Slug</Label>
              <Input
                id="cat-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="TRAVEL_AGENCY (volitelné — vygeneruje se z názvu)"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="cat-order">Pořadí</Label>
              <Input
                id="cat-order"
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, displayOrder: Math.max(0, Number.parseInt(e.target.value) || 0) }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="cat-active">Aktivní (zobrazit v dropdownu)</Label>
              <Switch
                id="cat-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
            <Button onClick={submit} disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat kategorii?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategorie zmizí z dropdownu, ale partneři, kteří ji mají přiřazenou, si svou hodnotu zachovají
              (slug zůstane v jejich `partnerType`). Pokud je chceš přemapovat, udělej to ručně před smazáním.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
