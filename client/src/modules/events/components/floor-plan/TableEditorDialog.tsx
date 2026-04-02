import type { EventTable, TableShape } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";

const tableSchema = z.object({
  tableName: z.string().min(1, "Zadejte název stolu"),
  room: z.string().min(1, "Vyberte místnost"),
  capacity: z.coerce.number().min(1, "Kapacita musí být alespoň 1"),
  shape: z.enum(["round", "rectangle", "oval", "square"]).default("round"),
  widthPx: z.coerce.number().optional(),
  heightPx: z.coerce.number().optional(),
  rotation: z.coerce.number().default(0),
  tableNumber: z.coerce.number().optional(),
  color: z.string().optional(),
});

export type TableForm = z.infer<typeof tableSchema>;

const TABLE_SHAPE_LABELS: Record<string, string> = {
  round: "Kulatý",
  rectangle: "Obdélníkový",
  square: "Čtvercový",
};

// Support both old and new interface
interface TableEditorDialogProps {
  // New interface
  isOpen?: boolean;
  onClose?: () => void;
  table?: EventTable | null;
  onSave?: (data: TableForm) => void;
  // Old interface (backward compat)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editingTable?: EventTable | null;
  defaultRoom?: string;
  onCancel?: () => void;
}

export default function TableEditorDialog(props: TableEditorDialogProps) {
  const isOpen = props.isOpen ?? props.open ?? false;
  const table = props.table ?? props.editingTable ?? null;
  const defaultRoom = props.defaultRoom ?? "cely_areal";

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      props.onClose?.();
      props.onOpenChange?.(false);
    }
  };

  const tableForm = useForm<TableForm>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      tableName: "",
      room: defaultRoom,
      capacity: 8,
      shape: "round",
      widthPx: 80,
      heightPx: 80,
      rotation: 0,
      tableNumber: undefined,
      color: undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (table) {
        tableForm.reset({
          tableName: table.tableName,
          room: table.room,
          capacity: table.capacity,
          shape: table.shape || "round",
          widthPx: table.widthPx ?? 80,
          heightPx: table.heightPx ?? 80,
          rotation: table.rotation ?? 0,
          tableNumber: table.tableNumber ?? undefined,
          color: table.color ?? undefined,
        });
      } else {
        tableForm.reset({
          tableName: "",
          room: defaultRoom,
          capacity: 8,
          shape: "round",
          widthPx: 80,
          heightPx: 80,
          rotation: 0,
        });
      }
    }
  }, [isOpen, table, defaultRoom, tableForm]);

  const handleSubmit = (data: TableForm) => {
    props.onSave?.(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{table ? "Upravit stůl" : "Nový stůl"}</DialogTitle>
          <DialogDescription>Zadejte informace o stolu</DialogDescription>
        </DialogHeader>
        <Form {...tableForm}>
          <form onSubmit={tableForm.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={tableForm.control}
                name="tableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Název stolu *</FormLabel>
                    <FormControl>
                      <Input placeholder="Stůl 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={tableForm.control}
                name="tableNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Číslo stolu</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={tableForm.control}
                name="shape"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tvar</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TABLE_SHAPE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={tableForm.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kapacita *</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={tableForm.control}
                name="widthPx"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Šířka (px)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={tableForm.control}
                name="heightPx"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Výška (px)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={tableForm.control}
                name="rotation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rotace (°)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="360" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={tableForm.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barva</FormLabel>
                  <FormControl>
                    <Input type="color" {...field} value={field.value || "#e5e7eb"} className="h-10 w-20" />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Zrušit
              </Button>
              <Button type="submit">
                {table ? "Uložit" : "Vytvořit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
