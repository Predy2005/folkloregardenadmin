import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { api } from "@/shared/lib/api";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_TYPE_LABELS,
  type Ticket,
  type TicketPriority,
  type TicketType,
} from "@shared/types";
import { TICKETS_QUERY_KEY } from "../hooks/useTickets";
import { extractImagesFromClipboard, uploadTicketAttachment } from "../utils/uploadAttachment";
import { Loader2, Paperclip, X, ClipboardPaste } from "lucide-react";

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Volitelný callback po vytvoření — dostává nový ticket. */
  onCreated?: (ticket: Ticket) => void;
}

const PRIORITIES: TicketPriority[] = ["LOW", "NORMAL", "HIGH", "CRITICAL"];
const TYPES: TicketType[] = ["BUG", "FEATURE", "QUESTION", "IMPROVEMENT"];

export function CreateTicketDialog({ open, onOpenChange, onCreated }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TicketType>("BUG");
  const [priority, setPriority] = useState<TicketPriority>("NORMAL");
  const [moduleTag, setModuleTag] = useState("");
  const [pending, setPending] = useState<PendingFile[]>([]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setType("BUG");
    setPriority("NORMAL");
    setModuleTag("");
    pending.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
    setPending([]);
  };

  const submit = useMutation({
    mutationFn: async (): Promise<{ ticket: Ticket; uploadFailures: string[] }> => {
      if (title.trim() === "") {
        throw new Error("Zadej nadpis");
      }
      const ticket = await api.post<Ticket>("/api/tickets", {
        title: title.trim(),
        description: description.trim() || null,
        type,
        priority,
        module: moduleTag.trim() || null,
      });
      // Po vytvoření nahraj attachmenty (sekvenčně, ať se neztrácí pořadí).
      // Když některý upload selže, ticket samotný už existuje — necháme ho a
      // sebereme failures, ať uživatele upozorníme. Dialog zůstane otevřený, ať
      // se dají problematické přílohy zkusit znovu nebo úplně vyhodit.
      const uploadFailures: string[] = [];
      for (const p of pending) {
        try {
          await uploadTicketAttachment(ticket.id, p.file);
        } catch (e) {
          const apiErr = e as { response?: { data?: { error?: string; hint?: string } } };
          const reason = apiErr?.response?.data?.hint
            ?? apiErr?.response?.data?.error
            ?? (e instanceof Error ? e.message : String(e));
          uploadFailures.push(`${p.file.name}: ${reason}`);
          console.error("Upload attachment failed:", e);
        }
      }
      return { ticket, uploadFailures };
    },
    onSuccess: ({ ticket, uploadFailures }) => {
      qc.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      if (uploadFailures.length > 0) {
        // Ticket existuje, ale některé přílohy selhaly. Nech dialog otevřený a
        // ukaž failures — necháme jen ty failed v `pending`, úspěšné odstraníme.
        const failedFilenames = new Set(uploadFailures.map((f) => f.split(":")[0].trim()));
        setPending((prev) => {
          // Uvolni preview URL u úspěšně nahraných (těch co tam zůstávat nebudou).
          prev.filter((p) => !failedFilenames.has(p.file.name))
              .forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
          return prev.filter((p) => failedFilenames.has(p.file.name));
        });
        errorToast(
          `Ticket #${ticket.id} vytvořen, ale ${uploadFailures.length} ${uploadFailures.length === 1 ? "příloha selhala" : "příloh selhalo"}:\n${uploadFailures.join("\n")}`,
        );
        return;
      }
      successToast(`Ticket #${ticket.id} vytvořen`);
      reset();
      onOpenChange(false);
      onCreated?.(ticket);
    },
    onError: (e: Error) => errorToast(e),
  });

  const addFiles = (files: File[]) => {
    const next = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setPending((prev) => [...prev, ...next]);
  };

  const removePending = (id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const images = extractImagesFromClipboard(e.nativeEvent);
    if (images.length > 0) {
      e.preventDefault();
      addFiles(images);
      successToast(`Vloženo ${images.length} screenshot${images.length > 1 ? "y" : ""} z clipboardu`);
    }
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) addFiles(files);
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onPaste={onPaste}>
        <DialogHeader>
          <DialogTitle>Nahlásit chybu / nový požadavek</DialogTitle>
          <DialogDescription>
            Popiš problém, do popisu nebo přímo do dialogu můžeš vložit screenshot pomocí <kbd className="px-1.5 py-0.5 text-xs border rounded">Ctrl</kbd>+<kbd className="px-1.5 py-0.5 text-xs border rounded">V</kbd>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="ticket-title">Nadpis *</Label>
            <Input
              id="ticket-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Stručně co je problém"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Typ</Label>
              <Select value={type} onValueChange={(v) => setType(v as TicketType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{TICKET_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorita</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{TICKET_PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ticket-module">Modul</Label>
              <Input
                id="ticket-module"
                value={moduleTag}
                onChange={(e) => setModuleTag(e.target.value)}
                placeholder="např. events, partners"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ticket-desc">Popis</Label>
            <Textarea
              id="ticket-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPaste={onPaste}
              rows={6}
              placeholder="Co se stalo, jak to reprodukovat, kde to vidíš... Screenshot vlož přes Ctrl+V."
            />
          </div>

          {pending.length > 0 && (
            <div className="space-y-2">
              <Label>Přílohy ({pending.length})</Label>
              <div className="grid grid-cols-3 gap-2">
                {pending.map((p) => (
                  <div key={p.id} className="relative border rounded-md overflow-hidden bg-muted/30">
                    {p.previewUrl ? (
                      <img src={p.previewUrl} alt={p.file.name} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="h-32 flex flex-col items-center justify-center p-2 text-xs text-muted-foreground">
                        <Paperclip className="w-6 h-6 mb-1" />
                        <span className="truncate w-full text-center" title={p.file.name}>{p.file.name}</span>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removePending(p.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              <ClipboardPaste className="w-3 h-3" />
              Ctrl+V vloží screenshot
            </Badge>
            <label className="cursor-pointer">
              <input type="file" multiple accept="image/*,.pdf,.txt,.log" className="hidden" onChange={onFileInput} />
              <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                <Paperclip className="w-3 h-3" />
                Přidat soubor
              </Badge>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submit.isPending}>
            Zrušit
          </Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending || title.trim() === ""}>
            {submit.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Vytvořit ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
