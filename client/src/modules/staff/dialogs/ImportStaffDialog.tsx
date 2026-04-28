import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { api } from "@/shared/lib/api";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { STAFF_ROLE_LABELS, translateStaffRole } from "@modules/staff/utils/staffRoles";
import { Loader2, Upload, FileSpreadsheet } from "lucide-react";

interface ImportDraft {
  firstName: string;
  lastName: string;
  phone: string | null;
  phoneRaw: string | null;
  position: string | null;
  sourceSection: string | null;
  existingId: number | null;
  status: "NEW" | "EXISTS";
}

interface PreviewResponse {
  drafts: ImportDraft[];
  stats: { total: number; new: number; exists: number };
}

interface CommitResponse {
  created: number;
  skipped: number;
  errors: Record<number, string>;
}

interface ImportStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POSITION_OPTIONS = Object.entries(STAFF_ROLE_LABELS)
  .filter(([key]) => key === key.toUpperCase())
  .map(([value, label]) => ({ value, label }));

export function ImportStaffDialog({ open, onOpenChange }: ImportStaffDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [stats, setStats] = useState<PreviewResponse["stats"] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const reset = () => {
    setFile(null);
    setDrafts([]);
    setStats(null);
    setSelected(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const previewMutation = useMutation<PreviewResponse, Error, File>({
    mutationFn: async (f) => {
      const form = new FormData();
      form.append("file", f);
      return api.post<PreviewResponse>("/api/staff/import/preview", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: (data) => {
      setDrafts(data.drafts);
      setStats(data.stats);
      // Předvybrat všechny "NEW"
      const initial = new Set<number>();
      data.drafts.forEach((d, i) => {
        if (d.status === "NEW") initial.add(i);
      });
      setSelected(initial);
    },
    onError: (e) => errorToast(e),
  });

  const commitMutation = useMutation<CommitResponse, Error, ImportDraft[]>({
    mutationFn: (selectedDrafts) =>
      api.post<CommitResponse>("/api/staff/import/commit", { drafts: selectedDrafts }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      const errCount = Object.keys(data.errors).length;
      if (data.created > 0) {
        successToast(
          `Importováno ${data.created} členů` +
          (data.skipped > 0 ? `, přeskočeno ${data.skipped} duplicit` : "") +
          (errCount > 0 ? `, ${errCount} chyb` : ""),
        );
      } else if (data.skipped > 0) {
        successToast(`Žádný nový člen — přeskočeno ${data.skipped} duplicit`);
      }
      reset();
      onOpenChange(false);
    },
    onError: (e) => errorToast(e),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      previewMutation.mutate(f);
    }
  };

  const toggleRow = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === drafts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(drafts.map((_, i) => i)));
    }
  };

  const updateDraftPosition = (idx: number, position: string) => {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, position } : d)));
  };

  const handleCommit = () => {
    const selectedDrafts = drafts.filter((_, i) => selected.has(i));
    if (selectedDrafts.length === 0) {
      errorToast("Vyberte alespoň jednoho člena.");
      return;
    }
    commitMutation.mutate(selectedDrafts);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import personálu z Excelu</DialogTitle>
          <DialogDescription>
            Nahrajte xlsx ve formátu PersonálFG (sekce ČÍŠNÍK, KUCHAŘ, POMOCNÉ SÍLY, KAPELA…). Před uložením můžete zkontrolovat a upravit pozice.
          </DialogDescription>
        </DialogHeader>

        {/* File picker */}
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
            disabled={previewMutation.isPending}
          />
          {previewMutation.isPending && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary">
              <FileSpreadsheet className="w-3 h-3 mr-1" />
              {file?.name}
            </Badge>
            <Badge variant="default">Nové: {stats.new}</Badge>
            <Badge variant="outline">Existující: {stats.exists}</Badge>
            <Badge variant="secondary">Vybráno: {selected.size}</Badge>
          </div>
        )}

        {/* Preview table */}
        {drafts.length > 0 && (
          <div className="rounded-md border max-h-[55vh] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={drafts.length > 0 && selected.size === drafts.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Příjmení</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Pozice</TableHead>
                  <TableHead>Stav</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.map((d, i) => {
                  const isExists = d.status === "EXISTS";
                  return (
                    <TableRow
                      key={i}
                      className={isExists ? "opacity-60" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected.has(i)}
                          onCheckedChange={() => toggleRow(i)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{d.firstName}</TableCell>
                      <TableCell>{d.lastName}</TableCell>
                      <TableCell className="font-mono text-xs">{d.phone ?? "-"}</TableCell>
                      <TableCell>
                        <Select
                          value={d.position ?? ""}
                          onValueChange={(v) => updateDraftPosition(i, v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Vyberte pozici">
                              {d.position ? translateStaffRole(d.position) : "Vyberte pozici"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {POSITION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {isExists ? (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                            Už existuje
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">
                            Nový
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Zrušit
          </Button>
          <Button
            onClick={handleCommit}
            disabled={commitMutation.isPending || selected.size === 0}
          >
            {commitMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Importovat ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
