import type { EventTable } from "@shared/types";
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
  room: z.enum(["roubenka", "terasa", "stodolka", "cely_areal"], {
    required_error: "Vyberte místnost",
  }),
  capacity: z.coerce.number().min(1, "Kapacita musí být alespoň 1"),
});

export type TableForm = z.infer<typeof tableSchema>;

interface TableEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTable: EventTable | null;
  defaultRoom: string;
  onSave: (data: TableForm) => void;
  onCancel: () => void;
}

export default function TableEditorDialog({
  open,
  onOpenChange,
  editingTable,
  defaultRoom,
  onSave,
  onCancel,
}: TableEditorDialogProps) {
  const tableForm = useForm<TableForm>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      tableName: "",
      room: defaultRoom as TableForm["room"],
      capacity: 10,
    },
  });

  // Reset form when dialog opens with editing data or fresh defaults
  useEffect(() => {
    if (open) {
      if (editingTable) {
        tableForm.reset({
          tableName: editingTable.tableName,
          room: editingTable.room as TableForm["room"],
          capacity: editingTable.capacity,
        });
      } else {
        tableForm.reset({
          tableName: "",
          room: defaultRoom as TableForm["room"],
          capacity: 10,
        });
      }
    }
  }, [open, editingTable, defaultRoom, tableForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTable ? "Upravit stůl" : "Nový stůl"}</DialogTitle>
          <DialogDescription>
            Zadejte informace o stolu
          </DialogDescription>
        </DialogHeader>
        <Form {...tableForm}>
          <form onSubmit={tableForm.handleSubmit(onSave)} className="space-y-4">
            <FormField
              control={tableForm.control}
              name="tableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Název stolu *</FormLabel>
                  <FormControl>
                    <Input placeholder="Stůl 1" {...field} data-testid="input-table-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={tableForm.control}
              name="room"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Místnost *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-table-room">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="roubenka">Roubenka</SelectItem>
                      <SelectItem value="terasa">Terasa</SelectItem>
                      <SelectItem value="stodolka">Stodolka</SelectItem>
                      <SelectItem value="cely_areal">Celý areál</SelectItem>
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
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      data-testid="input-table-capacity"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Zrušit
              </Button>
              <Button type="submit" data-testid="button-save-table">
                {editingTable ? "Uložit" : "Vytvořit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
