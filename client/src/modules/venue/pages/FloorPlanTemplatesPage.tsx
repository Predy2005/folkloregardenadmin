import { useState } from "react";
import { LayoutTemplate, Plus, Pencil, Trash2, Copy, Loader2, PenTool, Star, StarOff, Wand2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { PageHeader } from "@/shared/components/PageHeader";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { ConfirmDialog } from "@/shared/components";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, useDuplicateTemplate } from "../hooks/useTemplates";
import { useBuildings } from "../hooks/useBuildings";
import { seedDefaultTemplates } from "../seedLayouts";
import type { FloorPlanTemplate, Building } from "@shared/types";

export function FloorPlanTemplatesPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: templates = [], isLoading } = useTemplates();
  const { data: buildings = [] } = useBuildings();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();

  const allRooms = buildings.flatMap((b: Building) => b.rooms ?? []);

  const [formDialog, setFormDialog] = useState<{ open: boolean; template: FloorPlanTemplate | null }>({ open: false, template: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number; name: string }>({ open: false, id: 0, name: "" });
  const [seedingDialog, setSeedingDialog] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRoomId, setFormRoomId] = useState<number | null>(null);
  const [formIsDefault, setFormIsDefault] = useState(false);

  const openForm = (template: FloorPlanTemplate | null) => {
    setFormName(template?.name ?? "");
    setFormDescription(template?.description ?? "");
    setFormRoomId(template?.roomId ?? null);
    setFormIsDefault(template?.isDefault ?? false);
    setFormDialog({ open: true, template });
  };

  const handleSubmit = async () => {
    try {
      if (formDialog.template) {
        await updateTemplate.mutateAsync({
          id: formDialog.template.id,
          name: formName,
          description: formDescription || undefined,
          roomId: formRoomId ?? undefined,
          isDefault: formIsDefault,
        });
        toast({ title: "Šablona aktualizována" });
      } else {
        await createTemplate.mutateAsync({
          name: formName,
          description: formDescription || undefined,
          roomId: formRoomId ?? undefined,
          isDefault: formIsDefault,
          layoutData: { tables: [], elements: [] },
        });
        toast({ title: "Šablona vytvořena" });
      }
      setFormDialog({ open: false, template: null });
    } catch {
      toast({ title: "Chyba", variant: "destructive" });
    }
  };

  const handleToggleDefault = async (template: FloorPlanTemplate) => {
    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        isDefault: !template.isDefault,
      });
      toast({ title: template.isDefault ? "Šablona již není výchozí" : "Šablona nastavena jako výchozí" });
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

  const [seedResult, setSeedResult] = useState<string | null>(null);

  const handleSeedDefaults = async () => {
    setSeedResult(null);
    try {
      const result = await seedDefaultTemplates(buildings, templates);

      const messages: string[] = [];
      if (result.created > 0) messages.push(`Vytvořeno ${result.created} šablon.`);
      if (result.skipped.length > 0) messages.push(`Přeskočeno: ${result.skipped.join("; ")}`);
      if (result.errors.length > 0) messages.push(`Chyby: ${result.errors.join("; ")}`);

      const msg = messages.join("\n") || "Žádné šablony k vytvoření.";

      if (result.created > 0) {
        toast({ title: `Vytvořeno ${result.created} výchozích šablon` });
        window.location.reload();
      } else {
        // Show detailed info in the dialog
        setSeedResult(msg);
        toast({
          title: result.errors.length > 0 ? "Chyba" : "Žádné nové šablony",
          description: msg,
          variant: result.errors.length > 0 ? "destructive" : "default",
        });
      }
    } catch (err) {
      toast({ title: "Chyba při vytváření šablon", variant: "destructive" });
    }
  };

  // Group templates by building
  const getRoomBuilding = (roomId?: number) => {
    if (!roomId) return null;
    return buildings.find((b: Building) => (b.rooms ?? []).some((r) => r.id === roomId));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Šablony plánků"
        description="Předdefinované rozvržení stolů a prvků pro rychlé nastavení akcí. Každá šablona patří k místnosti a lze ji označit jako výchozí."
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSeedingDialog(true)}>
            <Wand2 className="h-4 w-4 mr-2" />
            Vytvořit výchozí šablony
          </Button>
          <Button onClick={() => openForm(null)}>
            <Plus className="h-4 w-4 mr-2" />
            Nová šablona
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const tableCount = template.layoutData?.tables?.length ?? 0;
          const elementCount = template.layoutData?.elements?.length ?? 0;
          const building = getRoomBuilding(template.roomId);
          return (
            <Card key={template.id} className={template.isDefault ? "ring-2 ring-primary" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="mt-1">{template.description}</CardDescription>
                    )}
                  </div>
                  {template.isDefault && <Badge className="bg-primary">Výchozí</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3 text-sm text-muted-foreground flex-wrap">
                  <Badge variant="outline">{tableCount} stolů</Badge>
                  <Badge variant="outline">{elementCount} prvků</Badge>
                  {building && <Badge variant="secondary">{building.name}</Badge>}
                  {template.room && <Badge variant="secondary">{template.room.name}</Badge>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="default" size="sm" onClick={() => navigate(`/venue/templates/${template.id}/designer`)}>
                    <PenTool className="h-3 w-3 mr-1" />
                    Designer
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openForm(template)}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Upravit
                  </Button>
                  <Button
                    variant={template.isDefault ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleDefault(template)}
                    title={template.isDefault ? "Zrušit výchozí" : "Nastavit jako výchozí pro tuto místnost"}
                  >
                    {template.isDefault ? <StarOff className="h-3 w-3 mr-1" /> : <Star className="h-3 w-3 mr-1" />}
                    {template.isDefault ? "Zrušit výchozí" : "Výchozí"}
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
              <p className="text-sm mt-1 mb-4">Vytvořte výchozí šablony dle reálných plánků budov</p>
              <Button onClick={() => setSeedingDialog(true)}>
                <Wand2 className="h-4 w-4 mr-2" />
                Vytvořit výchozí šablony
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* New/Edit template dialog */}
      <Dialog open={formDialog.open} onOpenChange={(open) => !open && setFormDialog({ open: false, template: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{formDialog.template ? "Upravit šablonu" : "Nová šablona"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Název</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="např. Kovárna - Folklorní show 80 osob" />
            </div>
            <div>
              <Label>Popis</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Místnost</Label>
              <Select
                value={formRoomId?.toString() ?? "none"}
                onValueChange={(v) => setFormRoomId(v === "none" ? null : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte místnost" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Bez místnosti</SelectItem>
                  {buildings.map((building: Building) => (
                    <div key={building.id}>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {building.name}
                      </div>
                      {(building.rooms ?? []).map((room) => (
                        <SelectItem key={room.id} value={room.id.toString()}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isDefault">Výchozí šablona pro tuto místnost</Label>
              <Switch id="isDefault" checked={formIsDefault} onCheckedChange={setFormIsDefault} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialog({ open: false, template: null })}>Zrušit</Button>
            <Button onClick={handleSubmit} disabled={!formName.trim()}>Uložit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ ...deleteDialog, open: false })}
        title="Smazat šablonu?"
        description={`Opravdu chcete smazat "${deleteDialog.name}"? Tato akce je nevratná.`}
        confirmLabel="Smazat"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Seed defaults dialog */}
      <Dialog open={seedingDialog} onOpenChange={(open) => { if (!open) { setSeedingDialog(false); setSeedResult(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vytvořit výchozí šablony</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Vytvoří se šablony plánků dle reálných plánků budov se stoly, podii, bary a dalšími prvky.
              Šablony budou přiřazeny k odpovídajícím místnostem a označeny jako výchozí.
            </p>
            <div className="space-y-1">
              <p className="font-medium">Nalezené budovy:</p>
              {buildings.length === 0 ? (
                <p className="text-destructive">Žádné budovy. Nejprve vytvořte budovy v Areál &gt; Budovy a místnosti.</p>
              ) : (
                <ul className="list-disc pl-5 space-y-0.5">
                  {buildings.map((b: Building) => (
                    <li key={b.id}>
                      <span className="font-medium">{b.name}</span>
                      <span className="text-muted-foreground"> (slug: {b.slug})</span>
                      {(b.rooms ?? []).length > 0 ? (
                        <span className="text-muted-foreground"> — {(b.rooms ?? []).map(r => r.name).join(", ")}</span>
                      ) : (
                        <span className="text-destructive"> — žádné místnosti!</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {seedResult && (
              <div className="p-3 bg-muted rounded-md whitespace-pre-wrap text-xs">
                {seedResult}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSeedingDialog(false); setSeedResult(null); }}>Zavřít</Button>
            <Button onClick={handleSeedDefaults} disabled={buildings.length === 0}>
              Vytvořit šablony
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
