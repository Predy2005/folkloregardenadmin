# Migration Plan — Mobilka → Nový Backend

> **Status:** `proposed / not approved / not implemented`
> **Navrhnul:** uživatel · **Reviewed:** Claude (inline `> Review note:` bloky)
> **Verze:** v0.1 · **Datum zanesení:** 2026-04-24
>
> Tohle je **future work**, ne current state. Popisuje zamýšlenou migraci
> mobilní aplikace (`artifacts/mobile`) ze stávajícího CRM API na nový backend
> (`/api/mobile/*`) včetně doprovodných změn (SecureStore, PIN, FCM push,
> check-in/out, transport status). Dokud není schváleno a naplánováno do PR,
> **žádná část se neimplementuje**.
>
> Current state mobilky je v `doc/architecture.md`. Tento dokument na něj
> **naváže**, až se začne realizovat. Po schválení a dokončení každé fáze se
> odpovídající sekce v `architecture.md` updatuje podle jejího §11 pravidla.

---

## 0. Open blockers — rozhodnout PŘED psaním kódu

Review odhalila dvě otázky, které mění scope plánu. Dokud nejsou zodpovězené,
plán je ve stavu v0.1.

### 0.1 FCM nebo Expo Notifications? ✅ rozhodnuto 2026-04-24 — **Expo Notifications**

Důvody (konsolidovaná úvaha z návrhu + review):
- backend `FcmClient.php` byl napsaný, ale **nikdy v produkci neběžel** (žádné
  mobilní zařízení nebylo zaregistrované), takže sunk cost argument neplatí
- zachování Expo Go DX v dev je významná úspora (žádný EAS Dev Client build)
- PushNotificationService fan-out je 1:1 per-user — Expo topics nepotřebujeme
- projekt je plně Expo (SDK 54, expo-router, expo-secure-store, expo-application),
  `@react-native-firebase/*` by porušilo paradigma

Dopad do plánu:
- Backend: `ExpoPushClient` vedle `FcmClient` (legacy). `PushNotificationService`
  přepnutý na Expo. Services.yaml aktualizované. **Hotovo v PR4.**
- Mobile: `expo-notifications` + `lib/push.ts`. Bez `google-services.json`,
  bez `expo-build-properties`. **Hotovo v PR4.**
- `doc/local-dev.md` se **nemusí přepisovat** — Expo Go dál funguje.
  Pro reálné push testování v dev: Expo Push Tool (`https://expo.dev/notifications`)
  nebo `expo-notifications` test screen.

### 0.1.old (historická varianta — FCM direct) — neakceptováno

`@react-native-firebase/messaging` **nejede v Expo Go**. Moment, kdy přistane
v `package.json`, znamená:

- Vyhození "scan QR v Expo Go" flow → dev onboarding přes **EAS Build + Dev
  Client** (přepsat `doc/local-dev.md` kompletně)
- `google-services.json` (Android) + `GoogleService-Info.plist` (iOS) + APNs
  certifikát v Apple Developer portálu
- `expo-build-properties` plugin + `app.json` úpravy
- Firebase projekt, service account, CI secrets

**Alternativa:** `expo-notifications` + **Expo Push Service** (tenký wrapper
nad FCM/APNs provozovaný Expo). Jede v Expo Go v dev režimu, v produkci
stejně přes EAS Build. Backend pak pošle token na Expo endpoint místo přímo
do FCM.

**Rozhodnutí potřebné:** jestli backend už implementuje FCM direct push
(v tom případě commit do Firebase SDK), nebo je to ještě otevřené (pak vyhodnotit
Expo Notifications jako levnější cestu).

### 0.2 Kdo servíruje `/api/mobile/*`?

Plán mlčí o tom, co **je** nový backend:

- **(a)** Nový externí servis — pak je tohle čistý frontend task a
  `artifacts/api-server` (dnes prázdný Express) zůstává skeleton nebo zanikne.
- **(b)** Rozšíření `artifacts/api-server` — pak je to paralelní gigantická
  práce, v plánu neviditelná, a mění odpověď na "má smysl držet
  `lib/api-spec/openapi.yaml` + orval codegen aktivní?"

**Rozhodnutí potřebné.** Mění roadmap pro celý monorepo, ne jen mobile.

### 0.3 Rozfázování — nenapíšeme to jako jeden PR

Plán míchá tři nezávislé směry:

- **(A)** Endpoint swap (CRM → `/api/mobile/*`) — drop-in
- **(B)** Security upgrade (AsyncStorage → SecureStore, access+refresh, rotace)
- **(C)** Architecture refactor (Zustand, React Query, PIN, FCM, check-in/out)

Doporučené rozsekání:

| PR | Obsah | Vyřeší ⚠️ z architecture.md |
|---|---|---|
| **PR1** (A+B) | Endpoint swap + SecureStore + auto-refresh interceptor. Funkčně ekvivalent dneška, jen na novém backendu a bezpečně. | §2.3 (token v AsyncStorage), §2.1 (starý /auth) |
| **PR2** | TanStack Query adoption — smaže `setInterval`, vyřeší §10 "unused QueryClient". | §7.6, §7.7 (setInterval), §10 (QueryClient) |
| **PR3** | Zustand migrace `AuthContext` + `NotificationContext`. | §5.1, §5.2 |
| **PR4** | Push notifikace (po rozhodnutí z §0.1). Tady padne Expo Go, update `doc/local-dev.md`. | §5.2 (addNotification dead export) |
| **PR5** | PIN login + check-in/out + transport status + **offline write queue** (viz §8.4). | nové feature |

Jeden mega-PR by porušil `doc/frontend-rules.md` §14.2 (PR nad 500 řádků dělit)
a nedal by se rozumně zreviewovat.

---

## 1. Endpointová mapa (old → new)

| Mobilka dnes | Nový backend | Změna |
|---|---|---|
| `POST /auth/login` → `{token}` | `POST /api/mobile/auth/login` → `{accessToken, refreshToken, user, accessTokenExpiresIn, refreshTokenExpiresAt}` | body: `{identifier, password, deviceId?}`; access TTL 2 h, refresh TTL 14 d |
| `GET /auth/user` | `GET /api/mobile/auth/me` | rozšířený shape: `{id, username, email, roles, permissions, staffMemberId, staffMemberName, transportDriverId, transportDriverName, pinEnabled}` |
| `GET /api/reservations` (Staff) | `GET /api/mobile/me/events?from=&to=` | vrací `{events: EventListItem[]}` — už pre-filtrováno podle přihlášeného staff, vč. `myAssignmentId` a `myAttendanceStatus` |
| `GET /api/reservation/{id}` (Staff) | `GET /api/mobile/me/events/{id}` | detail role-aware: waiter vidí tables, cook vidí menu+beverages, oba schedule |
| `GET /smart-drive/overview` + fallback | `GET /api/mobile/me/transports?from=` | vrací `{transports: TransportListItem[]}` pre-filtrované podle řidiče |
| (neexistovalo) | `GET /api/mobile/me/transports/{id}` | detail transportu |
| (neexistovalo) | `PUT /api/mobile/me/transports/{id}/status` | `{status: "IN_PROGRESS"\|"DONE"}` — **zápis! Poprvé mobilka píše na server** |
| (neexistovalo) | `POST /api/mobile/me/attendance/checkin` / `/checkout` | `{eventId, at?}` — docházka |
| (neexistovalo) | `POST /api/mobile/auth/refresh` | `{refreshToken, deviceId?}` → nový pár |
| (neexistovalo) | `POST /api/mobile/auth/pin-login` | `{identifier, pin, deviceId}` |
| (neexistovalo) | `POST /api/mobile/auth/logout` | `{refreshToken}` |
| (neexistovalo) | `POST /api/mobile/devices/register` | `{fcmToken, platform, deviceId?, deviceName?}` |
| (neexistovalo) | `DELETE /api/mobile/devices/by-token` | `{fcmToken}` při logoutu |

**Důležité:** `/auth/login` a `/auth/user` zůstávají funkční pro web, ale
mobilka už je nepoužívá — přejde na `/api/mobile/auth/*`.

> **Review note:** Plán neřeší **time zones**. `EventListItem.startTime: "14:00"`
> + `date: "2026-06-15"` bez offset. Europe/Prague implicit? Backend kontrakt
> musí vyslovit (buď ISO 8601 s offsetem, nebo explicitní `timeZone` field).
> Jinak bug, až řidič pojede do Rakouska.

---

## 2. Nové koncepty, které mobilka musí pochopit

### 2.1 Access + Refresh token

- **Access** = JWT, 2 h TTL, posílá se v `Authorization: Bearer`. Obsahuje custom
  claimy: `mobile: true`, `staffMemberId`, `transportDriverId`, `deviceId`.
- **Refresh** = opaque 128-znakový string, 14 d TTL, schovaný v `expo-secure-store`.
  Při každém refresh se **rotuje** — starý je zneplatněn, klient musí uložit nový.
- Pokud mobilka dostane `401` → zavolá `/refresh` → dostane nový pár → retry
  původní request.

> **Review note:** Custom claimy (`staffMemberId`, `transportDriverId`) **zbytečně
> nafukují access token a odkrývají PII** v logu / proxy. Zvaž, jestli tyhle ID
> nemají být jen v `/me` response, a token nese jen `userId` + `roles`. Menší
> token = menší overhead každého requestu.

### 2.2 Device ID

- Stabilní identifikátor zařízení (instalace). Použij `expo-application`
  `getAndroidId()` / iOS `getIosIdForVendorAsync()` **nebo** vlastní UUID
  v SecureStore.
- Posílá se při `/login`, `/pin-login`, `/refresh`, `/devices/register`. Slouží k:
  - bindingu PIN na konkrétní zařízení (trust-on-first-use)
  - detekci odcizení refresh tokenu (pokud přijde z jiného zařízení, celý řetězec se zneplatní)

> **Review note:** Doporučuju **jen vlastní UUID v SecureStore**, ne
> `expo-application` IDs:
> - Android `ANDROID_ID` se mění při factory reset.
> - iOS `identifierForVendor` je sdílený mezi všemi appkami téhož vendoru
>   (pokud byste jednou měli víc appek, sdílený ID je nechtěná korelace).
> - Vlastní UUID = stabilní, consistent cross-platform, plně pod kontrolou.
>
> `getOrCreateDeviceId()` v §3.2 dělá přesně tohle — jen smaž v textu „nebo“.

### 2.3 Role podle permissions, ne volbou uživatele

Celý `/role-select` screen může zmizet ⚠️. Role se odvozuje z `me.roles`:

- `STAFF_WAITER` nebo `STAFF_COOK` → staff UI (`StaffEventsScreen`)
- `STAFF_DRIVER` → driver UI (`DriverTransportsScreen`)
- Když by user měl obě (teď nepodporujeme, ale model unese), UI přepínač

> **Review note:** "UI přepínač pro kombinovanou roli" není dořešený. Jak se
> pamatuje aktuální volba? Jestli v memory → ztráta při restartu. Jestli
> v storage → kde a kdy se invaliduje? Buď rozhodni teď (jeden řádek v
> Zustandu), nebo explicitně řekni "kombinovaná role = out of scope v0.1".

### 2.4 PIN login

- Alternativa k heslu. Admin ho personálu založí při provisioning (z web admin UI).
- Mobilka si PIN uloží v SecureStore a při spuštění může nabídnout rychlé odemčení.
- První PIN login na zařízení zaváže `deviceId` — další pokus z jiného telefonu
  admin musí odblokovat.

> **Review note:** UX díra — když uživatel ztratí / vymění telefon, PIN login
> nefunguje dokud admin nesmaže binding. To chce:
> (a) fallback na heslo login **vždy** dostupný (plán to implicitně předpokládá),
> (b) viditelné hlášení v UI "Toto zařízení nemá nastavený PIN, přihlaš se heslem",
> (c) admin workflow v web UI s jasným tlačítkem "Reset PIN device binding".
> Endpoint `DELETE /mobile-account/pin` je hotový, ale UI musí existovat.

### 2.5 Push (FCM)

- Po loginu → získat FCM token → `POST /api/mobile/devices/register`
- Payload notifikace nese v `data`: `{type, eventId?, eventTransportId?, deepLink?}`
- Při sign-out → `DELETE /api/mobile/devices/by-token`

> **Review note:** **Hlavní blocker — viz §0.1.** Commit do Firebase SDK zabíjí
> Expo Go dev loop. Expo Notifications (vlastní Expo push service) jede v Expo
> Go, v produkci pošle na stejné APNs/FCM přes Expo endpoint. Jestli backend
> může posílat `ExponentPushToken[...]` místo raw FCM tokenu, doporučuju to.
> Rozhodnutí má průsak do §3.7 (kód push.ts) a §4 (checklist, package.json).

---

## 3. Konkrétní kód — drop-in pro `artifacts/mobile/`

> **Review note ke všem §3.\* ukázkám:** kód ukazuje **raw `apiFetch` volané
> přímo ve screenech** (§3.5, §3.6), což je dnešní stav. Krok 10 checklistu
> současně říká "přejít na TanStack Query". Zvol jedno: PR1 nech raw fetch
> (v podstatě jen swap URL), PR2 přepíše na React Query hooks dle pravidla
> §5.1 frontend-rules (každý endpoint = vlastní custom hook, ne useQuery
> přímo ve screenu). Nedělej obojí v jednom PR.

### 3.1 `constants/api.ts` — přidat mobile paths

```typescript
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://apifolklore.testujeme.online";

export const MOBILE_PATHS = {
  login: "/api/mobile/auth/login",
  pinLogin: "/api/mobile/auth/pin-login",
  refresh: "/api/mobile/auth/refresh",
  logout: "/api/mobile/auth/logout",
  me: "/api/mobile/auth/me",
  events: "/api/mobile/me/events",
  eventDetail: (id: number | string) => `/api/mobile/me/events/${id}`,
  checkIn: "/api/mobile/me/attendance/checkin",
  checkOut: "/api/mobile/me/attendance/checkout",
  transports: "/api/mobile/me/transports",
  transportDetail: (id: number | string) => `/api/mobile/me/transports/${id}`,
  transportStatus: (id: number | string) => `/api/mobile/me/transports/${id}/status`,
  deviceRegister: "/api/mobile/devices/register",
  deviceDeleteByToken: "/api/mobile/devices/by-token",
} as const;
```

### 3.2 `lib/secureStorage.ts` — zavést SecureStore (řeší ⚠️ §2.3 bezpečnost)

```typescript
import * as SecureStore from "expo-secure-store";

const SECURE_KEYS = {
  accessToken: "fg.accessToken",
  refreshToken: "fg.refreshToken",
  pin: "fg.pin",
  deviceId: "fg.deviceId",
} as const;

export const secureGet = (k: keyof typeof SECURE_KEYS) =>
  SecureStore.getItemAsync(SECURE_KEYS[k]);

export const secureSet = (k: keyof typeof SECURE_KEYS, v: string) =>
  SecureStore.setItemAsync(SECURE_KEYS[k], v);

export const secureDelete = (k: keyof typeof SECURE_KEYS) =>
  SecureStore.deleteItemAsync(SECURE_KEYS[k]);

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await secureGet("deviceId");
  if (!id) {
    id =
      (globalThis.crypto as Crypto | undefined)?.randomUUID?.() ??
      `d-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await secureSet("deviceId", id);
  }
  return id;
}
```

> **Review note:** `crypto.randomUUID()` na Expo/Hermes není zaručeně dostupné.
> Expo SDK 54 má `expo-crypto` s `randomUUID()` — explicitní a safer. Fallback
> na `Date.now()+random` je slabý pro reálný UUID — použij `expo-crypto` a vyhoď
> ternární fallback. Kontrolovaný závislostní přírůstek, ne surprise package.

### 3.3 `lib/apiClient.ts` — fetch s auto-refresh

```typescript
import { API_BASE_URL, MOBILE_PATHS } from "@/constants/api";
import { secureGet, secureSet, secureDelete } from "./secureStorage";

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = await secureGet("refreshToken");
  if (!refreshToken) return null;
  const deviceId = await secureGet("deviceId");

  try {
    const res = await fetch(`${API_BASE_URL}${MOBILE_PATHS.refresh}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken, deviceId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    await secureSet("accessToken", data.accessToken);
    await secureSet("refreshToken", data.refreshToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

async function ensureAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = init;

  const buildHeaders = async () => {
    const h = new Headers(headers);
    h.set("Content-Type", "application/json");
    if (auth) {
      const token = await secureGet("accessToken");
      if (token) h.set("Authorization", `Bearer ${token}`);
    }
    return h;
  };

  const exec = async (h: Headers) =>
    fetch(`${API_BASE_URL}${path}`, { ...rest, headers: h });

  let h = await buildHeaders();
  let res = await exec(h);

  // 401 → pokus o refresh + retry jednou
  if (res.status === 401 && auth) {
    const fresh = await ensureAccessToken();
    if (fresh) {
      h.set("Authorization", `Bearer ${fresh}`);
      res = await exec(h);
    } else {
      // Hard logout — vyčistit a signalizovat AuthContextu
      await Promise.all([
        secureDelete("accessToken"),
        secureDelete("refreshToken"),
      ]);
      throw new ApiError(401, "Session vypršela, přihlas se znovu.");
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let msg = `HTTP ${res.status}`;
    try {
      msg = JSON.parse(body).error ?? msg;
    } catch {}
    throw new ApiError(res.status, msg);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
```

> **Review note (důležité, zachovat):** singleton `refreshPromise` je correct
> řešení race condition — když 5 paralelních requestů dostane 401, chceme jeden
> refresh, ne pět. **Neodstraňovat.**
>
> **Review note (přidat):** na hard logout se dnes jen vyčistí SecureStore a
> vyhodí `ApiError(401)`. UI to musí zachytit a navigovat na `/login`. Buď:
> (a) globální `onError` handler v React Query v PR2, který pro `status === 401`
> volá `router.replace("/login")`, nebo
> (b) event emitter z `apiClient` → `AuthContext` listener. Plán tuhle hranu
> nechává na callerech a každý screen by to musel řešit zvlášť.

### 3.4 `context/AuthContext.tsx` (nebo Zustand — vyřeší ⚠️ §5.1)

Shape:

```typescript
type MobileUser = {
  id: number;
  username: string;
  email: string;
  roles: string[];              // obsahuje STAFF_WAITER / STAFF_COOK / STAFF_DRIVER
  permissions: string[];        // pro fine-grained check
  staffMemberId: number | null;
  staffMemberName: string | null;
  transportDriverId: number | null;
  transportDriverName: string | null;
  pinEnabled: boolean;
};

type DerivedRole = "waiter" | "cook" | "driver" | null;

function deriveRole(user: MobileUser): DerivedRole {
  if (user.roles.includes("STAFF_DRIVER")) return "driver";
  if (user.roles.includes("STAFF_WAITER")) return "waiter";
  if (user.roles.includes("STAFF_COOK")) return "cook";
  return null;
}
```

Login:

```typescript
import { apiFetch } from "@/lib/apiClient";
import { getOrCreateDeviceId, secureSet, secureDelete } from "@/lib/secureStorage";
import { MOBILE_PATHS } from "@/constants/api";

async function login(identifier: string, password: string) {
  const deviceId = await getOrCreateDeviceId();
  const res = await apiFetch<{
    accessToken: string;
    refreshToken: string;
    user: MobileUser;
  }>(MOBILE_PATHS.login, {
    method: "POST",
    auth: false,
    body: JSON.stringify({ identifier, password, deviceId }),
  });
  await secureSet("accessToken", res.accessToken);
  await secureSet("refreshToken", res.refreshToken);
  setUser(res.user);
  // po loginu → zaregistruj push token (viz §3.7)
}

async function loginWithPin(identifier: string, pin: string) {
  const deviceId = await getOrCreateDeviceId();
  const res = await apiFetch<{ accessToken; refreshToken; user }>(
    MOBILE_PATHS.pinLogin,
    {
      method: "POST",
      auth: false,
      body: JSON.stringify({ identifier, pin, deviceId }),
    },
  );
  await secureSet("accessToken", res.accessToken);
  await secureSet("refreshToken", res.refreshToken);
  setUser(res.user);
}

async function logout() {
  // Odregistruj FCM token
  const { default: messaging } = await import("@react-native-firebase/messaging");
  try {
    const fcmToken = await messaging().getToken();
    await apiFetch(MOBILE_PATHS.deviceDeleteByToken, {
      method: "DELETE",
      body: JSON.stringify({ fcmToken }),
    }).catch(() => {});
  } catch {}

  // Odvolej refresh na serveru
  const refreshToken = await secureGet("refreshToken");
  if (refreshToken) {
    await apiFetch(MOBILE_PATHS.logout, {
      method: "POST",
      auth: false,
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }

  await Promise.all([
    secureDelete("accessToken"),
    secureDelete("refreshToken"),
  ]);
  setUser(null);
}
```

> **Review note:** `await import("@react-native-firebase/messaging")` uvnitř
> `logout()` je fragile anti-pattern — dynamic imports v RN/Metro mají občasné
> resolution issues a tiché selhání v produkčním bundle. Extrahovat do
> `lib/push.ts` s funkcemi `registerPush()` / `unregisterPush()`, importovat
> top-level a volat `unregisterPush()` zde. Čistší, testovatelnější, a pokud
> se změní rozhodnutí §0.1 (Expo Notifications), mění se jeden soubor.

Hydrate při bootu:

```typescript
async function bootstrap() {
  const token = await secureGet("accessToken");
  if (!token) return setLoading(false);
  try {
    const me = await apiFetch<MobileUser>(MOBILE_PATHS.me);
    setUser(me);
  } catch {
    // token propadl, AutoRefresh interceptor už ho smazal
  } finally {
    setLoading(false);
  }
}
```

### 3.5 `screens/StaffEventsScreen.tsx` — náhrada endpointu + typ

```typescript
type EventListItem = {
  eventId: number;
  name: string;
  eventType: string;
  date: string;              // "2026-06-15"
  startTime: string;         // "14:00"
  durationMinutes: number;
  venue: string | null;
  language: string;
  guestsTotal: number;
  status: string;
  myAssignmentId: number;
  myAttendanceStatus: "PENDING" | "PRESENT";
  myAttendedAt: string | null;
};

// nahraďte apiFetch("/api/reservations") za:
const res = await apiFetch<{ events: EventListItem[] }>(MOBILE_PATHS.events);
setEvents(res.events);
```

Tím zmizí celá fallback logika i filtrování klienta — backend už vrátí jen
události relevantní pro přihlášeného. Status filter
(`CONFIRMED`/`PAID`/`RECEIVED`/`CANCELLED`) funguje dál lokálně.

### 3.6 `screens/DriverTransportsScreen.tsx` — jednoduchý swap

```typescript
type TransportListItem = {
  id: number;
  eventId: number;
  eventName: string;
  eventDate: string;
  eventStartTime: string;
  venue: string | null;
  transportType: string | null;
  scheduledTime: string | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  passengerCount: number | null;
  executionStatus: "IN_PROGRESS" | "DONE" | null;
  notes: string | null;
  vehicle: {
    id: number;
    licensePlate: string;
    brand: string | null;
    model: string | null;
    capacity: number;
  } | null;
};

const res = await apiFetch<{ transports: TransportListItem[] }>(
  MOBILE_PATHS.transports,
);
setTransports(res.transports);
```

Odpadne fallback na `/api/reservations` + filtr `transferSelected` (řeší ⚠️).

Nová schopnost — update stavu jízdy (poprvé mobilka něco zapisuje):

```typescript
async function markInProgress(transportId: number) {
  await apiFetch(MOBILE_PATHS.transportStatus(transportId), {
    method: "PUT",
    body: JSON.stringify({ status: "IN_PROGRESS" }),
  });
}
async function markDone(transportId: number) {
  await apiFetch(MOBILE_PATHS.transportStatus(transportId), {
    method: "PUT",
    body: JSON.stringify({ status: "DONE" }),
  });
}
```

> **Review note:** tohle je **první místo, kde mobilka píše**. Offline scénář
> (řidič v údolí bez signálu stiskne "DONE") plán vůbec neřeší — mutace padne,
> user dostane `Error`, data jsou pryč. Viz §8.4 níž.

### 3.7 `lib/push.ts` — FCM registrace

```typescript
import messaging from "@react-native-firebase/messaging";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { apiFetch } from "./apiClient";
import { getOrCreateDeviceId } from "./secureStorage";
import { MOBILE_PATHS } from "@/constants/api";

export async function registerPush() {
  const auth = await messaging().requestPermission();
  if (
    auth !== messaging.AuthorizationStatus.AUTHORIZED &&
    auth !== messaging.AuthorizationStatus.PROVISIONAL
  ) {
    return;
  }
  const fcmToken = await messaging().getToken();
  const deviceId = await getOrCreateDeviceId();
  await apiFetch(MOBILE_PATHS.deviceRegister, {
    method: "POST",
    body: JSON.stringify({
      fcmToken,
      platform: Platform.OS === "ios" ? "ios" : "android",
      deviceId,
      deviceName: Device.deviceName ?? undefined,
    }),
  });

  // Token se může v čase měnit → registruj znovu
  messaging().onTokenRefresh(async (newToken) => {
    await apiFetch(MOBILE_PATHS.deviceRegister, {
      method: "POST",
      body: JSON.stringify({
        fcmToken: newToken,
        platform: Platform.OS === "ios" ? "ios" : "android",
        deviceId,
        deviceName: Device.deviceName ?? undefined,
      }),
    });
  });

  // Foreground handler → NotificationContext.addNotification (vyřeší ⚠️ §5.2)
  messaging().onMessage(async (remoteMessage) => {
    notificationStore.add({
      title: remoteMessage.notification?.title ?? "",
      body: remoteMessage.notification?.body ?? "",
      type: (remoteMessage.data?.type as string) ?? "event_change",
      data: remoteMessage.data,
    });
  });

  // Tap na notifikaci z backgroundu → deep link
  messaging().onNotificationOpenedApp((msg) => {
    const link = msg.data?.deepLink as string | undefined;
    if (link) router.push(link);
  });
}
```

Zavolej `registerPush()` v `AuthContext.login()` po úspěšném loginu.

> **Review note:** celý soubor je podmíněný rozhodnutím §0.1. Pokud
> Expo Notifications, tento `push.ts` se kompletně přepíše — `expo-notifications`
> má jiné API (`Notifications.getExpoPushTokenAsync()`, `addNotificationReceivedListener`
> atd.) a je **zásadně jednodušší** (bez Firebase SDK, bez native konfigu).

### 3.8 Docházka — nové akce v `EventDetailScreen`

```typescript
async function checkIn(eventId: number) {
  await apiFetch(MOBILE_PATHS.checkIn, {
    method: "POST",
    body: JSON.stringify({ eventId }),
  });
}
async function checkOut(eventId: number) {
  await apiFetch(MOBILE_PATHS.checkOut, {
    method: "POST",
    body: JSON.stringify({ eventId }),
  });
}
```

UI: tlačítka se řídí podle `myAttendanceStatus` z list response. Po úspěchu
invalidovat query + `Haptics.notificationAsync`.

> **Review note:** stejně jako transport status (§3.6), **offline scénář je
> klíčový**. Check-in dělá staff na místě konání akce — tam bývá horší signál
> než ve městě. Bez write queue to je nepoužitelné.

---

## 4. Checklist — co konkrétně v mobilním repu udělat

> **Review note ke struktuře checklistu:** 14 kroků v jednom seznamu je
> mega-PR. Viz §0.3 — rozsekat do 5 PR-ek. Níže je původní seznam, v
> posledním sloupci **PR #** říká, kam co patří.

| # | Změna | Soubor | Vyřeší ⚠️ | PR |
|---|---|---|---|---|
| 1 | Nahradit AsyncStorage tokenů za `expo-secure-store` | nový `lib/secureStorage.ts`, update AuthContext | §2.3 bezpečnost | **PR1** |
| 2 | Nový `lib/apiClient.ts` s auto-refresh interceptorem | — | `useApiConfig` zůstává, ale ztenčí se | **PR1** |
| 3 | Přejít na `/api/mobile/auth/*` a `/api/mobile/me/*` | `constants/api.ts`, AuthContext, StaffEventsScreen, DriverTransportsScreen, event-detail.tsx | několik endpoint ⚠️ | **PR1** |
| 4 | Smazat `role-select.tsx`, odvodit roli z `user.roles` | `app/index.tsx` (routing gate) | jeden manuální krok méně | **PR1** |
| 13 | Smazat `hooks/useAuth.ts` (duplikát) | | §6 ⚠️ duplikát | **PR1** |
| 14 | Smazat nevyužité `AppState`, `Platform` importy v `NotificationContext` | | §10 | **PR1** |
| ~~10~~ | ~~Nahradit `useState` + `useEffect` + `setInterval(60s)` za TanStack Query~~ — **hotovo (PR2)**: `useEvents`/`useEvent`/`useTransports`/`useTransport` v `hooks/queries/`, `staleTime: 60s` + `focusManager`, `onlineManager`+NetInfo odloženo do PR5 | StaffEventsScreen, DriverTransportsScreen, event-detail.tsx | §7.6 / §7.7 / §7.8 / §10 — vyřešeno | **PR2** ✅ |
| ~~9~~ | ~~Migrace `AuthContext` + `NotificationContext` do Zustand~~ — **hotovo (PR3)**: `stores/authStore.ts` + `stores/notificationStore.ts` (Zustand 5.0, `useShallow` drop-in wrappery `useAuth` / `useNotifications`, `persist` middleware → AsyncStorage pro notifikace). `AuthProvider` + `NotificationProvider` smazány z `_layout.tsx`, bootstrap přes `useAuthStore.getState().bootstrap()` v `useEffect`. | `stores/authStore.ts`, `stores/notificationStore.ts`, 8 callerů přesměrováno | §5.1 & §5.2 — vyřešeno | **PR3** ✅ |
| ~~6~~ | ~~Nainstalovat push SDK~~ — **hotovo (PR4)**: `expo-notifications@0.32.16`. FCM SDK se nepoužije (viz §0.1). `expo-application`, `expo-device`, `expo-secure-store` už byly. | `package.json` | — | **PR4** ✅ |
| ~~7~~ | ~~Zavolat `registerPush()` v `login()`, `unregisterPush()` v `logout()`~~ — **hotovo (PR4)**: zapojeno v `authStore.login` / `loginWithPin` / `bootstrap` (re-registrace při každém startu kvůli Expo token rotation) / `logout`. | `stores/authStore.ts`, `lib/push.ts` | §5.2 scaffold → live | **PR4** ✅ |
| ~~8~~ | ~~Napojit push foreground handler na `addNotification`~~ — **hotovo (PR4)**: `mountPushListeners(queryClient)` v `_layout.tsx`. Foreground listener zapíše do `notificationStore` + invaliduje příslušné query klíče podle `data.type`. Tap listener routuje přes `router.push(data.deepLink)`. | `lib/push.ts`, `_layout.tsx`, `stores/notificationStore.ts` | §5.2 dead export | **PR4** ✅ |
| **nové (PR4)** | **Backend: `ExpoPushClient`** a přepnutí `PushNotificationService` — mirror `FcmClient` interface (`isConfigured`, `sendToTokens`), batch ≤100 per request, detekce `DeviceNotRegistered` pro úklid mrtvých tokenů. `FcmClient` ponechán jako legacy. | `api/src/Service/Push/ExpoPushClient.php`, `api/config/services.yaml`, `PushNotificationService` | §0.1 blocker | **PR4** ✅ |
| **nové (PR4)** | **`app.json` plugin** — `expo-notifications` plugin s barvou pro Android notif ikonu. | `artifacts/mobile/app.json` | — | **PR4** ✅ |
| ~~11~~ | ~~Přidat tlačítka Check-in / Check-out v detailu eventu~~ — **hotovo (PR5)**: `<AttendanceActions>` v EventBody, toggle podle `myAttendanceStatus`, `useCheckInMutation` / `useCheckOutMutation` přes offline queue. | `hooks/mutations/useAttendance.ts`, `app/event-detail.tsx` | nová funkce | **PR5** ✅ |
| ~~12~~ | ~~Driver detail + status buttons (IN_PROGRESS / DONE)~~ — **hotovo (PR5)**: `<TransportStatusActions>` v TransportBody, `useTransportStatusMutation` přes offline queue. Přidáno do existujícího `event-detail.tsx` (nová route zbytečná). | `hooks/mutations/useTransportStatus.ts`, `app/event-detail.tsx` | nová funkce | **PR5** ✅ |
| ~~5~~ | ~~Přidat PIN login screen + ukládat PIN v SecureStore~~ — **částečně hotovo (PR5)**: `app/pin-unlock.tsx` přidaný s numerickým padem, routing gate redirectne sem když `fg.identifier` existuje. **PIN se lokálně neukládá** (review note §2.4: security downgrade) — posílá se na server při každém pokusu. `fg.pin` klíč zůstává rezervovaný pro budoucí Touch ID / bio-auth. | `app/pin-unlock.tsx`, `app/index.tsx`, `app/_layout.tsx`, `lib/secureStorage.ts` | nová funkce | **PR5** ✅ |
| ~~nové~~ | ~~**Offline write queue**~~ — **hotovo (PR5)**: `lib/writeQueue.ts` na AsyncStorage, flush při bootu + při online event (`onlineManager.subscribe`). `@react-native-community/netinfo` napojené na `onlineManager`. 4xx zahodí, 5xx / síťové retry. React Query invalidace po úspěšném replayi. | `lib/writeQueue.ts`, `app/_layout.tsx`, všechny tři mutation hooks | kritická pro řidiče v terénu | **PR5** ✅ |

> **Review note (bod 10, refetchInterval):** plán říkal "TanStack Query s
> `refetchInterval: 60_000`". To **není** ekvivalent dnešního `setInterval`.
> `setInterval` běží i když je app na pozadí (battery drain); `refetchInterval`
> je lepší, ale **pořád pinguje server každou minutu i když user screen nevidí**.
>
> Pravidlo `frontend-rules.md` §5.4 má záměrně **žádný `refetchInterval`**,
> jen `staleTime: 60s` + `focusManager` napojený na `AppState`. Efekt: data
> se refetchnou, **když user screen otevře** po víc než 60s, nebo se vrátí do
> appky po backgroundingu. Battery-friendly + data-plan-friendly. Bonus: push
> notifikace (PR4) mají invalidovat příslušné query klíče → uživatel uvidí
> real-time update i bez polling.
>
> Opravit v §3.4 a §3.5 podle tohoto vzoru.

---

## 5. Aktualizace `doc/architecture.md` — §11 údržba dokumentu

Když se změny aplikují (po PR v §0.3), updatujte tyto sekce `architecture.md`
podle jejího §11.1:

- **§2.1** — celá tabulka endpointů přepsat podle mapy výš; přibyl zápis
  (status transportu, checkin/checkout, device register) → §3 už nebude
  "Server state: Žádné"
- **§2.3** — přesun `@folklore_auth` do `expo-secure-store` (`fg.accessToken`
  + `fg.refreshToken`); přibude `fg.deviceId`, `fg.pin`
- **§3.3** — už není "Server state: Žádné" — mobilka píše (status,
  attendance, device register)
- **§4** — smazat `role-select.tsx`, přidat `pin-unlock.tsx` (PR5), případně
  `transport-detail.tsx` (PR5)
- **§5.1** — user shape rozšířit (`permissions`, `staffMemberId`,
  `transportDriverId`, `pinEnabled`), přidat `accessToken` + `refreshToken`
  odděleně (mimo user objekt, v SecureStore). Context → Zustand (PR3).
- **§5.2** — `addNotification()` teď volá push handler → smazat ⚠️ "nikde se
  nevolá" (PR4)
- **§7** — přepsat všechny screeny podle nových endpointů; přidat případnou
  novou `transport-detail.tsx`
- **§9** — design tokens zůstávají beze změny, pokud PR1-5 nesahají na styling

---

## 6. Riziková místa

1. **Device binding pro PIN** — pokud uživatel přehodí zařízení (nový telefon),
   PIN login selže. Admin musí v `/staff/:id/edit → Mobilní přístup` resetovat
   PIN (funguje, endpoint `DELETE /mobile-account/pin` je hotový).

2. **Refresh race condition** — pokud mobilka paralelně volá 5 requestů a
   všechny dostanou 401, chceme jeden refresh, ne pět. `apiClient.ts` v §3.3
   to řeší `refreshPromise` singletonem — **neodstraňovat**.

3. **Expo + Firebase config** — `@react-native-firebase/messaging` vyžaduje
   `expo-build-properties` plugin + `google-services.json` (Android) /
   `GoogleService-Info.plist` (iOS). **V Expo Go to nefunguje**, potřebuješ
   EAS Development Build. → Viz §0.1.

4. **iOS 26 NativeTabs** — zůstanou funkční, ale přepínání Staff/Driver tabů
   teď řeší `deriveRole(user)` místo manuální volby.

---

## 7. Minimální první krok

Pokud chceš jít po malých iteracích, doporučený postup (zpřesněno review):

1. **Den 1 — PR1:** SecureStore + apiClient + přepnout endpointy + zrušit
   `role-select` + smazat dead code (řádky checklistu 1, 2, 3, 4, 13, 14).
   Mobilka začne používat nový backend bez push a bez PIN. Zero UI change
   kromě zmizení role-select.
2. **Den 2 — PR2:** TanStack Query + focusManager (řádek 10 checklistu v
   opravené podobě, viz review note).
3. **Den 3 — PR3:** Zustand migrace (řádek 9).
4. **Den 4 — PR4:** Push (řádky 6, 7, 8) — **po rozhodnutí §0.1**. Tady padne
   Expo Go support a přepíše se `doc/local-dev.md`.
5. **Den 5 — PR5:** PIN login + check-in/out + transport status + offline
   write queue (řádky 5, 11, 12 + nový offline).

---

## 8. Review appendix — co plán dělá správně / co schází

### 8.1 ✅ Co zachovat beze změny

- **Singleton `refreshPromise`** v §3.3 — správné řešení race condition
- **Rotace refresh tokenu** — každý refresh = nový pár, starý zneplatněn
- **Device binding pro refresh token** — detekce odcizení
- **Hard logout na refresh fail** — předejde nekonečným loopům
- **`auth: false` flag** u `apiFetch` pro `/login`, `/refresh`
- **Pre-filtrování serverem** (staff vidí svoje, driver svoje) — odpadá
  klientský filtr i celý fallback
- **Typed list item shape** (§3.5, §3.6) — jasný kontrakt, lepší než dnešní
  `any[]` přes typový `.map()`

### 8.2 ⚠️ Co opravit v plánu před schválením

- **§0.1** — rozhodnout FCM vs Expo Notifications
- **§0.2** — rozhodnout, kdo vlastní `/api/mobile/*`
- **§0.3** — rozsekat na 5 PR
- **§3.3** — dodat event emitter / globální `onError` pro 401 hard logout →
  navigace na `/login`
- **§3.4 `logout()`** — extrahovat push odregistraci do `lib/push.ts`, ne
  dynamic import
- **§3.2 `getOrCreateDeviceId`** — použít `expo-crypto` `randomUUID`, ne
  `globalThis.crypto` + fallback
- **§2.1** — zvážit, co patří do JWT claims (rozbité token size + PII)
- **§2.2** — rozhodnout se jen pro vlastní UUID (ne `expo-application` IDs)
- **§2.3** — vyřešit kombinovanou roli (staff+driver) nebo ji out-of-scope v0.1
- **Checklist bod 10** — `staleTime` + `focusManager`, ne `refetchInterval`

### 8.3 ❓ Co plán neřeší a mělo by

- **Time zones** — event `startTime: "14:00"` bez TZ offset
- **Deep link schema** — `remoteMessage.data.deepLink` je string, ale jaký
  formát? `folklore://event/42`? Potřebuje `expo-router` linking config
- **Error message localization** — `throw new ApiError(401, "Session vypršela…")`
  v českém stringu. Když backend pošle anglickou zprávu, UI ji zobrazí. Buď
  i18n map, nebo kontrakt s backendem na chybové kódy + klientský mapping
- **Logging / crash reporting** — žádný Sentry, žádný Crashlytics. Při 5 PR
  změnách se nutně něco rozbije v produkci a bez telemetrie nebudeš vědět

### 8.4 ❗ Kritický scope-gap — offline write queue

Poprvé mobilka **zapisuje** (transport status, attendance). Reálný use case:

- Řidič v údolí / sklepě / podzemní garáži stiskne **DONE**.
- Zařízení offline → `fetch` throws → `ApiError` → "Chyba ukládání".
- Driver si musí pamatovat, že to má potvrdit, až bude online. Nepotvrdí.
- Admin neví, jestli je jízda DONE nebo se řidič jen odpojil.

**Minimum:**

```typescript
// lib/writeQueue.ts — pseudokód
type QueuedMutation = {
  id: string;             // uuid
  url: string;
  method: string;
  body: string;
  enqueuedAt: string;
};

// enqueue při offline → AsyncStorage (queue je tolerable unencrypted)
// flush při onlineManager.subscribe(online => online && flushQueue())
```

- Queue je v `AsyncStorage` (ne SecureStore — nejsou to secrets, a pokud
  mutace neprojde, backend ji stejně dostane později).
- Napojit na React Query `onlineManager` (už je v §5.4 rules zapnutý z
  `@react-native-community/netinfo`).
- UI feedback: transport card ukazuje "Čeká na synchronizaci" badge pro
  queued mutace, po flush zmizí.

**Bez tohohle je PR5 nedokončený — nenasazovat řidičům.**

---

## 9. Keeping this doc alive

Tenhle dokument je **proposal**, ne living doc jako `architecture.md`.
Životní cyklus:

- **v0.1 (teď)** — navrhnuto + reviewed. **Žádný kód**.
- **v0.2** — po rozhodnutí §0.1 a §0.2 se přepíše plán a review poznámky se
  vyřeší (smazat / zapracovat / označit jako accepted).
- **v1.0** — schválená finální verze, z níž se vybírá konkrétní PR scope.
- **Po merge každého PR (PR1…PR5)** — updatuj odpovídající sekce
  `doc/architecture.md` podle §11.1, a v tomto dokumentu **škrtni vyřešené**
  kroky checklistu (`~~Řádek 1: Nahradit AsyncStorage…~~`). Nikdy je nesmaž —
  historie implementace je cenná.
- **Po dokončení celé migrace** — dokument přesuň do `doc/archive/` nebo
  ponech jako `migration-mobile-backend.v1.0.md` a `doc/architecture.md` se
  stane zase single source of truth.
