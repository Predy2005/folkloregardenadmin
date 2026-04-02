import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
  Save, Circle, Square, Music, Disc, Wine, ChefHat, DoorOpen, Loader2,
  Lock, Unlock, Trash2, PenTool, LayoutTemplate, Plus, Minus, PencilRuler, RotateCcw, Copy,
} from "lucide-react";
import type { EventTable } from "@shared/types";
import { FloorPlanEditor } from "./canvas/FloorPlanEditor";
import { FloorPlanSidebar } from "./canvas/FloorPlanSidebar";
import { TableDetailPopover } from "./canvas/TableDetailPopover";
import { PolygonDrawer } from "./canvas/PolygonDrawer";
import TableEditorDialog, { type TableForm } from "./TableEditorDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { useFloorPlanState } from "./useFloorPlanState";

interface FloorPlanEditorManagerProps {
  eventId: number;
}

export default function FloorPlanEditorManager({ eventId }: FloorPlanEditorManagerProps) {
  const fp = useFloorPlanState(eventId);

  // ── Local UI state ──
  const [tableDetailOpen, setTableDetailOpen] = useState(false);
  const [tableEditorOpen, setTableEditorOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<EventTable | null>(null);
  const [polygonDrawerOpen, setPolygonDrawerOpen] = useState(false);
  const [polygonTargetId, setPolygonTargetId] = useState<number | null>(null);
  const [roomShapeEditorOpen, setRoomShapeEditorOpen] = useState(false);

  const handleTableDoubleClick = (id: number) => {
    const table = fp.filteredTables.find((t) => t.id === id);
    if (table) {
      setEditingTable(table);
      setTableEditorOpen(true);
    }
  };

  const handleTableEditorSave = (data: TableForm) => {
    if (editingTable) {
      fp.handleUpdateTable(editingTable.id, data);
    }
    setTableEditorOpen(false);
    setEditingTable(null);
  };

  const handleDrawPolygon = (elementId: number) => {
    setPolygonTargetId(elementId);
    setPolygonDrawerOpen(true);
  };

  const handleSavePolygon = (points: number[]) => {
    fp.handleSavePolygon(polygonTargetId, points);
    setPolygonDrawerOpen(false);
    setPolygonTargetId(null);
  };

  if (fp.floorPlanLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (fp.floorPlanError) {
    return (
      <div className="flex items-center justify-center h-96 text-destructive">
        Nepodařilo se načíst plánek. Zkuste obnovit stránku.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] overflow-hidden max-w-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-y-1 justify-between p-2 border-b bg-card rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Room selector */}
          {fp.allRooms.length > 0 && (
            <Select
              value={fp.selectedRoomId?.toString() ?? "all"}
              onValueChange={(v) => fp.setSelectedRoomId(v === "all" ? null : parseInt(v))}
            >
              <SelectTrigger className="w-48 h-8">
                <SelectValue placeholder="Všechny místnosti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny místnosti</SelectItem>
                {fp.allRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id.toString()}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Room shape editing */}
          {fp.selectedRoom && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRoomShapeEditorOpen(true)}
                title="Upravit tvar místnosti (L-tvar, polygon...)"
              >
                <PencilRuler className="h-3 w-3 mr-1" />
                Tvar místnosti
              </Button>
              {fp.selectedRoom.shapeData?.points && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fp.handleResetRoomShape(fp.selectedRoom!.id)}
                  title="Resetovat na obdélník"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </>
          )}

          <div className="h-6 border-l mx-1" />

          {/* Add table buttons */}
          <Button variant="outline" size="sm" onClick={() => fp.handleAddTable("round")}>
            <Circle className="h-3 w-3 mr-1" />
            Kulatý stůl
          </Button>
          <Button variant="outline" size="sm" onClick={() => fp.handleAddTable("rectangle")}>
            <Square className="h-3 w-3 mr-1" />
            Obdélníkový
          </Button>

          <div className="h-6 border-l mx-1" />

          {/* Add element buttons */}
          <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("stage")} title="Podium">
            <Music className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("dance_floor")} title="Taneční parket">
            <Disc className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("bar")} title="Bar">
            <Wine className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("buffet")} title="Bufet">
            <ChefHat className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("entrance")} title="Vchod">
            <DoorOpen className="h-4 w-4" />
          </Button>

          <div className="h-6 border-l mx-1" />

          {/* Selection actions */}
          {fp.selectedItem && (
            <>
              <Button
                variant={fp.isSelectedLocked ? "default" : "outline"}
                size="sm"
                onClick={fp.handleToggleLock}
                title={fp.isSelectedLocked ? "Odemknout" : "Zamknout"}
              >
                {fp.isSelectedLocked ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                {fp.isSelectedLocked ? "Zamčeno" : "Zamknout"}
              </Button>

              {/* Table size controls */}
              {fp.selectedTableId && !fp.isSelectedLocked && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fp.handleTableResize(fp.selectedTableId!, -20)}
                    title="Zmenšit stůl"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {(fp.selectedItem as EventTable).widthPx ?? 80}×{(fp.selectedItem as EventTable).heightPx ?? 80}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fp.handleTableResize(fp.selectedTableId!, 20)}
                    title="Zvětšit stůl"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </>
              )}

              {/* Duplicate table */}
              {fp.selectedTableId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fp.handleDuplicateTable(fp.selectedTableId!)}
                  title="Duplikovat stůl"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Duplikovat
                </Button>
              )}

              {fp.selectedElementId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDrawPolygon(fp.selectedElementId!)}
                  title="Nakreslit vlastní tvar"
                >
                  <PenTool className="h-3 w-3 mr-1" />
                  Tvar
                </Button>
              )}
              {!fp.isSelectedLocked && (
                <Button variant="ghost" size="sm" onClick={fp.handleDeleteSelected} title="Smazat">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {/* Stats */}
          <Badge variant="secondary" className="text-xs">
            {fp.filteredTables.length} stolů
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {fp.guests.filter((g) => g.eventTableId).length}/{fp.guests.length} přiřazeno
          </Badge>

          {fp.isDirty && <Badge variant="destructive" className="text-xs">Neuloženo</Badge>}

          {/* Template actions */}
          {fp.templates.length > 0 && (
            <Select onValueChange={(v) => fp.applyTemplate(parseInt(v))}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="Načíst šablonu..." />
              </SelectTrigger>
              <SelectContent>
                {fp.templates.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fp.saveAsTemplate(`Šablona z akce`)}
          >
            <LayoutTemplate className="h-3 w-3 mr-1" />
            Uložit jako šablonu
          </Button>

          <Button onClick={fp.handleSave} disabled={fp.savePending || !fp.isDirty} size="sm">
            <Save className="h-3 w-3 mr-1" />
            {fp.savePending ? "Ukládám..." : "Uložit plánek"}
          </Button>
        </div>
      </div>

      {/* Main content: canvas + sidebar */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="flex-1 min-w-0 relative">
          <FloorPlanEditor
            tables={fp.filteredTables}
            elements={fp.filteredElements}
            guests={fp.guests}
            room={fp.selectedRoom}
            canvasWidth={800}
            canvasHeight={600}
            selectedTableId={fp.selectedTableId}
            selectedElementId={fp.selectedElementId}
            onSelectTable={fp.setSelectedTableId}
            onSelectElement={fp.setSelectedElementId}
            onTableMove={fp.handleTableMove}
            onElementMove={fp.handleElementMove}
            onTableDoubleClick={handleTableDoubleClick}
            onElementDoubleClick={(id) => handleDrawPolygon(id)}
            onElementTransform={fp.handleElementTransform}
            onTableTransform={fp.handleTableTransform}
          />
        </div>

        <FloorPlanSidebar
          guests={fp.guests}
          tables={fp.filteredTables}
          selectedTableId={fp.selectedTableId}
          room={fp.selectedRoom}
          onAssignGuest={fp.handleAssignGuest}
          onUnassignGuest={fp.handleUnassignGuest}
          onAutoSeatGuests={fp.handleAutoSeatGuests}
        />
      </div>

      {/* Table detail (POS) */}
      <TableDetailPopover
        isOpen={tableDetailOpen}
        onClose={() => setTableDetailOpen(false)}
        table={fp.filteredTables.find((t) => t.id === fp.selectedTableId) ?? null}
        guests={fp.guests}
        eventId={eventId}
        onUnassignGuest={fp.handleUnassignGuest}
      />

      {/* Table editor dialog */}
      {tableEditorOpen && editingTable && (
        <TableEditorDialog
          isOpen={tableEditorOpen}
          onClose={() => { setTableEditorOpen(false); setEditingTable(null); }}
          table={editingTable}
          onSave={handleTableEditorSave}
        />
      )}

      {/* Polygon shape drawer */}
      <Dialog open={polygonDrawerOpen} onOpenChange={(open) => !open && setPolygonDrawerOpen(false)}>
        <DialogContent className="max-w-4xl w-[95vw] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Nakreslit vlastní tvar</DialogTitle>
          </DialogHeader>
          <PolygonDrawer
            width={600}
            height={400}
            initialPoints={
              polygonTargetId
                ? fp.filteredElements.find((e) => e.id === polygonTargetId)?.shapeData?.points
                : undefined
            }
            onSave={handleSavePolygon}
            onCancel={() => setPolygonDrawerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Room shape editor */}
      <Dialog open={roomShapeEditorOpen} onOpenChange={(open) => !open && setRoomShapeEditorOpen(false)}>
        <DialogContent className="max-w-4xl w-[95vw] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Upravit tvar místnosti: {fp.selectedRoom?.name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Nakreslete obrys místnosti (L-tvar, nepravidelný tvar...). Klikáním přidávejte body, klikem u prvního bodu tvar uzavřete.
          </p>
          {fp.selectedRoom && (
            <PolygonDrawer
              width={700}
              height={500}
              initialPoints={fp.selectedRoom.shapeData?.points}
              onSave={(points) => {
                fp.handleSaveRoomShape(fp.selectedRoom!.id, points);
                setRoomShapeEditorOpen(false);
              }}
              onCancel={() => setRoomShapeEditorOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
