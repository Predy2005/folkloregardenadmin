import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import { GUEST_TYPE_LABELS } from "./constants";
import { NationalityInput } from "@/shared/components/NationalityInput";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Loader2 } from "lucide-react";

export type BulkActionType =
  | "nationality"
  | "type"
  | "isPaid"
  | "isPresent"
  | "delete"
  | null;

export interface BulkActionDialogProps {
  eventId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<number>;
  actionType: BulkActionType;
  onSuccess: () => void;
}

export default function BulkActionDialog({
  eventId,
  open,
  onOpenChange,
  selectedIds,
  actionType,
  onSuccess,
}: BulkActionDialogProps) {
  const [value, setValue] = useState("");

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
  };

  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { guestIds: number[]; updates: Record<string, string | boolean> }) => {
      return await api.put(`/api/events/${eventId}/guests/bulk-update`, data);
    },
    onSuccess: (data: { count: number }) => {
      invalidateQueries();
      onOpenChange(false);
      onSuccess();
      successToast(`Aktualizováno ${data.count} hostů`);
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (guestIds: number[]) => {
      return await api.delete(`/api/events/${eventId}/guests/bulk-delete`, {
        data: { guestIds },
      });
    },
    onSuccess: (data: { count: number }) => {
      invalidateQueries();
      onOpenChange(false);
      onSuccess();
      successToast(`Smazáno ${data.count} hostů`);
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const executeBulkAction = () => {
    const guestIds = Array.from(selectedIds);

    if (actionType === "delete") {
      bulkDeleteMutation.mutate(guestIds);
      return;
    }

    const updates: Record<string, string | boolean> = {};
    switch (actionType) {
      case "nationality":
        updates.nationality = value;
        break;
      case "type":
        updates.type = value;
        break;
      case "isPaid":
        updates.isPaid = value === "true";
        break;
      case "isPresent":
        updates.isPresent = value === "true";
        break;
    }

    bulkUpdateMutation.mutate({ guestIds, updates });
  };

  // Reset value when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setValue("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actionType === "delete"
              ? `Smazat ${selectedIds.size} hostů?`
              : `Hromadná změna (${selectedIds.size} hostů)`}
          </DialogTitle>
          <DialogDescription>
            {actionType === "delete"
              ? "Tato akce je nevratná."
              : "Vyberte novou hodnotu pro všechny označené hosty."}
          </DialogDescription>
        </DialogHeader>

        {actionType !== "delete" && (
          <div className="py-4">
            {actionType === "nationality" && (
              <div>
                <Label>Národnost</Label>
                <NationalityInput
                  value={value}
                  onChange={setValue}
                  placeholder="např. CZ"
                  className="mt-1"
                />
              </div>
            )}
            {actionType === "type" && (
              <div>
                <Label>Typ hosta</Label>
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Vyberte typ" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GUEST_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {actionType === "isPaid" && (
              <div>
                <Label>Platící</Label>
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Vyberte hodnotu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ano - platící</SelectItem>
                    <SelectItem value="false">Ne - neplatící</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {actionType === "isPresent" && (
              <div>
                <Label>Přítomnost</Label>
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Vyberte hodnotu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ano - přítomen</SelectItem>
                    <SelectItem value="false">Ne - nepřítomen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button
            variant={actionType === "delete" ? "destructive" : "default"}
            onClick={executeBulkAction}
            disabled={
              bulkUpdateMutation.isPending ||
              bulkDeleteMutation.isPending ||
              (actionType !== "delete" && !value)
            }
          >
            {(bulkUpdateMutation.isPending || bulkDeleteMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {actionType === "delete" ? "Smazat" : "Aplikovat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
