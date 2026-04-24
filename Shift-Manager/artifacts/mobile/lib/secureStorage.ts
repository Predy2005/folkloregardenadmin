import * as SecureStore from "expo-secure-store";

/**
 * Tenký wrapper nad `expo-secure-store` — hardware-backed keychain (iOS) /
 * EncryptedSharedPreferences (Android). Všechno citlivé (access + refresh
 * token, PIN hash, deviceId binding) patří sem, ne do AsyncStorage.
 *
 * Konvence klíčů: prefix `fg.` aby nekolidovaly s jinými apkami na zařízení.
 */

export const SECURE_KEYS = {
  accessToken: "fg.accessToken",
  refreshToken: "fg.refreshToken",
  pin: "fg.pin",
  deviceId: "fg.deviceId",
  /**
   * E-mail / username, kterým se user naposled úspěšně přihlásil. Využívá
   * `/pin-unlock` screen — PIN flow pracuje se stejným identifierem, který
   * už zná, aby ho user nemusel vypisovat znovu.
   */
  identifier: "fg.identifier",
} as const;

export type SecureKey = keyof typeof SECURE_KEYS;

export function secureGet(key: SecureKey): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEYS[key]);
}

export function secureSet(key: SecureKey, value: string): Promise<void> {
  return SecureStore.setItemAsync(SECURE_KEYS[key], value);
}

export function secureDelete(key: SecureKey): Promise<void> {
  return SecureStore.deleteItemAsync(SECURE_KEYS[key]);
}

/**
 * Vrátí stabilní identifier zařízení; při prvním volání se vygeneruje UUID
 * a uloží do SecureStore. Slouží k bindingu PIN a k FCM registraci.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await secureGet("deviceId");
  if (existing) return existing;

  const id =
    typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : fallbackRandomId();

  await secureSet("deviceId", id);
  return id;
}

function fallbackRandomId(): string {
  // Jen když crypto.randomUUID není dostupný (ojedinělé RN verze).
  return (
    "dev-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 12)
  );
}
