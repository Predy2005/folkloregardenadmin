import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { api } from "@/shared/lib/api";
import { invalidateCashboxQueries } from "@/shared/lib/query-helpers";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";

interface NotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialNotes: string;
}

export function NotesDialog({ open, onOpenChange, initialNotes }: NotesDialogProps) {
  const [cashboxNotes, setCashboxNotes] = useState("");

  useEffect(() => {
    if (open) {
      setCashboxNotes(initialNotes);
    }
  }, [open, initialNotes]);

  const updateNotesMutation = useMutation({
    mutationFn: (data: { notes: string }) =>
      api.put('/api/cashbox/main/info', data),
    onSuccess: () => {
      invalidateCashboxQueries();
      onOpenChange(false);
      successToast("Poznámky uloženy");
    },
    onError: (e: Error) => errorToast(e),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Poznámky k pokladně</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={cashboxNotes}
            onChange={(e) => setCashboxNotes(e.target.value)}
            placeholder="Poznámky pro účetní, interní informace k pokladně..."
            className="min-h-[150px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button
            onClick={() => updateNotesMutation.mutate({ notes: cashboxNotes })}
            disabled={updateNotesMutation.isPending}
          >
            {updateNotesMutation.isPending ? "Ukládám..." : "Uložit poznámky"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
