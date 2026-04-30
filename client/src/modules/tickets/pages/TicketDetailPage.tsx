import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { PageHeader } from "@/shared/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useTicket, TICKETS_QUERY_KEY } from "../hooks/useTickets";
import { extractImagesFromClipboard, uploadTicketAttachment } from "../utils/uploadAttachment";
import { StatusBadge, PriorityBadge, TypeBadge } from "../components/TicketBadges";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type Ticket,
  type TicketAttachment,
  type TicketComment,
  type TicketPriority,
  type TicketStatus,
} from "@shared/types";
import { ArrowLeft, Loader2, Send, Trash2, Paperclip, X, AlertTriangle, Hash, CheckCircle2 } from "lucide-react";
import dayjs from "dayjs";

const STATUS_OPTIONS = Object.entries(TICKET_STATUS_LABELS) as [TicketStatus, string][];
const PRIORITY_OPTIONS = Object.entries(TICKET_PRIORITY_LABELS) as [TicketPriority, string][];

export default function TicketDetailPage() {
  const [, params] = useRoute<{ id: string }>("/tickets/:id");
  const id = params ? Number(params.id) : null;
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: ticket, isLoading } = useTicket(id);
  const [reply, setReply] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);

  useEffect(() => () => {
    pendingAttachments.forEach((f) => {
      if (f.type.startsWith("image/")) {
        // Nothing to revoke since we don't preview here, but kept for symmetry.
      }
    });
  }, [pendingAttachments]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
  };

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Pick<Ticket, "status" | "priority">>) =>
      api.put<Ticket>(`/api/tickets/${id}`, updates),
    onSuccess: () => {
      invalidate();
      successToast("Ticket aktualizován");
    },
    onError: (e: Error) => errorToast(e),
  });

  const commentMutation = useMutation({
    mutationFn: async (): Promise<{ uploadFailures: string[] }> => {
      if (!ticket) throw new Error("Ticket nenačten");
      if (reply.trim() === "" && pendingAttachments.length === 0) {
        throw new Error("Napiš odpověď nebo přidej přílohu");
      }
      let createdComment: TicketComment | null = null;
      if (reply.trim() !== "") {
        createdComment = await api.post<TicketComment>(`/api/tickets/${ticket.id}/comments`, {
          content: reply.trim(),
        });
      }
      // Sebereme failures (nezahodíme komentář kvůli upload chybě, jen
      // upozorníme uživatele a necháme failed přílohy v pending).
      const uploadFailures: string[] = [];
      for (const file of pendingAttachments) {
        try {
          await uploadTicketAttachment(ticket.id, file, createdComment ? { commentId: createdComment.id } : undefined);
        } catch (e) {
          const apiErr = e as { response?: { data?: { error?: string; hint?: string } } };
          const reason = apiErr?.response?.data?.hint
            ?? apiErr?.response?.data?.error
            ?? (e instanceof Error ? e.message : String(e));
          uploadFailures.push(`${file.name}: ${reason}`);
        }
      }
      return { uploadFailures };
    },
    onSuccess: ({ uploadFailures }) => {
      setReply("");
      const failedNames = new Set(uploadFailures.map((f) => f.split(":")[0].trim()));
      setPendingAttachments((prev) => prev.filter((f) => failedNames.has(f.name)));
      invalidate();
      if (uploadFailures.length > 0) {
        errorToast(
          `Komentář uložen, ale ${uploadFailures.length} ${uploadFailures.length === 1 ? "příloha selhala" : "příloh selhalo"}:\n${uploadFailures.join("\n")}`,
        );
      } else {
        successToast("Komentář přidán");
      }
    },
    onError: (e: Error) => errorToast(e),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => api.delete(`/api/tickets/${id}/comments/${commentId}`),
    onSuccess: () => {
      invalidate();
      successToast("Komentář smazán");
    },
    onError: (e: Error) => errorToast(e),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) => api.delete(`/api/tickets/${id}/attachments/${attachmentId}`),
    onSuccess: () => {
      invalidate();
      successToast("Příloha smazána");
    },
    onError: (e: Error) => errorToast(e),
  });

  const closeTicketMutation = useMutation({
    mutationFn: () => api.put<Ticket>(`/api/tickets/${id}`, { status: "CLOSED" }),
    onSuccess: () => {
      invalidate();
      successToast("Ticket dokončen a uzavřen");
      navigate("/tickets");
    },
    onError: (e: Error) => errorToast(e),
  });

  const onPaste = (e: React.ClipboardEvent) => {
    const images = extractImagesFromClipboard(e.nativeEvent);
    if (images.length > 0) {
      e.preventDefault();
      setPendingAttachments((prev) => [...prev, ...images]);
      successToast(`Vloženo ${images.length} screenshot${images.length > 1 ? "y" : ""}`);
    }
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) setPendingAttachments((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  if (isLoading) {
    return <div className="p-6 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!ticket) {
    return <div className="p-6 text-center text-muted-foreground">Ticket nenalezen</div>;
  }

  const isClosed = ticket.status === "RESOLVED" || ticket.status === "CLOSED" || ticket.status === "WONTFIX";

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-2 flex-wrap">
            <Hash className="w-5 h-5 text-muted-foreground" />
            <span className="font-mono text-muted-foreground text-base">#{ticket.id}</span>
            <span>{ticket.title}</span>
          </div>
        }
        description={`Vytvořeno ${dayjs(ticket.createdAt).format("DD.MM.YYYY HH:mm")} · ${ticket.createdBy?.username ?? ticket.createdBy?.email ?? "—"}`}
      >
        <Button variant="outline" onClick={() => navigate("/tickets")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zpět
        </Button>
        {!isClosed && (
          <Button
            onClick={() => closeTicketMutation.mutate()}
            disabled={closeTicketMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {closeTicketMutation.isPending
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Dokončit a uzavřít
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hlavní obsah — popis + komentáře */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Popis
                {ticket.source === "AUTO_ERROR_LOG" && (
                  <Badge variant="outline" className="gap-1 border-red-300 bg-red-50 text-red-700">
                    <AlertTriangle className="w-3 h-3" />
                    Auto-detekováno {ticket.occurrenceCount}× ze systému
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.description ? (
                <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Bez popisu.</p>
              )}
              {ticket.source === "AUTO_ERROR_LOG" && (
                <details className="mt-4 text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Stack trace + request</summary>
                  <pre className="mt-2 p-2 bg-muted/50 rounded overflow-x-auto text-[10px] leading-tight">
{`Class: ${ticket.errorClass ?? "?"}
URL: ${ticket.requestUrl ?? "?"}
HTTP: ${ticket.httpStatus ?? "?"}

${ticket.stackTrace ?? ""}`}
                  </pre>
                </details>
              )}

              {ticket.attachments.filter((a) => !a.commentId).length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ticket.attachments.filter((a) => !a.commentId).map((a) => (
                    <AttachmentPreview key={a.id} a={a} onDelete={() => deleteAttachmentMutation.mutate(a.id)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Komentáře ({ticket.comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Zatím žádné komentáře.</p>
              ) : (
                ticket.comments.map((c) => {
                  const commentAttachments = ticket.attachments.filter((a) => a.commentId === c.id);
                  return (
                    <div key={c.id} className={`border rounded-md p-3 ${c.isInternal ? "bg-amber-50/50 border-amber-200" : ""}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium">
                          {c.author?.username ?? c.author?.email ?? "Neznámý"}
                          {c.isInternal && <Badge variant="outline" className="ml-2 text-xs border-amber-300 bg-amber-100">Interní</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{dayjs(c.createdAt).format("DD.MM.YYYY HH:mm")}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => deleteCommentMutation.mutate(c.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                      {commentAttachments.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {commentAttachments.map((a) => (
                            <AttachmentPreview key={a.id} a={a} onDelete={() => deleteAttachmentMutation.mutate(a.id)} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Formulář pro novou odpověď */}
              <div className="space-y-2 border-t pt-4">
                <Label>Odpověď</Label>
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onPaste={onPaste}
                  rows={4}
                  placeholder="Napiš odpověď nebo doplň info... Screenshot vlož přes Ctrl+V."
                />
                {pendingAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((f, i) => (
                      <Badge key={i} variant="outline" className="gap-1 pl-2 pr-1 py-1">
                        <Paperclip className="w-3 h-3" />
                        <span className="max-w-[180px] truncate">{f.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1"
                          onClick={() => setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <label className="cursor-pointer">
                    <input type="file" multiple className="hidden" onChange={onFileInput} accept="image/*,.pdf,.txt,.log" />
                    <Badge variant="outline" className="cursor-pointer hover:bg-muted gap-1">
                      <Paperclip className="w-3 h-3" />
                      Přidat soubor
                    </Badge>
                  </label>
                  <Button
                    onClick={() => commentMutation.mutate()}
                    disabled={commentMutation.isPending || (reply.trim() === "" && pendingAttachments.length === 0)}
                  >
                    {commentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Send className="w-4 h-4 mr-2" />
                    Odeslat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — meta + akce */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stav</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={ticket.status} onValueChange={(v) => updateMutation.mutate({ status: v as TicketStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priorita</Label>
                <Select value={ticket.priority} onValueChange={(v) => updateMutation.mutate({ priority: v as TicketPriority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Typ:</span><TypeBadge type={ticket.type} /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Aktuální:</span><StatusBadge status={ticket.status} /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Priorita:</span><PriorityBadge priority={ticket.priority} /></div>
                {ticket.module && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Modul:</span><Badge variant="outline">{ticket.module}</Badge></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Poslední úprava:</span><span>{dayjs(ticket.updatedAt).format("DD.MM. HH:mm")}</span></div>
                {ticket.resolvedAt && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Vyřešeno:</span><span>{dayjs(ticket.resolvedAt).format("DD.MM. HH:mm")}</span></div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}

function AttachmentPreview({ a, onDelete }: { a: TicketAttachment; onDelete: () => void }) {
  return (
    <div className="relative border rounded-md overflow-hidden bg-muted/20 group">
      {a.isImage ? (
        <a href={a.url} target="_blank" rel="noreferrer">
          <img src={a.url} alt={a.filename} className="w-full h-32 object-cover" />
        </a>
      ) : (
        <a href={a.url} target="_blank" rel="noreferrer" className="block h-32 flex flex-col items-center justify-center p-2 text-xs text-muted-foreground hover:bg-muted/40">
          <Paperclip className="w-6 h-6 mb-1" />
          <span className="truncate w-full text-center" title={a.filename}>{a.filename}</span>
        </a>
      )}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
        onClick={onDelete}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}
