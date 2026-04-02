import { useState, useCallback, useMemo, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
  Save, Circle, Square, Music, Disc, Wine, ChefHat, DoorOpen, Loader2,
  Lock, Unlock, Trash2, PenTool, ArrowLeft,
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

  const handleAddTable = (shape: TableShape = "round") => {
    const newTable: EventTable = {
      id: getTempId(),
      eventId: 0,
      tableName: `Stůl ${tables.length + 1}`,
      room: (selectedRoom?.slug as any) ?? "cely_areal",
      roomId: selectedRoomId ?? undefined,
      capacity: DEFAULT_CAPACITY[shape] ?? 6,
      positionX: 100 + Math.random() * 200,
      positionY: 100 + Math.random() * 200,
      shape,
      widthPx: DEFAULT_TABLE_SIZE[shape]?.width ?? 80,
      heightPx: DEFAULT_TABLE_SIZE[shape]?.height ?? 80,
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
      <div className="flex items-center justify-between p-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/venue/templates")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Zpět
          </Button>

          <div className="h-6 border-l mx-1" />

          <span className="font-semibold text-sm">{template.name}</span>

          <div className="h-6 border-l mx-1" />

          {allRooms.length > 0 && (
            <Select value={selectedRoomId?.toString() ?? "all"} onValueChange={(v) => setSelectedRoomId(v === "all" ? null : parseInt(v))}>
              <SelectTrigger className="w-48 h-8">
                <SelectValue placeholder="Všechny místnosti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny místnosti</SelectItem>
                {allRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id.toString()}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="h-6 border-l mx-1" />

          <Button variant="outline" size="sm" onClick={() => handleAddTable("round")}>
            <Circle className="h-3 w-3 mr-1" />
            Kulatý
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddTable("rectangle")}>
            <Square className="h-3 w-3 mr-1" />
            Obdélník
          </Button>

          <div className="h-6 border-l mx-1" />

          <Button variant="ghost" size="sm" onClick={() => handleAddElement("stage")} title="Podium">
            <Music className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("dance_floor")} title="Parket">
            <Disc className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("bar")} title="Bar">
            <Wine className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("buffet")} title="Bufet">
            <ChefHat className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleAddElement("entrance")} title="Vchod">
            <DoorOpen className="h-4 w-4" />
          </Button>

          {selectedItem && (
            <>
              <div className="h-6 border-l mx-1" />
              <Button variant={isSelectedLocked ? "default" : "outline"} size="sm" onClick={handleToggleLock}>
                {isSelectedLocked ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                {isSelectedLocked ? "Zamčeno" : "Zamknout"}
              </Button>
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
      <div className="flex-1 overflow-hidden">
        <FloorPlanEditor
          tables={tables}
          elements={elements}
          guests={[]}
          room={selectedRoom}
          canvasWidth={800}
          canvasHeight={600}
          selectedTableId={selectedTableId}
          selectedElementId={selectedElementId}
          onSelectTable={setSelectedTableId}
          onSelectElement={setSelectedElementId}
          onTableMove={handleTableMove}
          onElementMove={handleElementMove}
          onTableDoubleClick={() => {}}
          onElementDoubleClick={(id) => { setPolygonTargetId(id); setPolygonDrawerOpen(true); }}
          onElementTransform={handleElementTransform}
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
