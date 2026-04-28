import { type QueryClient } from "@tanstack/react-query";

/**
 * Web no-op stub. `expo-notifications` na webu používá Service Worker push,
 * který ze SDK 54 není v Expo plně podporován bez vlastního SW (out-of-scope
 * pro mobilní app, web mode je primárně dev preview).
 *
 * Metro automaticky vybere `push.web.ts` na webu a `push.native.ts` na
 * iOS/Android (resolveru-driven extension priority).
 */

export async function registerPush(): Promise<string | null> {
  return null;
}

export async function unregisterPush(): Promise<void> {
  // no-op
}

export function mountPushListeners(_qc: QueryClient): () => void {
  return () => {};
}
