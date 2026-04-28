import { type QueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { router } from "expo-router";
import { Platform } from "react-native";

import { MOBILE_PATHS } from "@/constants/api";
import { eventKeys } from "@/hooks/queries/queryKeys";
import { transportKeys } from "@/hooks/queries/queryKeys";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { getOrCreateDeviceId } from "@/lib/secureStorage";
import { useNotificationStore } from "@/stores/notificationStore";

/**
 * Push notifikace přes Expo Push Service.
 *
 * Cyklus života:
 *   1. `mountPushListeners()` — zavolá se jednou v `_layout.tsx` (připojí
 *      foreground + tap listenery). Běží nezávisle na auth state.
 *   2. `registerPush()` — po úspěšném loginu získá Expo token a POSTne ho
 *      na `/api/mobile/devices/register`.
 *   3. `unregisterPush()` — před logoutem DELETE `/devices/by-token`.
 *
 * Omezení v Expo Go (SDK 53+):
 *   - **Push (remote) notifications byly v Expo Go odstraněny.** Samotný
 *     `import * as Notifications from "expo-notifications"` v Expo Go
 *     hází runtime ERROR (top-level kód v expo-notifications probe-uje
 *     native modul). Proto modul **vůbec nenačítáme** v Expo Go — místo
 *     toho je všechno no-op. V Dev Client / standalone buildu se modul
 *     načte lazy přes `require()` a vše funguje plně.
 *   - Detekce: `Constants.executionEnvironment === "storeClient"` =
 *     Expo Go z App Store / Play Store.
 *   - Reálný push test vyžaduje **EAS Development Build**.
 */

const isExpoGo = Constants.executionEnvironment === "storeClient";

// Lazy require expo-notifications a expo-device — JEN když nejsme v Expo Go.
// Top-level `import` by spustil expo-notifications side-effects, které
// na Expo Go SDK 53+ Android hází ERROR.
type NotificationsModule = typeof import("expo-notifications");
type DeviceModule = typeof import("expo-device");

let _modules: { N: NotificationsModule; D: DeviceModule } | null = null;
let _modulesLoaded = false;

function loadModules(): { N: NotificationsModule; D: DeviceModule } | null {
  if (_modulesLoaded) return _modules;
  _modulesLoaded = true;
  if (isExpoGo) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const N = require("expo-notifications") as NotificationsModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const D = require("expo-device") as DeviceModule;
    _modules = { N, D };
    return _modules;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[push] expo-notifications / expo-device load selhal:", e);
    return null;
  }
}

// Module-level setup — foreground banner + sound. Pouze v Dev Client / standalone.
const _initialModules = loadModules();
if (_initialModules) {
  _initialModules.N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Typ `data` payloadu, který posílá `App\Service\Push\PushNotificationService`
 * v backendu. Zrcadlí pole `data` z `notifyUser()`.
 */
interface PushDataPayload {
  type?:
    | "staff_assignment"
    | "staff_removal"
    | "staff_attendance_confirmed"
    | "staff_paid"
    | "transport_assignment"
    | "transport_changed"
    | "transport_cancelled";
  eventId?: number | string;
  eventTransportId?: number | string;
  deepLink?: string;
}

function getProjectId(): string | null {
  const fromExpoConfig = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof fromExpoConfig === "string" && fromExpoConfig !== "") {
    return fromExpoConfig;
  }
  const fromEasConfig = Constants.easConfig?.projectId;
  if (typeof fromEasConfig === "string" && fromEasConfig !== "") {
    return fromEasConfig;
  }
  return null;
}

async function setupAndroidChannel(N: NotificationsModule): Promise<void> {
  if (Platform.OS !== "android") return;
  await N.setNotificationChannelAsync("default", {
    name: "default",
    importance: N.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#DC1A15",
  });
}

/**
 * Registrace push zařízení. Volá se po úspěšném loginu (viz `authStore`).
 */
export async function registerPush(): Promise<string | null> {
  const m = loadModules();
  if (!m) return null;

  if (!m.D.isDevice) {
    // eslint-disable-next-line no-console
    console.warn("[push] emulátor — push registration přeskočena");
    return null;
  }

  await setupAndroidChannel(m.N);

  const existing = await m.N.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await m.N.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") {
    // eslint-disable-next-line no-console
    console.warn("[push] oprávnění zamítnuto uživatelem");
    return null;
  }

  const projectId = getProjectId();
  if (projectId === null) {
    // eslint-disable-next-line no-console
    console.warn(
      "[push] chybí EAS projectId — spusť `eas init` a přidej ho do app.json " +
        "(`expo.extra.eas.projectId`).",
    );
    return null;
  }

  let token: string;
  try {
    const result = await m.N.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[push] getExpoPushTokenAsync selhal:", e);
    return null;
  }

  const deviceId = await getOrCreateDeviceId();
  try {
    await apiFetch(MOBILE_PATHS.deviceRegister, {
      method: "POST",
      body: JSON.stringify({
        fcmToken: token,
        platform: Platform.OS === "ios" ? "ios" : "android",
        deviceId,
        deviceName: m.D.deviceName ?? undefined,
      }),
    });
  } catch (e) {
    if (e instanceof ApiError) {
      // eslint-disable-next-line no-console
      console.warn(`[push] /devices/register vrátil ${e.status}: ${e.message}`);
    } else {
      // eslint-disable-next-line no-console
      console.warn("[push] /devices/register síťová chyba:", e);
    }
    return null;
  }

  return token;
}

/**
 * Odregistrace push tokenu — volá se před logoutem. Tolerantní k chybám.
 */
export async function unregisterPush(): Promise<void> {
  const m = loadModules();
  if (!m) return;

  const projectId = getProjectId();
  if (projectId === null) return;

  let token: string;
  try {
    const result = await m.N.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch {
    return;
  }

  try {
    await apiFetch(MOBILE_PATHS.deviceDeleteByToken, {
      method: "DELETE",
      body: JSON.stringify({ fcmToken: token }),
    });
  } catch {
    // offline / 5xx / token nebyl zaregistrován — ignoruj
  }
}

/**
 * Určí sidebar notifikace pro `notificationStore` podle `data.type` z push
 * payloadu. Mapping na `AppNotification["type"]`.
 */
function mapPushType(
  type: PushDataPayload["type"],
): "event_change" | "event_cancel" | "event_add" | "transport_change" | "transport_cancel" {
  switch (type) {
    case "staff_assignment":
      return "event_add";
    case "staff_removal":
      return "event_cancel";
    case "staff_attendance_confirmed":
    case "staff_paid":
      return "event_change";
    case "transport_assignment":
      return "transport_change";
    case "transport_changed":
      return "transport_change";
    case "transport_cancelled":
      return "transport_cancel";
    default:
      return "event_change";
  }
}

function invalidateForPushType(
  qc: QueryClient,
  type: PushDataPayload["type"],
): void {
  switch (type) {
    case "staff_assignment":
    case "staff_removal":
      void qc.invalidateQueries({ queryKey: eventKeys.lists() });
      void qc.invalidateQueries({ queryKey: eventKeys.history() });
      return;
    case "staff_attendance_confirmed":
    case "staff_paid":
      // Tyto se týkají typicky minulých akcí → refreshni i Historii.
      void qc.invalidateQueries({ queryKey: eventKeys.lists() });
      void qc.invalidateQueries({ queryKey: eventKeys.history() });
      return;
    case "transport_assignment":
    case "transport_changed":
    case "transport_cancelled":
      void qc.invalidateQueries({ queryKey: transportKeys.lists() });
      return;
    default:
      void qc.invalidateQueries({ queryKey: eventKeys.all });
      void qc.invalidateQueries({ queryKey: transportKeys.all });
  }
}

/**
 * Připojí globální listenery — foreground notifikace (zapíše se do
 * `notificationStore` + invaliduje příslušné React Query klíče) a tap na
 * notifikaci (deep link do `router.push`).
 *
 * Zavolá se jednou v `_layout.tsx`. Vrací cleanup funkci pro `useEffect`.
 */
export function mountPushListeners(qc: QueryClient): () => void {
  const m = loadModules();
  if (!m) return () => {};

  const receivedSub = m.N.addNotificationReceivedListener((notif) => {
    const content = notif.request.content;
    const data = (content.data as PushDataPayload | undefined) ?? {};
    useNotificationStore.getState().addNotification({
      title: content.title ?? "",
      body: content.body ?? "",
      type: mapPushType(data.type),
      data: data as Record<string, unknown>,
    });
    invalidateForPushType(qc, data.type);
  });

  const responseSub = m.N.addNotificationResponseReceivedListener(
    (response) => {
      const data =
        (response.notification.request.content.data as
          | PushDataPayload
          | undefined) ?? {};

      // Přednost má explicitní deepLink z backendu; fallback na
      // derivaci z eventId / eventTransportId.
      if (data.deepLink) {
        router.push(data.deepLink as never);
        return;
      }
      if (data.eventTransportId) {
        router.push(
          `/event-detail?id=${data.eventTransportId}&type=transport` as never,
        );
        return;
      }
      if (data.eventId) {
        router.push(`/event-detail?id=${data.eventId}&type=event` as never);
      }
    },
  );

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
