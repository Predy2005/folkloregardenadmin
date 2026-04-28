/**
 * Web fallback pro `secureStorage`. Metro vybere `secureStorage.native.ts`
 * na iOS/Android a tenhle soubor jako fallback (web).
 *
 * **Bezpečnost.** `localStorage` NENÍ bezpečné pro long-lived secrets
 * (XSS, plain plaintext storage). Tato implementace je určená výhradně
 * pro **dev preview v prohlížeči** — produkce běží na mobilu, kde
 * `secureStorage.native.ts` používá hardware-backed keychain (iOS) /
 * EncryptedSharedPreferences (Android).
 *
 * Pokud bude někdy potřeba secure cookie / encrypted local storage pro web,
 * tady je kandidát na náhradu (např. `idb-keyval` + Web Crypto API).
 */

export const SECURE_KEYS = {
  accessToken: "fg.accessToken",
  refreshToken: "fg.refreshToken",
  pin: "fg.pin",
  deviceId: "fg.deviceId",
  identifier: "fg.identifier",
} as const;

export type SecureKey = keyof typeof SECURE_KEYS;

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export async function secureGet(key: SecureKey): Promise<string | null> {
  const storage = getStorage();
  if (!storage) return null;
  return storage.getItem(SECURE_KEYS[key]);
}

export async function secureSet(key: SecureKey, value: string): Promise<void> {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(SECURE_KEYS[key], value);
}

export async function secureDelete(key: SecureKey): Promise<void> {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(SECURE_KEYS[key]);
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await secureGet("deviceId");
  if (existing) return existing;

  const id =
    typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : "web-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);

  await secureSet("deviceId", id);
  return id;
}
