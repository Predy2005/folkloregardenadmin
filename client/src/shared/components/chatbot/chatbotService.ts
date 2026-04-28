import { api } from "@/shared/lib/api";

// ─── Types ────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  links?: ChatLink[];
  pendingActions?: PendingAction[];
}

export interface ChatLink {
  label: string;
  url: string;
  meta?: string;
}

export interface PendingAction {
  actionId: string;
  tool: string;
  preview: string;
  params: Record<string, unknown>;
  /** Set by UI after user clicks Confirm/Reject. */
  resolved?: "executed" | "rejected" | "failed";
  resolvedMessage?: string;
}

interface ChatResponse {
  reply: string;
  links: ChatLink[];
  pendingActions: PendingAction[];
  meta: { server?: string; model?: string; iterations?: number };
}

// ─── API calls ────────────────────────────────────────────────────────

/** Sends the full history + current UI context to the backend orchestrator. */
export async function sendChat(
  history: ChatMessage[],
  context?: { currentRoute?: string }
): Promise<ChatResponse> {
  const payload = {
    messages: history.map((m) => ({ role: m.role, content: m.content })),
    context: context ?? {},
  };
  return api.post<ChatResponse>("/api/assistant/chat", payload);
}

export interface ConfirmResult {
  status: "executed" | "failed";
  result?: Record<string, unknown>;
  error?: string;
}

export async function confirmAction(actionId: string): Promise<ConfirmResult> {
  try {
    const result = await api.post<Record<string, unknown>>(
      `/api/assistant/confirm/${encodeURIComponent(actionId)}`,
      {}
    );
    return { status: "executed", result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chyba při potvrzení";
    return { status: "failed", error: msg };
  }
}

export async function rejectAction(actionId: string): Promise<void> {
  await api.post(`/api/assistant/reject/${encodeURIComponent(actionId)}`, {});
}

// ─── Conversation persistence ────────────────────────────────────────

export interface ConversationSummary {
  id: number;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[];
}

export async function listConversations(): Promise<ConversationSummary[]> {
  return api.get<ConversationSummary[]>("/api/assistant/conversations");
}

export async function loadConversation(id: number): Promise<ConversationDetail> {
  return api.get<ConversationDetail>(`/api/assistant/conversations/${id}`);
}

export async function saveConversation(
  messages: ChatMessage[],
  id?: number,
  title?: string,
): Promise<{ id: number; title: string }> {
  return api.post<{ id: number; title: string }>(`/api/assistant/conversations`, {
    id,
    title,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
}

export async function deleteConversation(id: number): Promise<void> {
  await api.delete(`/api/assistant/conversations/${id}`);
}
