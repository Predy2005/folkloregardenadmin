import { api } from "@/shared/lib/api";
import type { TicketAttachment } from "@shared/types";

/**
 * Nahraje jeden soubor (z file inputu nebo z clipboard paste) jako attachment ticketu.
 * Volitelně může být přiřazen k existujícímu komentáři přes `commentId`.
 */
export async function uploadTicketAttachment(
  ticketId: number,
  file: File | Blob,
  options?: { commentId?: number; filename?: string },
): Promise<TicketAttachment> {
  const form = new FormData();
  const filename = options?.filename
    ?? (file instanceof File ? file.name : `screenshot-${new Date().toISOString().replace(/[:.]/g, "-")}.png`);
  form.append("file", file, filename);
  if (options?.commentId) form.append("commentId", String(options.commentId));
  return api.post<TicketAttachment>(`/api/tickets/${ticketId}/attachments`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/**
 * Vytáhne všechny obrázky z `ClipboardEvent` (Ctrl+V). Vrátí prázdné pole, pokud
 * v clipboardu obrázek nebyl (např. uživatel kopíroval jen text).
 */
export function extractImagesFromClipboard(event: ClipboardEvent): File[] {
  const files: File[] = [];
  const items = event.clipboardData?.items;
  if (!items) return files;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const blob = item.getAsFile();
      if (blob) {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const ext = item.type.split("/")[1] || "png";
        files.push(new File([blob], `screenshot-${stamp}.${ext}`, { type: item.type }));
      }
    }
  }
  return files;
}
