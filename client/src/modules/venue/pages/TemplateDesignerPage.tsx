import { useState, useCallback, useMemo, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
  Save, Circle, Square, Music, Disc, Wine, ChefHat, DoorOpen, Loader2,
  Lock, Unlock, Trash2, PenTool, ArrowLeft, Plus, Minus, Copy,
  Guitar, Camera, Footprints, LogOut, TreePalm, Building2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { useToast } from "@/shared/hooks/use-toast";
import { useTemplate, useUpdateTemplate } from "../hooks/useTemplates";
import { useBuildings } from "../hooks/useBuildings";
import { FloorPlanEditor } from "@/modules/events/components/floor-plan/canvas/FloorPlanEditor";
import { PolygonDrawer } from "@/modules/events/components/floor-plan/canvas/PolygonDrawer";
import { DEFAULT_CAPACITY, DEFAULT_TABLE_SIZE, DEFAULT_ELEMENT_SIZE } from "@/modules/events/components/floor-plan/constants";
import type { EventTable, FloorPlanElement, TableShape, FloorPlanElementType, Building } from "@shared/types";

let nextTempId = -1;
const getTempId = () => nextTempId--;

export function TemplateDesignerPage() {
  const [, params] = useRoute("/venue/templates/:id/designer");
  const [, navigate] = useLocation();
  const templateId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();

  const { data: template, isLoading, isError } = useTemplate(templateId);
  const updateTemplate = useUpdateTemplate();
  const { data: buildings = [] } = useBuildings();

  const allRooms = useMemo(() => buildings.flatMap((b: Building) => b.rooms ?? []), [buildings]);

  // Local state
  const [tables, setTables] = useState<EventTable[]>([]);
  const [elements, setElements] = useState<FloorPlanElement[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [polygonDrawerOpen, setPolygonDrawerOpen] = useState(false);
  const [polygonTargetId, setPolygonTargetId] = useState<number | null>(null);

  const selectedRoom = allRooms.find((r) => r.id === selectedRoomId) || null;

  // Init from template data
  useEffect(() => {
    if (template?.layoutData) {
      const layoutTables = (template.layoutData.tables ?? []).map((t, i) => ({
        ...t,
        id: t.id ?? -(i + 100),
        eventId: 0,
        isLocked: t.isLocked ?? false,
        sortOrder: t.sortOrder ?? i,
        room: t.room ?? "cely_areal",
        guests: [],
      })) as EventTable[];
      const layoutElements = (template.layoutData.elements ?? []).map((e, i) => ({
        ...e,
        id: e.id ?? -(i + 1000),
        eventId: 0,
        isLocked: e.isLocked ?? false,
        sortOrder: e.sortOrder ?? i,
      })) as FloorPlanElement[];
      setTables(layoutTables);
      setElements(layoutElements);
      if (template.roomId) setSelectedRoomId(template.roomId);
    }
  }, [template]);

  // Auto-select first room when rooms load
  useEffect(() => {
    if (allRooms.length > 0 && selectedRoomId === null && !template?.roomId) {
      setSelectedRoomId(allRooms[0].id);
    }
  }, [allRooms, selectedRoomId, template?.roomId]);

  // Warn before leaving
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
        handleDeleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedTableId, selectedElementId]);

  // Save
  const handleSave = () => {
    if (!templateId) return;
    updateTemplate.mutate(
      {
        id: templateId,
        layoutData: {
          tables: tables.map((t) => ({
            tableName: t.tableName,
            room: t.room,
            roomId: t.roomId,
            capacity: t.capacity,
            positionX: t.positionX ?? 0,
            positionY: t.positionY ?? 0,
            shape: t.shape,
            widthPx: t.widthPx,
            heightPx: t.heightPx,
            rotation: t.rotation,
            tableNumber: t.tableNumber,
            color: t.color,
            isLocked: t.isLocked,
            sortOrder: t.sortOrder,
          })),
          elements: elements.map((e) => ({
            elementType: e.elementType,
            label: e.label,
            roomId: e.roomId,
            positionX: e.positionX,
            positionY: e.positionY,
            widthPx: e.widthPx,
            heightPx: e.heightPx,
            rotation: e.rotation,
            shape: e.shape,
            shapeData: e.shapeData,
            color: e.color,
            isLocked: e.isLocked,
            sortOrder: e.sortOrder,
          })),
        },
        roomId: selectedRoomId ?? undefined,
      },
      {
        onSuccess: () => {
          setIsDirty(false);
          toast({ title: "Šablona uložena" });
        },
        onError: () => toast({ title: "Chyba při ukládání", variant: "destructive" }),
      }
    );
  };

  // Handlers
  const handleTableMove = useCallback((id: number, x: number, y: number) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, positionX: x, positionY: y } : t)));
    setIsDirty(true);
  }, []);

  const handleElementMove = useCallback((id: number, x: number, y: number) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, positionX: x, positionY: y } : e)));
    setIsDirty(true);
  }, []);

  const handleAddTable = (shapeKey: string = "round") => {
    const actualShape: TableShape = shapeKey === "rectangle6" ? "rectangle" : (shapeKey as TableShape);
    const newTable: EventTable = {
      id: getTempId(),
      eventId: 0,
      tableName: `Stůl ${tables.length + 1}`,
      room: selectedRoom?.slug ?? "cely_areal",
      roomId: selectedRoomId ?? undefined,
      capacity: DEFAULT_CAPACITY[shapeKey] ?? DEFAULT_CAPACITY[actualShape] ?? 6,
      positionX: 100 + Math.random() * 200,
      positionY: 100 + Math.random() * 200,
      shape: actualShape,
      widthPx: DEFAULT_TABLE_SIZE[shapeKey]?.width ?? DEFAULT_TABLE_SIZE[actualShape]?.width ?? 60,
      heightPx: DEFAULT_TABLE_SIZE[shapeKey]?.height ?? DEFAULT_TABLE_SIZE[actualShape]?.height ?? 100,
      rotation: 0,
      isLocked: false,
      sortOrder: tables.length,
    };
    setTables((prev) => [...prev, newTable]);
    setSelectedTableId(newTable.id);
    setIsDirty(true);
  };

  const handleAddElement = (elementType: FloorPlanElementType) => {
    const defaultSize = DEFAULT_ELEMENT_SIZE[elementType] ?? DEFAULT_ELEMENT_SIZE.custom;
    const newElement: FloorPlanElement = {
      id: getTempId(),
      eventId: 0,
      roomId: selectedRoomId ?? undefined,
      elementType,
      label: undefined,
      positionX: 200 + Math.random() * 100,
      positionY: 200 + Math.random() * 100,
      widthPx: defaultSize.width,
      heightPx: defaultSize.height,
      rotation: 0,
      shape: "rectangle",
      isLocked: false,
      sortOrder: elements.length,
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
    setIsDirty(true);
  };

  const handleDuplicateTable = (id: number) => {
    const source = tables.find((t) => t.id === id);
    if (!source) return;
    const copy: EventTable = {
      ...source,
      id: getTempId(),
      tableName: `Stůl ${tables.length + 1}`,
      positionX: (source.positionX ?? 100) + 40,
      positionY: (source.positionY ?? 100) + 40,
      isLocked: false,
      guests: [],
    };
    setTables((prev) => [...prev, copy]);
    setSelectedTableId(copy.id);
    setIsDirty(true);
  };

  const handleDeleteSelected = () => {
    if (selectedTableId) {
      const t = tables.find((t) => t.id === selectedTableId);
      if (t?.isLocked) return;
      setTables((prev) => prev.filter((t) => t.id !== selectedTableId));
      setSelectedTableId(null);
      setIsDirty(true);
    } else if (selectedElementId) {
      const el = elements.find((e) => e.id === selectedElementId);
      if (el?.isLocked) return;
      setElements((prev) => prev.filter((e) => e.id !== selectedElementId));
      setSelectedElementId(null);
      setIsDirty(true);
    }
  };

  const handleToggleLock = () => {
    if (selectedTableId) {
      setTables((prev) => prev.map((t) => (t.id === selectedTableId ? { ...t, isLocked: !t.isLocked } : t)));
      setIsDirty(true);
    } else if (selectedElementId) {
      setElements((prev) => prev.map((e) => (e.id === selectedElementId ? { ...e, isLocked: !e.isLocked } : e)));
      setIsDirty(true);
    }
  };

  const handleTableResize = useCallback((id: number, delta: number) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const w = t.widthPx ?? 80;
        const h = t.heightPx ?? 80;
        if (t.shape === "round" || t.shape === "square") {
          const size = Math.max(40, w + delta);
          return { ...t, widthPx: size, heightPx: size };
        }
        return { ...t, widthPx: Math.max(40, w + delta), heightPx: Math.max(40, h + delta) };
      })
    );
    setIsDirty(true);
  }, []);

  const handleElementTransform = useCallback(
    (id: number, attrs: { width: number; height: number; rotation: number; x: number; y: number }) => {
      setElements((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, widthPx: attrs.width, heightPx: attrs.height, rotation: attrs.rotation, positionX: attrs.x, positionY: attrs.y } : e
        )
      );
      setIsDirty(true);
    }, []
  );

  const handleTableTransform = useCallback(
    (id: number, attrs: { width: number; height: number; rotation: number; x: number; y: number }) => {
      setTables((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, widthPx: attrs.width, heightPx: attrs.height, rotation: attrs.rotation, positionX: attrs.x, positionY: attrs.y } : t
        )
      );
      setIsDirty(true);
    }, []
  );

  const selectedItem = selectedTableId
    ? tables.find((t) => t.id === selectedTableId)
    : selectedElementId ? elements.find((e) => e.id === selectedElementId) : null;
  const isSelectedLocked = selectedItem ? ('isLocked' in selectedItem ? selectedItem.isLocked : false) : false;

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (isError) {
    return <div className="flex items-center justify-center h-96 text-destructive">Nepodařilo se načíst šablonu. Zkuste obnovit stránku.</div>;
  }

  if (!template) {
    return <div className="flex items-center justify-center h-96 text-muted-foreground">Šablona nenalezena</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] min-h-[500px]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-y-1 justify-between p-2 border-b bg-card flex-shrink-0">
        <div className="flex items-center gap-1 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate("/venue/templates")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Zpět
          </Button>

          <div className="h-6 border-l mx-1" />
          <span className="font-semibold text-sm">{template.name}</span>
          <div className="h-6 border-l mx-1" />

          {/* Room selector */}
          {allRooms.length > 0 && (
            <Select
              value={selectedRoomId?.toString() ?? ""}
              onValueChange={(v) => setSelectedRoomId(parseInt(v))}
            >
              <SelectTrigger className="w-52 h-8">
                <SelectValue placeholder="Vyberte místnost" />
              </SelectTrigger>
              <SelectContent>
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
          )}

          <div className="h-6 border-l mx-1" />

          {/* Preset table buttons */}
          <Button variant="outline" size="sm" onClick={() => handleAddTable("rectangle")} title="Obdélníkový stůl (8 míst)">
            <Square className="h-3 w-3 mr-1" />
            Stůl 8
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddTable("rectangle6")} title="Obdélníkový stůl (6 míst)">
            <Square className="h-3 w-3 mr-1" />
            Stůl 6
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddTable("round")} title="Kulatý stůl (4 místa)">
            <Circle className="h-3 w-3 mr-1" />
            Kulatý 4
          </Button>

          <div className="h-6 border-l mx-1" />

          {/* Element buttons */}
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("stage")} title="Stage">
            <Music className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("band")} title="Band">
            <Guitar className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("bar")} title="Bar">
            <Wine className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("entrance")} title="Entrance">
            <DoorOpen className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("exit")} title="Exit">
            <LogOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("stairs")} title="Stairs">
            <Footprints className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("terrace")} title="Terrace">
            <TreePalm className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("balcony")} title="Balkon">
            <Building2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("photo")} title="Photo">
            <Camera className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("dance_floor")} title="Taneční parket">
            <Disc className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("buffet")} title="Bufet">
            <ChefHat className="h-4 w-4" />
          </Button>

          <div className="h-6 border-l mx-1" />

          {/* Selection actions */}
          {selectedItem && (
            <>
              <Button variant={isSelectedLocked ? "default" : "outline"} size="sm" onClick={handleToggleLock}>
                {isSelectedLocked ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                {isSelectedLocked ? "Zamčeno" : "Zamknout"}
              </Button>

              {selectedTableId && !isSelectedLocked && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleTableResize(selectedTableId!, -20)} title="Zmenšit">
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {(selectedItem as EventTable).widthPx ?? 80}x{(selectedItem as EventTable).heightPx ?? 80}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => handleTableResize(selectedTableId!, 20)} title="Zvětšit">
                    <Plus className="h-3 w-3" />
                  </Button>
                </>
              )}

              {selectedTableId && (
                <Button variant="outline" size="sm" onClick={() => handleDuplicateTable(selectedTableId!)} title="Duplikovat">
                  <Copy className="h-3 w-3 mr-1" />
                  Duplikovat
                </Button>
              )}

              {selectedElementId && (
                <Button variant="outline" size="sm" onClick={() => { setPolygonTargetId(selectedElementId); setPolygonDrawerOpen(true); }}>
                  <PenTool className="h-3 w-3 mr-1" />
                  Tvar
                </Button>
              )}
              {!isSelectedLocked && (
                <Button variant="ghost" size="sm" onClick={handleDeleteSelected}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{tables.length} stolů</Badge>
          <Badge variant="secondary" className="text-xs">{elements.length} prvků</Badge>
          {isDirty && <Badge variant="destructive" className="text-xs">Neuloženo</Badge>}
          <Button onClick={handleSave} disabled={updateTemplate.isPending || !isDirty} size="sm">
            <Save className="h-3 w-3 mr-1" />
            {updateTemplate.isPending ? "Ukládám..." : "Uložit"}
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden relative">
        <FloorPlanEditor
          tables={tables}
          elements={elements}
          guests={[]}
          room={selectedRoom}
          canvasWidth={800}
          canvasHeight={600}
          selectedTableId={selectedTableId}
          selectedElementId={selectedElementId}
          onSelectTable={(id) => { setSelectedTableId(id); setSelectedElementId(null); }}
          onSelectElement={(id) => { setSelectedElementId(id); setSelectedTableId(null); }}
          onTableMove={handleTableMove}
          onElementMove={handleElementMove}
          onTableDoubleClick={() => {}}
          onElementDoubleClick={(id) => { setPolygonTargetId(id); setPolygonDrawerOpen(true); }}
          onElementTransform={handleElementTransform}
          onTableTransform={handleTableTransform}
        />
      </div>

      {/* Polygon drawer */}
      <Dialog open={polygonDrawerOpen} onOpenChange={(open) => !open && setPolygonDrawerOpen(false)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nakreslit vlastní tvar</DialogTitle>
          </DialogHeader>
          <PolygonDrawer
            width={600}
            height={400}
            initialPoints={
              polygonTargetId ? elements.find((e) => e.id === polygonTargetId)?.shapeData?.points : undefined
            }
            onSave={(points) => {
              if (polygonTargetId) {
                setElements((prev) =>
                  prev.map((e) => (e.id === polygonTargetId ? { ...e, shape: "polygon", shapeData: { points } } : e))
                );
                setIsDirty(true);
              }
              setPolygonDrawerOpen(false);
              setPolygonTargetId(null);
            }}
            onCancel={() => setPolygonDrawerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
