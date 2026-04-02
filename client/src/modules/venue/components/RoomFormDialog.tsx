import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { PenTool, ChevronDown, ChevronRight } from "lucide-react";
import type { Room } from "@shared/types";
import { PolygonDrawer } from "@/modules/events/components/floor-plan/canvas/PolygonDrawer";

const schema = z.object({
  name: z.string().min(1, "Zadejte název místnosti"),
  slug: z.string().min(1, "Zadejte slug"),
  widthCm: z.coerce.number().int().min(100, "Min 100 cm"),
  heightCm: z.coerce.number().int().min(100, "Min 100 cm"),
  color: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
  buildingId: number;
  onSubmit: (data: FormData & { buildingId: number; shapeData?: { points: number[] } | null }) => void;
  isLoading?: boolean;
}

export function RoomFormDialog({ isOpen, onClose, room, buildingId, onSubmit, isLoading }: Props) {
  const [shapeData, setShapeData] = useState<{ points: number[] } | null>(room?.shapeData ?? null);
  const [showPolygonEditor, setShowPolygonEditor] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: room?.name ?? "",
      slug: room?.slug ?? "",
      widthCm: room?.widthCm ?? 1000,
      heightCm: room?.heightCm ?? 800,
      color: room?.color ?? "#6366f1",
      sortOrder: room?.sortOrder ?? 0,
      isActive: room?.isActive ?? true,
    },
  });

  const handleNameChange = (value: string) => {
    form.setValue("name", value);
    if (!room) {
      const slug = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      form.setValue("slug", slug);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={showPolygonEditor ? "max-w-2xl" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle>{room ? "Upravit místnost" : "Nová místnost"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => onSubmit({ ...data, buildingId, shapeData }))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Název</FormLabel>
                  <FormControl>
                    <Input {...field} onChange={(e) => handleNameChange(e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="widthCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Šířka (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>Reálná šířka</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heightCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hloubka (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormDescription>Reálná hloubka</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barva</FormLabel>
                  <FormControl>
                    <Input type="color" {...field} className="h-10 w-20" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pořadí</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormLabel>Aktivní</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            {/* Room shape editor */}
            <div className="border rounded-lg">
              <button
                type="button"
                className="w-full flex items-center gap-2 p-3 text-sm font-medium hover:bg-muted/50 rounded-lg"
                onClick={() => setShowPolygonEditor(!showPolygonEditor)}
              >
                {showPolygonEditor ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <PenTool className="h-4 w-4" />
                Tvar místnosti
                {shapeData && <span className="text-xs text-muted-foreground ml-auto">{shapeData.points.length / 2} bodů</span>}
              </button>
              {showPolygonEditor && (
                <div className="p-3 pt-0">
                  <PolygonDrawer
                    width={500}
                    height={350}
                    initialPoints={shapeData?.points}
                    onSave={(points) => {
                      setShapeData({ points });
                      setShowPolygonEditor(false);
                    }}
                    onCancel={() => setShowPolygonEditor(false)}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Zrušit</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Ukládám..." : "Uložit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
