import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircleQuestion,
  X,
  Loader2,
  Trash2,
  Check,
  XCircle,
  History,
  Plus,
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/shared/lib/utils";
import {
  type ChatMessage,
  type ConversationSummary,
  type PendingAction,
  sendChat,
  confirmAction,
  rejectAction,
  listConversations,
  loadConversation,
  saveConversation,
  deleteConversation,
} from "./chatbot/chatbotService";
import {
  invalidateEventQueries,
  invalidateReservationQueries,
  invalidateContactQueries,
  invalidateStaffQueries,
  invalidateCashboxQueries,
} from "@/shared/lib/query-helpers";
import { ChatMessageContent } from "./chatbot/ChatMessageContent";
import { ChatInput } from "./chatbot/ChatInput";
import { ChatSuggestions } from "./chatbot/ChatSuggestions";

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    'Ahoj! Jsem AI asistent pro Folklore Garden Admin.\n\nUmím:\n- Najít rezervace, akce, kontakty, personál\n- Poradit, kde v systému něco najdeš\n- Založit rychlou rezervaci, přidat kontakt nebo zaměstnance (vždy po tvém potvrzení)\n\nZkus: "Najdi rezervace Novák na červen", "Přidej kontakt Jan Svoboda 777 123 456", "Kde nastavím pokladnu?"',
};

export function HelpChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingBusy, setPendingBusy] = useState<string | null>(null);
  const [location] = useLocation();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<ConversationSummary[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Restore last conversation on mount (runs once).
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    (async () => {
      try {
        const items = await listConversations();
        if (items.length > 0) {
          const latest = await loadConversation(items[0].id);
          if (latest.messages.length > 0) {
            setMessages(latest.messages);
            setConversationId(latest.id);
          }
        }
      } catch {
        // silent — start fresh
      }
    })();
  }, []);

  const runChat = useCallback(async (history: ChatMessage[]) => {
    setIsLoading(true);
    try {
      const resp = await sendChat(history, { currentRoute: location });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: resp.reply,
          links: resp.links,
          pendingActions: resp.pendingActions,
        },
      ]);
    } catch (err) {
      const detail =
        err instanceof Error ? err.message : "Neznámá chyba";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Omlouvám se, nepodařilo se spojit s AI serverem. (${detail})`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [location]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    const updated = [...messages, { role: "user", content: text } as ChatMessage];
    setMessages(updated);
    setInput("");
    await runChat(updated);
  }, [input, isLoading, messages, runChat]);

  const handleSuggestion = useCallback(
    (text: string) => {
      const updated = [...messages, { role: "user", content: text } as ChatMessage];
      setMessages(updated);
      setInput("");
      runChat(updated);
    },
    [messages, runChat]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const startNewChat = useCallback(() => {
    setMessages([WELCOME]);
    setConversationId(null);
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      setHistoryItems(await listConversations());
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (historyOpen) void refreshHistory();
  }, [historyOpen, refreshHistory]);

  // Auto-save on each new assistant reply (debounced via effect depending on messages length).
  useEffect(() => {
    const userMsgs = messages.filter((m) => m.role === "user").length;
    if (userMsgs === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    const handle = setTimeout(async () => {
      try {
        const saved = await saveConversation(messages, conversationId ?? undefined);
        if (!conversationId) setConversationId(saved.id);
      } catch {
        // silent
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [messages, conversationId]);

  const openConversation = useCallback(async (id: number) => {
    try {
      const c = await loadConversation(id);
      setMessages(c.messages.length ? c.messages : [WELCOME]);
      setConversationId(c.id);
      setHistoryOpen(false);
    } catch {
      // silent
    }
  }, []);

  const removeConversation = useCallback(async (id: number) => {
    if (!confirm("Smazat tuto konverzaci?")) return;
    await deleteConversation(id);
    if (conversationId === id) startNewChat();
    await refreshHistory();
  }, [conversationId, refreshHistory, startNewChat]);

  const resolvePending = useCallback(
    async (msgIndex: number, actionIndex: number, confirm: boolean) => {
      setMessages((prev) => {
        const copy = [...prev];
        const msg = copy[msgIndex];
        const actions = msg.pendingActions ? [...msg.pendingActions] : [];
        const action = actions[actionIndex];
        if (!action) return prev;
        setPendingBusy(action.actionId);
        return copy;
      });

      const msg = messages[msgIndex];
      const action = msg?.pendingActions?.[actionIndex];
      if (!action) return;

      let updated: PendingAction;
      try {
        if (confirm) {
          const res = await confirmAction(action.actionId);
          updated = {
            ...action,
            resolved: res.status,
            resolvedMessage:
              res.status === "executed"
                ? (res.result?.message as string) ?? "Provedeno."
                : res.error ?? "Chyba",
          };
        } else {
          await rejectAction(action.actionId);
          updated = { ...action, resolved: "rejected", resolvedMessage: "Zrušeno." };
        }
      } catch (err) {
        updated = {
          ...action,
          resolved: "failed",
          resolvedMessage: err instanceof Error ? err.message : "Chyba",
        };
      }

      setMessages((prev) => {
        const copy = [...prev];
        const m = { ...copy[msgIndex] };
        const actions = m.pendingActions ? [...m.pendingActions] : [];
        actions[actionIndex] = updated;
        m.pendingActions = actions;
        copy[msgIndex] = m;
        return copy;
      });
      setPendingBusy(null);

      // If executed successfully, invalidate affected queries so UI refreshes,
      // then follow up with AI so it can react (e.g. "Hotovo, tady je odkaz").
      if (confirm && updated.resolved === "executed") {
        invalidateQueriesForTool(action.tool, action.params);

        const followUp: ChatMessage = {
          role: "user",
          content: `[Systém] Akce potvrzena a provedena: ${updated.resolvedMessage}`,
        };
        const history = [...messages.slice(0, msgIndex + 1), followUp];
        setMessages((prev) => [...prev, followUp]);
        await runChat(history);
      }
    },
    [messages, runChat]
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center",
          "w-14 h-14 rounded-full shadow-lg transition-all duration-200",
          "hover:scale-105 active:scale-95",
          isOpen
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground"
        )}
        title="AI asistent"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircleQuestion className="w-6 h-6" />
        )}
      </button>

      {isOpen && (
        <div
          className={cn(
            "fixed bottom-24 right-6 z-50",
            "w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-8rem)]",
            "bg-card border border-border rounded-xl shadow-2xl",
            "flex flex-col overflow-hidden",
            "animate-in slide-in-from-bottom-4 fade-in duration-200"
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <div className="flex items-center gap-2">
              <MessageCircleQuestion className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">AI Asistent</h3>
                <p className="text-xs text-muted-foreground">
                  Hledání, navigace, rychlé akce
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className={cn(
                  "p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors",
                  historyOpen ? "bg-muted" : "hover:bg-muted"
                )}
                title="Historie konverzací"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={startNewChat}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Nová konverzace"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {historyOpen && (
            <div className="border-b border-border max-h-48 overflow-y-auto bg-background">
              {historyItems.length === 0 && (
                <div className="p-3 text-xs text-muted-foreground">Žádné uložené konverzace.</div>
              )}
              {historyItems.map((h) => (
                <div
                  key={h.id}
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 text-xs hover:bg-muted",
                    conversationId === h.id && "bg-muted"
                  )}
                >
                  <button
                    onClick={() => openConversation(h.id)}
                    className="flex-1 text-left truncate"
                  >
                    <div className="truncate">{h.title}</div>
                    <div className="text-muted-foreground">
                      {new Date(h.updatedAt).toLocaleString("cs-CZ")} · {h.messageCount} zpráv
                    </div>
                  </button>
                  <button
                    onClick={() => removeConversation(h.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    title="Smazat"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <>
                      <ChatMessageContent content={msg.content} />
                      {msg.pendingActions?.map((a, ai) => (
                        <PendingActionCard
                          key={a.actionId}
                          action={a}
                          busy={pendingBusy === a.actionId}
                          onConfirm={() => resolvePending(i, ai, true)}
                          onReject={() => resolvePending(i, ai, false)}
                        />
                      ))}
                    </>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted px-3 py-2 rounded-lg rounded-bl-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Přemýšlím...</span>
                </div>
              </div>
            )}

            {messages.length === 1 && !isLoading && (
              <ChatSuggestions onSelect={handleSuggestion} />
            )}

            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            isOpen={isOpen}
            onSend={sendMessage}
            onKeyDown={handleKeyDown}
          />
        </div>
      )}
    </>
  );
}

/** After a tool action is confirmed, invalidate the right TanStack Query caches
 *  so the open page (event dashboard, reservation edit, etc.) refreshes automatically. */
function invalidateQueriesForTool(
  toolName: string,
  params: Record<string, unknown>
) {
  const eventId = params.eventId ? Number(params.eventId) : undefined;
  const reservationId = params.reservationId
    ? Number(params.reservationId)
    : undefined;

  switch (toolName) {
    case "auto_seat_guests":
    case "analyse_event_setup":
      if (eventId) invalidateEventQueries(eventId);
      break;
    case "create_quick_reservation":
    case "cancel_reservation":
    case "mark_reservation_paid":
    case "send_reservation_email":
      invalidateReservationQueries(reservationId);
      if (reservationId) invalidateCashboxQueries();
      break;
    case "create_contact":
      invalidateContactQueries();
      break;
    case "create_staff_member":
      invalidateStaffQueries();
      break;
    default:
      // Unknown tool — broad invalidation
      if (eventId) invalidateEventQueries(eventId);
      if (reservationId) invalidateReservationQueries(reservationId);
      break;
  }
}

function PendingActionCard({
  action,
  busy,
  onConfirm,
  onReject,
}: {
  action: PendingAction;
  busy: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  if (action.resolved) {
    return (
      <div
        className={cn(
          "mt-2 p-2 rounded border text-xs",
          action.resolved === "executed"
            ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
            : action.resolved === "rejected"
              ? "border-muted-foreground/30 text-muted-foreground"
              : "border-destructive/40 bg-destructive/10 text-destructive"
        )}
      >
        {action.resolved === "executed" && "✓ "}
        {action.resolved === "rejected" && "✕ Akce zrušena. "}
        {action.resolved === "failed" && "✗ "}
        {action.resolvedMessage}
      </div>
    );
  }

  return (
    <div className="mt-2 p-2 rounded border border-primary/30 bg-background text-xs">
      <div className="font-medium mb-2">{action.preview}</div>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={busy}
          className="flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 text-xs"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Potvrdit
        </button>
        <button
          onClick={onReject}
          disabled={busy}
          className="flex items-center gap-1 px-2 py-1 rounded border text-xs hover:bg-muted disabled:opacity-50"
        >
          <XCircle className="w-3 h-3" />
          Zrušit
        </button>
      </div>
    </div>
  );
}
