import { useState, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDashboardLayout } from "./DashboardLayoutContext";
import { DashboardBox } from "./DashboardBox";
import { cn } from "@/shared/lib/utils";

interface BoxConfig {
  id: string;
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  render: () => ReactNode;
}

interface DashboardGridProps {
  boxes: BoxConfig[];
}

/**
 * Grid container with drag-and-drop reordering
 */
export function DashboardGrid({ boxes }: DashboardGridProps) {
  const { layout, boxOrder, reorderBox, isFullWidth } = useDashboardLayout();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort boxes by stored order
  const sortedBoxes = [...boxes].sort((a, b) => {
    const indexA = boxOrder.indexOf(a.id);
    const indexB = boxOrder.indexOf(b.id);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const handleDragStart = (event: DragStartEvent) => {
    console.log("[DnD] Drag started:", event.active.id);
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log("[DnD] Drag ended:", { activeId: active.id, overId: over?.id });
    setActiveId(null);

    if (over && active.id !== over.id) {
      console.log("[DnD] Reordering:", active.id, "->", over.id);
      reorderBox(active.id as string, over.id as string);
    }
  };

  const handleDragCancel = () => {
    console.log("[DnD] Drag cancelled");
    setActiveId(null);
  };

  // Grid class based on layout
  const gridClass = cn(
    "grid gap-4",
    layout === "3col" && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    layout === "2col" && "grid-cols-1 lg:grid-cols-2",
    layout === "1col" && "grid-cols-1"
  );

  // Use rect strategy for multi-column, vertical for single column
  const sortingStrategy = layout === "1col" ? verticalListSortingStrategy : rectSortingStrategy;

  const activeBox = activeId ? sortedBoxes.find((box) => box.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={sortedBoxes.map((box) => box.id)}
        strategy={sortingStrategy}
      >
        <div className={gridClass}>
          {sortedBoxes.map((box) => (
            <SortableBox
              key={box.id}
              id={box.id}
              title={box.title}
              icon={box.icon}
              badge={box.badge}
              isFullWidth={isFullWidth(box.id)}
              layout={layout}
            >
              {box.render()}
            </SortableBox>
          ))}
        </div>
      </SortableContext>

      {/* Drag overlay for better visual feedback */}
      <DragOverlay>
        {activeBox ? (
          <div className="opacity-80 shadow-2xl rounded-lg">
            <DashboardBox
              id={activeBox.id}
              title={activeBox.title}
              icon={activeBox.icon}
              isDragging
            >
              <div className="h-24 bg-muted/50 flex items-center justify-center text-muted-foreground">
                Přesouvání...
              </div>
            </DashboardBox>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface SortableBoxProps {
  id: string;
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  isFullWidth: boolean;
  layout: string;
}

function SortableBox({ id, title, icon, badge, children, isFullWidth, layout }: SortableBoxProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isFullWidth && layout !== "1col" && "col-span-full",
        isDragging && "opacity-50"
      )}
    >
      <DashboardBox
        id={id}
        title={title}
        icon={icon}
        badge={badge}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      >
        {children}
      </DashboardBox>
    </div>
  );
}
