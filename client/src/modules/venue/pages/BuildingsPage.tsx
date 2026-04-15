import { useState } from "react";
import { Building, Plus, Pencil, Trash2, DoorOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { PageHeader } from "@/shared/components/PageHeader";
import { ConfirmDialog } from "@/shared/components";
import { useToast } from "@/shared/hooks/use-toast";
import { useBuildings, useCreateBuilding, useUpdateBuilding, useDeleteBuilding, useCreateRoom, useUpdateRoom, useDeleteRoom } from "../hooks/useBuildings";
import { BuildingFormDialog } from "../components/BuildingFormDialog";
import { RoomFormDialog } from "../components/RoomFormDialog";
import type { Building as BuildingType, Room } from "@shared/types";

export function BuildingsPage() {
  const { toast } = useToast();
  const { data: buildings = [], isLoading } = useBuildings();
  const createBuilding = useCreateBuilding();
  const updateBuilding = useUpdateBuilding();
  const deleteBuilding = useDeleteBuilding();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();

  const [buildingDialog, setBuildingDialog] = useState<{ open: boolean; building: BuildingType | null }>({ open: false, building: null });
  const [roomDialog, setRoomDialog] = useState<{ open: boolean; room: Room | null; buildingId: number }>({ open: false, room: null, buildingId: 0 });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: "building" | "room"; id: number; name: string }>({ open: false, type: "building", id: 0, name: "" });
  const [expandedBuildings, setExpandedBuildings] = useState<Set<number>>(new Set(buildings.map(b => b.id)));

  const toggleExpand = (id: number) => {
    setExpandedBuildings(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBuildingSubmit = async (data: { name: string; slug?: string; [key: string]: unknown }) => {
    try {
      if (buildingDialog.building) {
        await updateBuilding.mutateAsync({ id: buildingDialog.building.id, ...data });
        toast({ title: "Budova aktualizována" });
      } else {
        await createBuilding.mutateAsync(data);
        toast({ title: "Budova vytvořena" });
      }
      setBuildingDialog({ open: false, building: null });
    } catch {
      toast({ title: "Chyba", description: "Nepodařilo se uložit budovu", variant: "destructive" });
    }
  };

  const handleRoomSubmit = async (data: { buildingId: number; name: string; [key: string]: unknown }) => {
    try {
      if (roomDialog.room) {
        await updateRoom.mutateAsync({ id: roomDialog.room.id, ...data });
        toast({ title: "Místnost aktualizována" });
      } else {
        await createRoom.mutateAsync(data);
        toast({ title: "Místnost vytvořena" });
      }
      setRoomDialog({ open: false, room: null, buildingId: 0 });
    } catch {
      toast({ title: "Chyba", description: "Nepodařilo se uložit místnost", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      if (deleteDialog.type === "building") {
        await deleteBuilding.mutateAsync(deleteDialog.id);
        toast({ title: "Budova smazána" });
      } else {
        await deleteRoom.mutateAsync(deleteDialog.id);
        toast({ title: "Místnost smazána" });
      }
    } catch {
      toast({ title: "Chyba při mazání", variant: "destructive" });
    }
    setDeleteDialog({ open: false, type: "building", id: 0, name: "" });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budovy a místnosti"
        description="Správa budov, místností a jejich rozměrů pro plánování rozmístění stolů"
      >
        <Button onClick={() => setBuildingDialog({ open: true, building: null })}>
          <Plus className="h-4 w-4 mr-2" />
          Nová budova
        </Button>
      </PageHeader>

      <div className="space-y-4">
        {buildings.map((building) => (
          <Card key={building.id}>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleExpand(building.id)}>
                  {expandedBuildings.has(building.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{building.name}</CardTitle>
                  <Badge variant={building.isActive ? "default" : "secondary"}>
                    {building.isActive ? "Aktivní" : "Neaktivní"}
                  </Badge>
                  <Badge variant="outline">{building.rooms?.length ?? 0} místností</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setRoomDialog({ open: true, room: null, buildingId: building.id })}>
                    <DoorOpen className="h-4 w-4 mr-1" />
                    Místnost
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setBuildingDialog({ open: true, building })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ open: true, type: "building", id: building.id, name: building.name })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {building.description && <p className="text-sm text-muted-foreground ml-12">{building.description}</p>}
            </CardHeader>

            {expandedBuildings.has(building.id) && building.rooms && building.rooms.length > 0 && (
              <CardContent className="pt-0">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {building.rooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: room.color || "#6366f1" }}
                        />
                        <div>
                          <div className="font-medium text-sm">{room.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {room.widthCm / 100}m x {room.heightCm / 100}m
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRoomDialog({ open: true, room, buildingId: building.id })}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteDialog({ open: true, type: "room", id: room.id, name: room.name })}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {buildings.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Building className="h-12 w-12 mb-4" />
              <p>Zatím nejsou žádné budovy</p>
              <Button variant="outline" className="mt-4" onClick={() => setBuildingDialog({ open: true, building: null })}>
                <Plus className="h-4 w-4 mr-2" />
                Přidat první budovu
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <BuildingFormDialog
        key={buildingDialog.building?.id ?? (buildingDialog.open ? 'new' : 'closed')}
        isOpen={buildingDialog.open}
        onClose={() => setBuildingDialog({ open: false, building: null })}
        building={buildingDialog.building}
        onSubmit={handleBuildingSubmit}
        isLoading={createBuilding.isPending || updateBuilding.isPending}
      />

      <RoomFormDialog
        key={roomDialog.room?.id ?? (roomDialog.open ? 'new' : 'closed')}
        isOpen={roomDialog.open}
        onClose={() => setRoomDialog({ open: false, room: null, buildingId: 0 })}
        room={roomDialog.room}
        buildingId={roomDialog.buildingId}
        onSubmit={handleRoomSubmit}
        isLoading={createRoom.isPending || updateRoom.isPending}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ ...deleteDialog, open: false })}
        title={`Smazat ${deleteDialog.type === "building" ? "budovu" : "místnost"}?`}
        description={`Opravdu chcete smazat "${deleteDialog.name}"? Tato akce je nevratná.${deleteDialog.type === "building" ? " Budou smazány i všechny místnosti v této budově." : ""}`}
        confirmLabel="Smazat"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
