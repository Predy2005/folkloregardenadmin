import { useState, useEffect, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Sheet, SheetContent } from "@/shared/components/ui/sheet";
import {
  Save, Circle, Square, Music, Disc, Wine, ChefHat, DoorOpen, Loader2,
  Lock, Unlock, Trash2, PenTool, LayoutTemplate, Plus, Minus, PencilRuler, RotateCcw, Copy,
  Maximize, Minimize, Camera, Footprints, LogOut, TreePalm, Building2,
  Guitar, Users,
} from "lucide-react";
import type { EventTable } from "@shared/types";
import { FloorPlanEditor } from "./canvas/FloorPlanEditor";
import { FloorPlanSidebar } from "./canvas/FloorPlanSidebar";
import { TableDetailPopover } from "./canvas/TableDetailPopover";
import { PolygonDrawer } from "./canvas/PolygonDrawer";
import TableEditorDialog, { type TableForm } from "./TableEditorDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { useFloorPlanState } from "./useFloorPlanState";
import { useIsTouchDevice } from "@/hooks/use-mobile";

interface FloorPlanEditorManagerProps {
  eventId: number;
}

export default function FloorPlanEditorManager({ eventId }: FloorPlanEditorManagerProps) {
  const fp = useFloorPlanState(eventId);
  const isTouch = useIsTouchDevice();

  // ── Local UI state ──
  const [tableDetailOpen, setTableDetailOpen] = useState(false);
  const [tableEditorOpen, setTableEditorOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<EventTable | null>(null);
  const [polygonDrawerOpen, setPolygonDrawerOpen] = useState(false);
  const [polygonTargetId, setPolygonTargetId] = useState<number | null>(null);
  const [roomShapeEditorOpen, setRoomShapeEditorOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // default closed on touch, inline on desktop

  const toggleFullscreen = useCallback(() => setIsFullscreen((prev) => !prev), []);

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // ── Table selection handler — on touch, auto-open POS detail ──
  const handleTableSelect = useCallback((id: number | null) => {
    fp.setSelectedTableId(id);
    if (id != null && isTouch) {
      setTableDetailOpen(true);
    }
  }, [fp, isTouch]);

  const handleTableDoubleClick = (id: number) => {
    const table = fp.filteredTables.find((t) => t.id === id);
    if (table) {
      if (isTouch) {
        // On touch, double-tap opens POS detail
        fp.setSelectedTableId(id);
        setTableDetailOpen(true);
      } else {
        setEditingTable(table);
        setTableEditorOpen(true);
      }
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

  const assigned = fp.guests.filter((g) => g.eventTableId).length;

  return (
    <div className={
      isFullscreen
        ? "flex flex-col fixed inset-0 z-50 bg-background overflow-hidden"
        : `flex flex-col ${isTouch ? "h-[calc(100vh-80px)]" : "h-[calc(100vh-200px)]"} min-h-[500px] overflow-hidden max-w-full`
    }>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-y-1 justify-between p-2 border-b bg-card rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Room selector — always visible */}
          {fp.allRooms.length > 0 && (
            <Select
              value={fp.selectedRoomId?.toString() ?? ""}
              onValueChange={(v) => fp.setSelectedRoomId(parseInt(v))}
            >
              <SelectTrigger className="w-52 h-8">
                <SelectValue placeholder="Vyberte místnost" />
              </SelectTrigger>
              <SelectContent>
                {fp.buildings.map((building) => (
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
          )}

          {/* ── Editor-only controls — hidden on touch devices ── */}
          {!isTouch && (
            <>
              {/* Room shape editing */}
              {fp.selectedRoom && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setRoomShapeEditorOpen(true)} title="Upravit tvar místnosti">
                    <PencilRuler className="h-3 w-3 mr-1" />
                    Tvar místnosti
                  </Button>
                  {fp.selectedRoom.shapeData?.points && (
                    <Button variant="ghost" size="sm" onClick={() => fp.handleResetRoomShape(fp.selectedRoom!.id)} title="Resetovat na obdélník">
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                </>
              )}

              <div className="h-6 border-l mx-1" />

              {/* Preset table buttons */}
              <Button variant="outline" size="sm" onClick={() => fp.handleAddTable("rectangle")} title="Obdélníkový stůl (8 míst)">
                <Square className="h-3 w-3 mr-1" />
                Stůl 8
              </Button>
              <Button variant="outline" size="sm" onClick={() => fp.handleAddTable("rectangle6")} title="Obdélníkový stůl (6 míst)">
                <Square className="h-3 w-3 mr-1" />
                Stůl 6
              </Button>
              <Button variant="outline" size="sm" onClick={() => fp.handleAddTable("round")} title="Kulatý stůl (4 místa)">
                <Circle className="h-3 w-3 mr-1" />
                Kulatý 4
              </Button>

              <div className="h-6 border-l mx-1" />

              {/* Element buttons */}
              <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("stage")} title="Stage"><Music className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("band")} title="Band"><Guitar className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("bar")} title="Bar"><Wine className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("entrance")} title="Entrance"><DoorOpen className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("exit")} title="Exit"><LogOut className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("stairs")} title="Stairs"><Footprints className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("terrace")} title="Terrace"><TreePalm className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("balcony")} title="Balkon"><Building2 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("photo")} title="Photo"><Camera className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("dance_floor")} title="Parket"><Disc className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => fp.handleAddElement("buffet")} title="Bufet"><ChefHat className="h-4 w-4" /></Button>

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

                  {fp.selectedTableId && !fp.isSelectedLocked && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => fp.handleTableResize(fp.selectedTableId!, -20)} title="Zmenšit">
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {(fp.selectedItem as EventTable).widthPx ?? 80}x{(fp.selectedItem as EventTable).heightPx ?? 80}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => fp.handleTableResize(fp.selectedTableId!, 20)} title="Zvětšit">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </>
                  )}

                  {fp.selectedTableId && (
                    <Button variant="outline" size="sm" onClick={() => fp.handleDuplicateTable(fp.selectedTableId!)} title="Duplikovat">
                      <Copy className="h-3 w-3 mr-1" />
                      Duplikovat
                    </Button>
                  )}

                  {fp.selectedElementId && (
                    <Button variant="outline" size="sm" onClick={() => handleDrawPolygon(fp.selectedElementId!)} title="Vlastní tvar">
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
            </>
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {/* Stats — always visible */}
          <Badge variant="secondary" className="text-xs">
            {fp.filteredTables.length} stolů
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {assigned}/{fp.guests.length} hostů
          </Badge>

          {fp.isDirty && <Badge variant="destructive" className="text-xs">Neulož.</Badge>}
          {fp.lastSavedAt && !fp.isDirty && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {fp.lastSavedAt.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </Badge>
          )}

          {/* Templates — desktop only */}
          {!isTouch && (
            <>
              {fp.templates.length > 0 && (() => {
                const roomTemplates = fp.templates.filter((t) => t.roomId === fp.selectedRoomId);
                const otherTemplates = fp.templates.filter((t) => t.roomId !== fp.selectedRoomId);
                return (
                  <Select onValueChange={(v) => fp.applyTemplate(parseInt(v))}>
                    <SelectTrigger className="w-48 h-8">
                      <SelectValue placeholder="Načíst šablonu..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTemplates.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Pro tuto místnost</div>
                          {roomTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id.toString()}>
                              {t.isDefault ? "⭐ " : ""}{t.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {otherTemplates.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Ostatní šablony</div>
                          {otherTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id.toString()}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                );
              })()}

              <Button variant="outline" size="sm" onClick={() => fp.saveAsTemplate(`Šablona z akce`)}>
                <LayoutTemplate className="h-3 w-3 mr-1" />
                Uložit jako šablonu
              </Button>
            </>
          )}

          <Button onClick={fp.handleSave} disabled={fp.savePending || !fp.isDirty} size="sm">
            <Save className="h-3 w-3 mr-1" />
            {fp.savePending ? "..." : "Uložit"}
          </Button>

          {/* Sidebar toggle — touch only */}
          {isTouch && (
            <Button variant="outline" size="sm" onClick={() => setSidebarOpen(true)} title="Hosté">
              <Users className="h-4 w-4" />
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={toggleFullscreen} title={isFullscreen ? "Ukončit celou obrazovku" : "Celá obrazovka"}>
            {isFullscreen ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* ── Main content: canvas + sidebar ── */}
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
            onSelectTable={handleTableSelect}
            onSelectElement={fp.setSelectedElementId}
            onTableMove={fp.handleTableMove}
            onElementMove={fp.handleElementMove}
            onTableDoubleClick={handleTableDoubleClick}
            onElementDoubleClick={(id) => handleDrawPolygon(id)}
            onElementTransform={fp.handleElementTransform}
            onTableTransform={fp.handleTableTransform}
          />
        </div>

        {/* Sidebar: inline on desktop, overlay sheet on touch */}
        {isTouch ? (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="right" className="w-80 p-0">
              <FloorPlanSidebar
                guests={fp.guests}
                tables={fp.filteredTables}
                selectedTableId={fp.selectedTableId}
                room={fp.selectedRoom}
                onAssignGuest={fp.handleAssignGuest}
                onUnassignGuest={fp.handleUnassignGuest}
                onAutoSeatGuests={fp.handleAutoSeatGuests}
              />
            </SheetContent>
          </Sheet>
        ) : (
          <FloorPlanSidebar
            guests={fp.guests}
            tables={fp.filteredTables}
            selectedTableId={fp.selectedTableId}
            room={fp.selectedRoom}
            onAssignGuest={fp.handleAssignGuest}
            onUnassignGuest={fp.handleUnassignGuest}
            onAutoSeatGuests={fp.handleAutoSeatGuests}
          />
        )}
      </div>

      {/* ── Table detail (POS sheet) ── */}
      <TableDetailPopover
        isOpen={tableDetailOpen}
        onClose={() => setTableDetailOpen(false)}
        table={fp.filteredTables.find((t) => t.id === fp.selectedTableId) ?? null}
        guests={fp.guests}
        eventId={eventId}
        onUnassignGuest={fp.handleUnassignGuest}
      />

      {/* Table editor dialog — desktop only */}
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
            initialPoints={polygonTargetId ? fp.filteredElements.find((e) => e.id === polygonTargetId)?.shapeData?.points : undefined}
            onSave={handleSavePolygon}
            onCancel={() => setPolygonDrawerOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Room shape editor */}
      <Dialog open={roomShapeEditorOpen} onOpenChange={(open) => !open && setRoomShapeEditorOpen(false)}>
        <DialogContent className="max-w-4xl w-[95vw] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Upravit tvar místnosti: {fp.selectedRoom?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Nakreslete obrys místnosti. Klikáním přidávejte body, klikem u prvního bodu tvar uzavřete.
          </p>
          {fp.selectedRoom && (
            <PolygonDrawer
              width={700}
              height={500}
              initialPoints={fp.selectedRoom.shapeData?.points}
              onSave={(points) => { fp.handleSaveRoomShape(fp.selectedRoom!.id, points); setRoomShapeEditorOpen(false); }}
              onCancel={() => setRoomShapeEditorOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
