import AsyncStorage from "@react-native-async-storage/async-storage";
import { onlineManager, type QueryClient } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/apiClient";

/**
 * Offline write queue pro mutace.
 *
 * Motivace: řidič v údolí / ve sklepě / v dojezdu bez signálu stiskne DONE
 * nebo staff udělá check-in. Mutace nesmí zmizet jen protože není signál.
 *
 * Model:
 *   - Fronta je v AsyncStorage pod `QUEUE_KEY`.
 *   - Každá položka je samostatný `apiFetch` request (path + method + body).
 *   - Flush se spouští: (a) při online event z `onlineManager`; (b) ručně
 *     při bootu (`app/_layout.tsx`), kvůli výpadkům co se staly mezi runy.
 *   - 4xx = server zápis odmítl → **zahodit** (retry nikdy neprojde).
 *   - 5xx / síťová chyba = ponechat, zkusit později.
 *   - 401 není možný mimo tuto funkci (apiFetch refreshuje sám; pokud refresh
 *     selže, `AuthenticationError` propadne jako 4xx → zahodit; session
 *     expired handler zařídí redirect na /login).
 *
 * Invalidace React Query: každá položka si nese `invalidateKeys` (pole klíčů
 * pro `queryClient.invalidateQueries`). Flush je projde po úspěchu.
 */

const QUEUE_KEY = "@folklore_write_queue";

export interface QueuedMutation {
  id: string;
  path: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body: unknown;
  enqueuedAt: string;
  /** Lokalizovaný popisek pro UI badge (např. "Jízda #42 → Hotovo"). */
  label: string;
  /** React Query klíče k invalidaci po úspěšném replayi. */
  invalidateKeys?: readonly (readonly string[])[];
}

type QueueListener = (queue: readonly QueuedMutation[]) => void;
const listeners = new Set<QueueListener>();

async function readQueue(): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

async function persistQueue(queue: readonly QueuedMutation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  listeners.forEach((l) => l(queue));
}

export async function getQueue(): Promise<readonly QueuedMutation[]> {
  return readQueue();
}

export async function enqueue(
  mutation: Omit<QueuedMutation, "id" | "enqueuedAt">,
): Promise<string> {
  const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry: QueuedMutation = {
    ...mutation,
    id,
    enqueuedAt: new Date().toISOString(),
  };
  const queue = await readQueue();
  queue.push(entry);
  await persistQueue(queue);
  return id;
}

export function subscribeQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  // Emit aktuální stav asynchronně, ať subscriber nepotřebuje vlastní load.
  void readQueue().then((q) => listener(q));
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Pokusí se každou čekající mutaci přehrát přes `apiFetch`. Úspěšné smaže
 * z fronty + invaliduje jejich query klíče. 4xx zahodí. 5xx / síťové
 * ponechá na další pokus.
 *
 * Je bezpečné volat i offline — v takovém případě skončí no-op.
 */
export async function flushQueue(
  queryClient?: QueryClient,
): Promise<{ processed: number; failed: number; remaining: number }> {
  if (!onlineManager.isOnline()) {
    const q = await readQueue();
    return { processed: 0, failed: 0, remaining: q.length };
  }

  const queue = await readQueue();
  if (queue.length === 0) {
    return { processed: 0, failed: 0, remaining: 0 };
  }

  let processed = 0;
  let failed = 0;
  const remaining: QueuedMutation[] = [];

  for (const mutation of queue) {
    try {
      await apiFetch(mutation.path, {
        method: mutation.method,
        body: JSON.stringify(mutation.body),
      });
      processed++;
      if (queryClient && mutation.invalidateKeys) {
        for (const key of mutation.invalidateKeys) {
          void queryClient.invalidateQueries({ queryKey: [...key] });
        }
      }
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        // Server zápis odmítl (validace, unauthorized, not found, …) —
        // retry by stejně neprošel. Zahodit.
        // eslint-disable-next-line no-console
        console.warn(
          `[writeQueue] zahodil ${mutation.method} ${mutation.path} (${e.status}: ${e.message})`,
        );
        failed++;
      } else {
        // 5xx / síť / neznámá chyba — ponechat.
        remaining.push(mutation);
      }
    }
  }

  await persistQueue(remaining);
  return { processed, failed, remaining: remaining.length };
}

/**
 * Napojí se na `onlineManager` a při každém přechodu offline→online spustí
 * `flushQueue()`. Vrací unsubscribe callback pro `useEffect`.
 */
export function setupOnlineFlush(queryClient: QueryClient): () => void {
  return onlineManager.subscribe((online) => {
    if (online) void flushQueue(queryClient);
  });
}
