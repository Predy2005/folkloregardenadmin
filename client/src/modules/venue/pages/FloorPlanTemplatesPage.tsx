import { useState } from "react";
import { LayoutTemplate, Plus, Pencil, Trash2, Copy, Loader2, PenTool } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { PageHeader } from "@/shared/components/PageHeader";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, useDuplicateTemplate } from "../hooks/useTemplates";
import type { FloorPlanTemplate } from "@shared/types";

export function FloorPlanTemplatesPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: templates = [], isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();

  const [formDialog, setFormDialog] = useState<{ open: boolean; template: FloorPlanTemplate | null }>({ open: false, template: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number; name: string }>({ open: false, id: 0, name: "" });
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const openForm = (template: FloorPlanTemplate | null) => {
    setFormName(template?.name ?? "");
    setFormDescription(template?.description ?? "");
    setFormDialog({ open: true, template });
  };

  const handleSubmit = async () => {
    try {
      if (formDialog.template) {
        await updateTemplate.mutateAsync({ id: formDialog.template.id, name: formName, description: formDescription || undefined });
        toast({ title: "Šablona aktualizována" });
      } else {
        await createTemplate.mutateAsync({
          name: formName,
          description: formDescription || undefined,
          layoutData: { tables: [], elements: [] },
        });
        toast({ title: "Šablona vytvořena" });
      }
      setFormDialog({ open: false, template: null });
    } catch {
      toast({ title: "Chyba", variant: "destructive" });
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await duplicateTemplate.mutateAsync(id);
      toast({ title: "Šablona zkopírována" });
    } catch {
      toast({ title: "Chyba při kopírování", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTemplate.mutateAsync(deleteDialog.id);
      toast({ title: "Šablona smazána" });
    } catch {
      toast({ title: "Chyba při mazání", variant: "destructive" });
    }
    setDeleteDialog({ open: false, id: 0, name: "" });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Šablony plánků"
        description="Předdefinované rozvržení stolů, podií a tanečních ploch pro rychlé nastavení akcí"
      >
        <Button onClick={() => openForm(null)}>
          <Plus className="h-4 w-4 mr-2" />
          Nová šablona
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const tableCount = template.layoutData?.tables?.length ?? 0;
          const elementCount = template.layoutData?.elements?.length ?? 0;
          return (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="mt-1">{template.description}</CardDescription>
                    )}
                  </div>
                  {template.isDefault && <Badge>Výchozí</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3 text-sm text-muted-foreground">
                  <Badge variant="outline">{tableCount} stolů</Badge>
                  <Badge variant="outline">{elementCount} prvků</Badge>
                  {template.room && <Badge variant="secondary">{template.room.name}</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button variant="default" size="sm" onClick={() => navigate(`/venue/templates/${template.id}/designer`)}>
                    <PenTool className="h-3 w-3 mr-1" />
                    Designer
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openForm(template)}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Upravit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDuplicate(template.id)}>
                    <Copy className="h-3 w-3 mr-1" />
                    Kopie
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ open: true, id: template.id, name: template.name })}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {templates.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <LayoutTemplate className="h-12 w-12 mb-4" />
              <p>Zatím nejsou žádné šablony</p>
              <p className="text-sm mt-1">Šablony lze vytvořit také uložením rozvržení z konkrétní akce</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={formDialog.open} onOpenChange={(open) => !open && setFormDialog({ open: false, template: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{formDialog.template ? "Upravit šablonu" : "Nová šablona"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Název</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="např. Folklorní show 80 osob" />
            </div>
            <div>
              <Label>Popis</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialog({ open: false, template: null })}>Zrušit</Button>
            <Button onClick={handleSubmit} disabled={!formName.trim()}>Uložit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ ...deleteDialog, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat šablonu?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat &quot;{deleteDialog.name}&quot;? Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
