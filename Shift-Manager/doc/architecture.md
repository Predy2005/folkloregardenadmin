# Architecture — Folklore Garden Mobile

> **Účel:** mapa, co se kde **načítá**, kde **zapisuje**, a jak jednotlivé komponenty
> spolupracují. Tohle je **živý dokument** — když přidáš screen, hook, context,
> AsyncStorage klíč, nebo endpoint, **musíš ho aktualizovat ve stejném PR**.
> Pravidla údržby jsou na konci (§11).
>
> **Rozsah:** `artifacts/mobile` (Expo RN appka). Backend `api-server` a web
> `mockup-sandbox` jsou oddělené — tenhle dokument je o mobilu.
>
> **Stav:** dokumentuje **reálný kód**, ne cíl. Místa, kde kód porušuje
> `doc/frontend-rules.md`, jsou označená **⚠️** pro budoucí refaktor.

---

## 1. High-level flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  app start                                                          │
│     │                                                               │
│     ▼                                                               │
│  _layout.tsx  ── loads fonts, mounts providers + triggers bootstrap:│
│     │            SafeAreaProvider → ErrorBoundary                   │
│     │            → QueryClientProvider (staleTime 60s, focusManager,│
│     │              onlineManager ← NetInfo)                         │
│     │            → GestureHandler + KeyboardProvider                │
│     │          useAuthStore.getState().bootstrap() ← hydrates       │
│     │            from SecureStore, volá /api/mobile/auth/me         │
│     │          notificationStore hydrates z AsyncStorage (persist   │
│     │            middleware) — bez provideru                        │
│     │          mountPushListeners(queryClient) ← foreground notifs  │
│     │            + tap deep-link + query invalidace                 │
│     │          flushQueue(queryClient) + setupOnlineFlush           │
│     │            ← offline write queue replay                       │
│     ▼                                                               │
│  app/index.tsx  ── routing gate, reads AuthContext                  │
│     │                                                               │
│     ├─ isLoading                   → ActivityIndicator              │
│     ├─ !user && fg.identifier      → Redirect /pin-unlock           │
│     ├─ !user                       → Redirect /login                │
│     └─ user && role                → Redirect /(tabs)               │
│                                │                                    │
│                                ▼                                    │
│                          (tabs)/index.tsx  ── switches by role:     │
│                              role === "driver" → DriverTransports   │
│                              else              → StaffEvents        │
│                                │                                    │
│                                ▼  useEvents / useTransports         │
│                                   (React Query, refetch-on-focus)   │
│                          apiFetch → Folklore Garden CRM             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data sources (odkud appka **čte**)

### 2.1 Externí REST API (Folklore Garden CRM — `/api/mobile/*`)

Base URL: **`artifacts/mobile/constants/api.ts`** — `API_BASE_URL`, default
`https://apifolklore.testujeme.online`, přebitelný přes `EXPO_PUBLIC_API_URL`.
Cesty jsou v **`constants/api.ts#MOBILE_PATHS`** — single source of truth,
nehardcoduj stringy.

Všechny autorizované requesty jdou přes **`apiFetch` z `@/lib/apiClient`**
(legacy `useApiConfig().apiFetch` na něj deleguje). `apiFetch`:
- automaticky přikládá `Authorization: Bearer <access>` z `SecureStore`
- při **401 zavolá `/api/mobile/auth/refresh`** a zopakuje request
- refresh je singleton (`refreshPromise` deduplikace paralelních 401s)
- když refresh selže, vyvolá `AuthenticationError` a přes
  `setSessionExpiredHandler` shodí `AuthContext.user` → routing gate redirectne na `/login`

Výjimky mimo `apiFetch`: `/auth/login`, `/auth/pin-login`, `/auth/logout` volá
**přímo `fetch`** z `AuthContext` (nemá ještě token / chce kontrolu nad
chybovou hláškou).

| Endpoint | Metoda | Volá | Účel | Shape |
|---|---|---|---|---|
| `/api/mobile/auth/login` | POST | `AuthContext.login()` | heslový login | `{identifier, password, deviceId}` → `{accessToken, refreshToken, accessTokenExpiresIn, refreshTokenExpiresAt, user}` |
| `/api/mobile/auth/pin-login` | POST | `AuthContext.loginWithPin()` | PIN login s device bindingem | `{identifier, pin, deviceId}` → stejný shape jako login |
| `/api/mobile/auth/refresh` | POST | `apiClient.doRefresh()` (auto) | rotace tokenů (access 2h / refresh 14d) | `{refreshToken, deviceId}` → nový pár |
| `/api/mobile/auth/logout` | POST | `AuthContext.logout()` | zneplatnění refresh tokenu na serveru | `{refreshToken}` → `{status}` |
| `/api/mobile/auth/me` | GET | `AuthContext.bootstrap()`, `reloadUser()` | user info + permissions pro derivaci UI role | → `MobileUser` (§5.1) |
| `/api/mobile/me/events` | GET | `useEvents()` ← `StaffEventsScreen` | seznam přiřazených eventů | → `{events: EventListItem[]}` (§8.1) |
| `/api/mobile/me/events/{id}` | GET | `useEvent(id)` ← `EventDetailScreen` (staff) | detail eventu, role-aware (tables/menu) | → `EventDetail` |
| `/api/mobile/me/transports` | GET | `useTransports()` ← `DriverTransportsScreen` | seznam jízd přihlášeného řidiče | → `{transports: TransportListItem[]}` (§8.2) |
| `/api/mobile/me/transports/{id}` | GET | `useTransport(id)` ← `EventDetailScreen` (driver) | detail jízdy | → `TransportDetail` |
| `/api/mobile/devices/register` | POST | `registerPush()` (po loginu/bootstrap) | upsert Expo push tokenu | `{fcmToken, platform, deviceId, deviceName?}` → `{status, device}` |
| `/api/mobile/devices/by-token` | DELETE | `unregisterPush()` (před logoutem) | smazání záznamu podle tokenu | `{fcmToken}` → `{status}` |

Seznam + detail čtení teče přes **React Query hooks** v `hooks/queries/`
(`useEvents.ts`, `useTransports.ts`). Screeny hook konzumují, nevolají
`apiFetch` přímo. Query keys v `hooks/queries/queryKeys.ts` (§6).

**Push notifikace.** Mobilka od PR4 registruje Expo push token přes
`POST /api/mobile/devices/register` po úspěšném loginu a po bootstrap
(token může Expo rotovat). Backend `App\Service\Push\PushNotificationService`
odesílá notifikace přes **Expo Push Service** (`https://exp.host/...`) —
rozhodnutí §0.1 v `migration-mobile-backend.md`.

**Poznámka — app má zápisy.** Od PR1 appka volá POST `/auth/*` (login flow),
od PR5 přibude `PUT /transports/{id}/status`, `POST /attendance/checkin|out`,
`POST /devices/register`. §3.3 je aktualizované.

### 2.2 Nominatim (geocoding)

| Endpoint | Volá | Použité k |
|---|---|---|
| `https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1` | `TransportMapScreen.geocodeAddress()` | převod textové adresy na `{lat, lon}` pro Leaflet marker |

Volá se s hlavičkou `User-Agent: FolkloreGardenApp/1.0` (Nominatim vyžaduje).
Není to náš API — je to veřejná instance OpenStreetMap.

### 2.3 Persistentní storage

Storage je rozdělený na dvě vrstvy — sensitive data jdou do SecureStore,
ostatní do AsyncStorage.

#### SecureStore (`expo-secure-store`) — `lib/secureStorage.ts`

Hardware-backed keychain (iOS) / EncryptedSharedPreferences (Android).
Klíče mají prefix `fg.` aby nekolidovaly s jinými apkami.

| Klíč | Shape | Kdo čte | Kdo zapisuje |
|---|---|---|---|
| `fg.accessToken` | JWT string (2h TTL) | `apiClient.apiFetch()` při každém requestu | `authStore.login/loginWithPin/refresh` |
| `fg.refreshToken` | opaque 128-hex string (14d TTL) | `apiClient.doRefresh()` | `authStore.login/loginWithPin/refresh` |
| `fg.deviceId` | UUID (stabilní per-install) | login endpointy, push register | `getOrCreateDeviceId()` lazy při prvním čtení |
| `fg.identifier` | string (e-mail/username naposled přihlášeného usera) | `app/index.tsx` routing gate, `/pin-unlock` | `authStore.login/loginWithPin` (po úspěchu); smaže `/pin-unlock` tlačítko "Jiný účet" |
| `fg.pin` | *(rezervováno — v PR5 se PIN neukládá lokálně; pin-unlock ho posílá na server při každém pokusu)* | — | — |

#### AsyncStorage (nechráněné)

| Klíč | Shape | Kdo čte | Kdo zapisuje |
|---|---|---|---|
| `@folklore_notifications` | `AppNotification[]` (JSON, max 50 položek) | `notificationStore` hydrace (persist middleware) | `notificationStore.addNotification / markAsRead / markAllAsRead / clearAll` |
| `@folklore_write_queue` | `QueuedMutation[]` (čekající zápisy z offline režimu) | `flushQueue()` (při bootu + při online event) | `enqueue()` v `lib/writeQueue.ts` (volané z mutation hooks při offline / 5xx) |

**Smazané klíče** (PR1 migration): `@folklore_auth` (token přesunut do SecureStore),
`@folklore_role` (role se derivuje z `user.roles` místo manuální volby).

**⚠️ Migrace:** `@folklore_auth` a `@folklore_role` v AsyncStorage se **nezachrání**
— po update na PR1 appka vyžaduje nový login. Akceptovatelné, protože backend
pro staré tokeny stejně nemá kompatibilní endpoint (`/auth/user` pro mobilku mrtvý).

### 2.4 Environment variables (read-only)

| Proměnná | Čteno kde | Účel |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `constants/api.ts` | override CRM URL (per-build staging/prod) |

Prefix `EXPO_PUBLIC_*` je pro Expo Babel plugin povinný — bez něj hodnota není
inlineovaná do bundle a na device je `undefined`.

---

## 3. Data sinks (kam appka **zapisuje**)

### 3.1 Persistent storage

Viz §2.3 — sloupec "Kdo zapisuje". SecureStore klíče (3 používané + 1
rezervovaný) + AsyncStorage 1 klíč (notifications).

### 3.2 In-memory state (Zustand stores)

- **authStore** (`stores/authStore.ts`) — `user`, `isLoading`. `role` se derivuje
  z `user.roles` přes `deriveUiRole()` (není to store field). Zápis přes
  akce `login()`, `loginWithPin()`, `logout()`, `reloadUser()`, `bootstrap()`.
  Čtenáři §5.1.
- **notificationStore** (`stores/notificationStore.ts`) — `notifications[]`,
  hydrace + persistence do AsyncStorage přes `zustand/middleware` `persist`.
  Zápis přes `addNotification / markAsRead / markAllAsRead / clearAll`.
  Čtenáři §5.2.

### 3.3 Server state (REST mutace)

Od PR1 appka zapisuje na server:
- `POST /api/mobile/auth/login`, `/pin-login`, `/logout` (auth flow)
- `POST /api/mobile/auth/refresh` (implicitně přes apiClient při 401)

Od PR4 přidáno:
- `POST /api/mobile/devices/register` — po loginu a po bootstrap (`lib/push.ts`)
- `DELETE /api/mobile/devices/by-token` — před logoutem (`lib/push.ts`)

Od PR5 přidáno:
- `PUT /api/mobile/me/transports/{id}/status` — driver tlačítka "Zahájit jízdu" / "Dokončit jízdu" (`hooks/mutations/useTransportStatus.ts`)
- `POST /api/mobile/me/attendance/checkin` / `/checkout` — staff tlačítko "Přihlásit se na akci" / "Odhlásit se z akce" (`hooks/mutations/useAttendance.ts`)

**Offline write queue.** Všechny tyto mutace jdou přes pattern "try direct →
fallback na `lib/writeQueue.ts` při offline nebo 5xx". 4xx se propíše jako
chyba do UI (retry by neprošel). Queue je v AsyncStorage (`@folklore_write_queue`)
a flushne se automaticky při online event (`onlineManager.subscribe`) a při
startu appky.

### 3.4 Navigation state

Router zápisy přes `expo-router` — viz tabulka screenů §7, sloupec "Navigates to".

---

## 4. Navigation tree (expo-router)

Routing je **file-based** pod `app/`. Každý soubor v `app/` **musí mít default
export** (pravidlo pro expo-router, výjimka z `import/no-default-export`).

```
app/
├── _layout.tsx              Stack + QueryClientProvider + bootstrap (§5)
├── index.tsx                routing gate (§7.1)
├── login.tsx                /login  (password)
├── pin-unlock.tsx           /pin-unlock  (PIN quick re-auth, PR5)
├── (tabs)/                  tab group (bottom tabs)
│   ├── _layout.tsx          Native/Classic tabs (iOS 26 Liquid Glass vs fallback)
│   ├── index.tsx            /(tabs) — home, role-switched content
│   └── profile.tsx          /(tabs)/profile
├── event-detail.tsx         /event-detail?id=<n>  (+ Check-in/out + transport status, PR5)
├── notifications.tsx        /notifications
├── transport-map.tsx        /transport-map?address=...&clientName=...
└── +not-found.tsx           404 fallback
```

---

## 5. Stores & state

### 5.1 `authStore` (`stores/authStore.ts`) — Zustand

**State shape:**
```ts
{
  user: MobileUser | null,       // viz MobileUser níže
  isLoading: boolean,
  // akce (každá je součástí store state, volají se přes store instance)
  login, loginWithPin, logout, reloadUser, bootstrap,
}

type MobileUser = {
  id: number;
  username: string;
  email: string;
  roles: string[];               // "STAFF_WAITER" | "STAFF_COOK" | "STAFF_DRIVER" [+admin role]
  permissions: string[];         // granular klíče (mobile_events.read, …)
  isSuperAdmin?: boolean;
  pinEnabled?: boolean;
  staffMemberId?: number | null;
  staffMemberName?: string | null;
  transportDriverId?: number | null;
  transportDriverName?: string | null;
}

type UiRole = "staff" | "driver" | null;  // derivované přes deriveUiRole(user.roles)
```

**Akce:**
- `login(identifier, password)` — POST `/api/mobile/auth/login` s `{identifier, password, deviceId}`. Vrátí access+refresh token + user. Tokeny do SecureStore (`fg.accessToken`, `fg.refreshToken`).
- `loginWithPin(identifier, pin)` — POST `/api/mobile/auth/pin-login` s `{identifier, pin, deviceId}`. První úspěch na zařízení naváže PIN k tomuto `deviceId`.
- `logout()` — POST `/api/mobile/auth/logout` s refreshToken, pak SecureStore cleanup (mimo PIN — ten se rušit ručně z CRM).
- `reloadUser()` — GET `/api/mobile/auth/me`, obnoví user state (užitečné po reconnect nebo changed permissions).
- `bootstrap()` — volá se jednou z `app/_layout.tsx` `useEffect`. Přečte `fg.accessToken`, ověří přes `/me`, nastaví `isLoading: false`.

**Hydration:** `_layout.tsx` volá `useAuthStore.getState().bootstrap()` v
`useEffect` (jednorázově). Pokud access token prošel, `apiClient` automaticky
zkusí refresh; pokud i refresh selže, `setSessionExpiredHandler` (nastavuje
se na module load) vyvolá `useAuthStore.setState({ user: null })` → routing
gate jde na /login.

**Čtenáři (`useAuth()` drop-in selector s `useShallow`):**

| Kde | Co čte | Co zapisuje |
|---|---|---|
| `app/index.tsx` | `user`, `role`, `isLoading` | — |
| `app/login.tsx` | `login` | volá `login()` |
| `app/(tabs)/_layout.tsx` | `role` | — |
| `app/(tabs)/index.tsx` | `role` | — |
| `app/(tabs)/profile.tsx` | `user`, `role`, `logout` | volá `logout()` |
| `app/event-detail.tsx` | `role` (pro type derivaci) | — |

**Pozn.:** `useAuth()` je zachovaná jako drop-in wrapper přes
`useShallow((s) => { user, role, isLoading, login, … })`. Pro granulárnější
selektory lze sahat přímo na `useAuthStore((s) => s.user)`.

`useApiConfig()` už nepotřebuje `user` — token čte `apiClient` přímo ze
SecureStore.

### 5.2 `notificationStore` (`stores/notificationStore.ts`) — Zustand + persist

**State shape:**
```ts
{
  notifications: AppNotification[],    // perzistuje, max 50
  addNotification, markAsRead, markAllAsRead, clearAll,
}

type AppNotification = {
  id: string,           // timestamp + random, generováno lokálně
  title: string,
  body: string,
  type: "event_change" | "event_cancel" | "event_add" | "transport_change" | "transport_cancel",
  timestamp: string,    // ISO
  read: boolean,
  data?: Record<string, unknown>,
}
```

`unreadCount` je derived — počítá se v `useNotifications()` wrapperu, není
v store state (žádná duplikovaná pravda).

**Akce:**
- `addNotification(partial)` — doplní `id`, `timestamp`, `read: false`, prepend, slice(0, 50)
- `markAsRead(id)` — flip `read: true`
- `markAllAsRead()` — všechny `read: true`
- `clearAll()` — zahodí pole

**Hydration + persistence:** `zustand/middleware` `persist` middleware s
`createJSONStorage(() => AsyncStorage)`, klíč `@folklore_notifications`
(stejný jako v předchozí Context verzi — zachovává notifikace z build-to-build).
`partialize` omezuje persist jen na pole `notifications` (akce jsou funkce,
ty nepersistujeme).

**Čtenáři (`useNotifications()` drop-in selector):**

| Kde | Co čte | Co zapisuje |
|---|---|---|
| `components/NotificationBell.tsx` | `unreadCount` | — (naviguje na `/notifications`) |
| `app/notifications.tsx` | `notifications`, `unreadCount`, `markAsRead`, `markAllAsRead` | volá `markAsRead()`, `markAllAsRead()` |
| `app/(tabs)/profile.tsx` | `unreadCount`, `clearAll` | volá `clearAll()` |

**Hook na push:** `addNotification()` volá `lib/push.ts`
`mountPushListeners` → `addNotificationReceivedListener` když přijde
foreground push. `mapPushType(data.type)` překládá backend typ
(`staff_assignment`, `transport_cancelled`, …) na `AppNotification["type"]`.
Tap na notifikaci (i z backgroundu) routuje přes `router.push(data.deepLink)`
— viz §6 `lib/push.ts`.

---

## 6. Hooks

| Hook | Soubor | Vstup | Výstup | Účel |
|---|---|---|---|---|
| `useAuthStore` | `stores/authStore.ts` | — | Zustand `AuthState` | přímý store hook, vhodný pro granulární selectory (`useAuthStore((s) => s.user)`). |
| `useAuth` | `stores/authStore.ts` | — | `{ user, role, isLoading, login, loginWithPin, logout, reloadUser }` (drop-in shape přes `useShallow`) | legacy wrapper, zachovává API původního Contextu. |
| `useNotificationStore` | `stores/notificationStore.ts` | — | Zustand `NotificationState` | přímý store hook. |
| `useNotifications` | `stores/notificationStore.ts` | — | `{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }` (drop-in shape přes `useShallow`) | legacy wrapper. `unreadCount` je derived. |
| `useColors` | `hooks/useColors.ts` | — | design tokens (barvy + `radius`) podle `useColorScheme()` | theme access, fallback na `colors.light` pokud `dark` paleta chybí ⚠️ (`constants/colors.ts` `dark` nemá) |
| `useApiConfig` | `hooks/useApiConfig.ts` | — | `{ apiFetch, baseUrl }` | **Legacy wrapper.** Deleguje na `lib/apiClient.apiFetch`. Nový kód by měl importovat přímo z `@/lib/apiClient`. |
| `useEvents` | `hooks/queries/useEvents.ts` | — | `UseQueryResult<EventListItem[]>` | React Query seznam akcí (GET `/api/mobile/me/events`). Klíč `eventKeys.list()`. |
| `useEvent` | `hooks/queries/useEvents.ts` | `id: number \| string \| undefined` | `UseQueryResult<EventDetail>` | Detail akce (GET `/api/mobile/me/events/{id}`). `enabled` podle id. Klíč `eventKeys.detail(id)`. |
| `useTransports` | `hooks/queries/useTransports.ts` | — | `UseQueryResult<TransportListItem[]>` | React Query seznam jízd (GET `/api/mobile/me/transports`). Klíč `transportKeys.list()`. |
| `useTransport` | `hooks/queries/useTransports.ts` | `id: number \| string \| undefined` | `UseQueryResult<TransportDetail>` | Detail jízdy (GET `/api/mobile/me/transports/{id}`). Klíč `transportKeys.detail(id)`. |
| `useTransportStatusMutation` | `hooks/mutations/useTransportStatus.ts` | `{ id, status: "IN_PROGRESS" \| "DONE" }` | `UseMutationResult<{queued: boolean}>` | Driver tlačítka v TransportBody. Online → přímý PUT; offline / 5xx → `writeQueue.enqueue`. Invaliduje `transportKeys.detail(id)` + `.lists()`. |
| `useCheckInMutation` | `hooks/mutations/useAttendance.ts` | `eventId: number` | `UseMutationResult<{queued: boolean}>` | Staff Check-in v EventBody. Stejný pattern. Invaliduje `eventKeys.detail(id)` + `.lists()`. |
| `useCheckOutMutation` | `hooks/mutations/useAttendance.ts` | `eventId: number` | `UseMutationResult<{queued: boolean}>` | Staff Check-out v EventBody. Stejný pattern. |

**Query keys** v `hooks/queries/queryKeys.ts` (factory `eventKeys` + `transportKeys`
dle `frontend-rules.md` §5.2). Pro invalidace vždy přes factory, ne přes string
literály.

**QueryClient defaults** v `app/_layout.tsx`: `staleTime: 60s`, `gcTime: 10 min`,
`retry: 1`, `refetchOnReconnect: true`, `refetchOnWindowFocus: false` +
`focusManager` napojený na `AppState` (refetch při návratu do appky) +
`onlineManager` napojený na `@react-native-community/netinfo` (online/offline
state pro React Query i pro `lib/writeQueue`).

**Offline write queue** v `lib/writeQueue.ts` (PR5):
- `enqueue(mutation)` — přidá `QueuedMutation` do `AsyncStorage` klíče
  `@folklore_write_queue`. Každá položka má `path`, `method`, `body`, `label`
  (pro UI badge) a `invalidateKeys` (React Query klíče pro post-replay invalidaci).
- `flushQueue(queryClient)` — přehraje čekající zápisy přes `apiFetch`. 4xx
  zahodí (server odmítl, retry nic nepomůže), 5xx / síťové ponechá.
- `setupOnlineFlush(queryClient)` — subscribe na `onlineManager` → flush při
  obnovení signálu. Vrací unsubscribe.
- `flushQueue()` se navíc spouští jednou při bootu v `_layout.tsx` (pokryje
  pády / killy appky v offline stavu).

**Push modul** v `lib/push.ts` (PR4):
- `registerPush()` — volá `authStore.login/loginWithPin/bootstrap`. Request permission → `Notifications.getExpoPushTokenAsync({ projectId })` → `POST /api/mobile/devices/register`. Tolerantní: v Expo Go bez EAS projectId / na emulátoru / při denied perm vrátí `null` bez trhání loginu.
- `unregisterPush()` — volá `authStore.logout` ještě před zneplatněním access tokenu. `DELETE /api/mobile/devices/by-token`. Tolerantní k chybám (offline, už smazaný token).
- `mountPushListeners(queryClient)` — volá `_layout.tsx` v `useEffect`. Foreground listener zapisuje do `notificationStore.addNotification` + invaliduje příslušné React Query klíče (podle `data.type`). Tap listener routuje přes `router.push(data.deepLink)` — fallback na `/event-detail?id=...&type=...`.
- `Notifications.setNotificationHandler` nastaveno na module load — ukazuje banner + zvuk i ve foreground.

**Smazané hooks** (PR1): `hooks/useAuth.ts` — byl duplikát re-exportu.

---

## 7. Screens

Formát tabulky pro každý screen: **Reads** / **Writes** / **Navigates to** /
**Renders**.

### 7.1 `app/index.tsx` — routing gate

| | |
|---|---|
| Route | `/` |
| Purpose | rozhodne, kam redirectnout po bootu |
| Reads | `useAuth()` → `user`, `role`, `isLoading`; `useColors()` |
| Writes | — |
| Navigates to | `/login` (nemá user) \| `/(tabs)` (má user a roli) |
| Renders | `ActivityIndicator` při boot, nebo `Redirect`, nebo fallback „Účet bez mobilní role" když `role === null` (user nemá žádnou z STAFF_WAITER/COOK/DRIVER) |

### 7.2 `app/login.tsx` — přihlašovací obrazovka

| | |
|---|---|
| Route | `/login` |
| Purpose | e-mail + heslo → access+refresh token pár |
| Reads | `useAuth()`; `useColors()`; local `useState` pro form ⚠️ (§7 pravidel — má být RHF+Zod, plán PR?) |
| Writes | local form state; volá `auth.login(identifier, password)` (identifier = e-mail nebo username). `authStore.login` sám persistuje `fg.identifier` pro pozdější `/pin-unlock`. |
| Navigates to | `router.replace("/(tabs)")` po úspěchu |
| Renders | custom `TextInput` (ne `ui/Input` — neexistuje) |
| Side effects | `Haptics.notificationAsync` (success/error feedback) |

### 7.3 `app/pin-unlock.tsx` — rychlý PIN re-auth (PR5)

| | |
|---|---|
| Route | `/pin-unlock` |
| Purpose | Když session propadla a ve SecureStore je `fg.identifier`, user zadá 4-místný PIN místo hesla. Backend ověří přes `POST /api/mobile/auth/pin-login`. |
| Reads | `secureGet("identifier")` (pokud chybí → `/login`); `useAuthStore.loginWithPin` |
| Writes | PIN se NEukládá lokálně (posílá se na server při každém pokusu); `authStore.loginWithPin` po úspěchu persistuje tokeny + znovu zapíše identifier |
| Navigates to | `/(tabs)` po úspěchu; `/login` přes link "Přihlásit heslem" nebo "Jiný účet" (ten smaže `fg.identifier`) |
| Renders | 4× dots + numerický keypad + error string; automatický submit po 4. znaku |
| Side effects | `Haptics.selectionAsync` per digit, `Haptics.notificationAsync` success/error |
| Omezení | Ve PR5 NEukládáme PIN lokálně (`fg.pin` zůstává rezervovaný). Budoucí iterace může přidat Touch ID / local cache pro offline unlock. |

### 7.4 `app/(tabs)/_layout.tsx` — tab shell

| | |
|---|---|
| Route | `/(tabs)` (group) |
| Purpose | bottom tabs (Home + Profile), role-aware ikony/titulky |
| Reads | `useAuth().role`; `isLiquidGlassAvailable()` pro iOS 26+ native tabs |
| Writes | — |
| Renders | `NativeTabs` (iOS 26+) nebo `Tabs` s BlurView (iOS) / plain bg (Android/web) |

### 7.5 `app/(tabs)/index.tsx` — home tab

| | |
|---|---|
| Route | `/(tabs)` |
| Purpose | vrstva, která rozhodne, kterou screen komponentu zobrazit |
| Reads | `useAuth().role` |
| Writes | — |
| Renders | `<DriverTransportsScreen />` nebo `<StaffEventsScreen />` |

### 7.6 `screens/StaffEventsScreen.tsx` — seznam akcí (Personál)

| | |
|---|---|
| Purpose | seznam přiřazených eventů pro personál s filtrem podle stavu |
| Reads | `useEvents()` (§6) — React Query, klíč `eventKeys.list()`. Local state jen pro `filter`. |
| Writes | — (pull-to-refresh volá `refetch()`) |
| Navigates to | `/event-detail?id=<n>&type=event` |
| Renders | `EventCard` (shape `EventListItem`), `EmptyState`, `NotificationBell`, filter chips |
| Refetch strategie | `staleTime: 60s` + `focusManager` — refetchne se při návratu do appky (po 60s+ idle) nebo na pull-to-refresh. Žádné background polling, baterie friendly. |
| Filter options | `"all" \| "CONFIRMED" \| "PLANNED" \| "IN_PROGRESS" \| "CANCELLED"` (synced s Event.status) |
| Řazení | rozděluje události na "Nadcházející" (`date >= today 00:00`) a "Minulé" |

### 7.7 `screens/DriverTransportsScreen.tsx` — seznam přeprav (Dopravce)

| | |
|---|---|
| Purpose | seznam jízd pro přihlášeného řidiče |
| Reads | `useTransports()` (§6) — React Query, klíč `transportKeys.list()`. Backend filtruje podle `user.transportDriverId`. |
| Writes | — (pull-to-refresh volá `refetch()`) |
| Navigates to | `/event-detail?id=<eventTransportId>&type=transport`; `/transport-map?address=<pickup OR dropoff>&clientName=<eventName>` |
| Renders | `TransportCard` (shape `TransportListItem`) |
| Refetch strategie | `staleTime: 60s` + `focusManager` (stejně jako Staff). |
| View mode | `"upcoming"` (default) vs `"all"` |
| Odstraněný fallback | Předchozí verze používala `/api/reservations` filtr. Backend teď drží data v `EventTransport` entity, žádný fallback nepotřebujeme. |

### 7.8 `app/event-detail.tsx`

| | |
|---|---|
| Route | `/event-detail?id=<n>&type=event\|transport` |
| Purpose | role-aware detail — pro staff zobrazuje EventDetail, pro drivera TransportDetail |
| Type derivace | Explicitní přes `?type` query param; fallback odvozen z `useAuth().role` (driver → transport, jinak event) |
| Reads | `useEvent(id)` nebo `useTransport(id)` (§6) — zapnutá jen ta query, která odpovídá `detailType`; druhá má `enabled: false`. Klíče `eventKeys.detail(id)` / `transportKeys.detail(id)`. |
| Writes (PR5) | `EventBody` renderuje `<AttendanceActions>` → `useCheckInMutation` / `useCheckOutMutation` (toggle podle `myAttendanceStatus`). `TransportBody` renderuje `<TransportStatusActions>` → `useTransportStatusMutation` (button podle `executionStatus`: null → IN_PROGRESS, IN_PROGRESS → DONE, DONE → disabled panel). Obě cesty jdou přes offline write queue. |
| Navigates to | `router.back()` |
| Renders | Dvě body komponenty (`EventBody`, `TransportBody`) podle `detailType`, action button sekce. |
| ⚠️ | Soubor má 600+ řádků (přes §1.1 frontend-rules limit 300). Refaktor na sub-komponenty (`components/AttendanceActions.tsx`, `components/TransportStatusActions.tsx`) je evidentní kandidát na čištění. |

### 7.9 `app/notifications.tsx`

| | |
|---|---|
| Route | `/notifications` |
| Purpose | seznam in-app notifikací |
| Reads | `useNotifications()` → `notifications`, `unreadCount`, `markAsRead`, `markAllAsRead` |
| Writes | volá `markAsRead(id)` při tapu na položku, `markAllAsRead()` při tapu na "Vše přečteno" |
| Navigates to | `router.back()` |
| Renders | `FlatList` položek, `EmptyState` když prázdné |

### 7.10 `app/transport-map.tsx`

| | |
|---|---|
| Route | `/transport-map?address=...&clientName=...` |
| Purpose | mapa cíle přepravy (Leaflet ve WebView) |
| Reads | `useLocalSearchParams<{address, clientName}>()`; **Nominatim** pro geocoding; local `geoResult`, `loading`, `geoError` |
| Writes | local state |
| Navigates to | `router.back()`; externí: `Linking.openURL` do Maps (iOS `maps://`, Android `geo:`, web Google Maps) |
| Renders | `WebView` s šablonovaným HTML + Leaflet JS/CSS z CDN |
| Bezpečnost | ⚠️ `buildMapHtml()` vkládá `label` do WebView přes `JSON.stringify` (ochrana), ale `lat`/`lon` jako raw čísla z Nominatim. Pravidlo §18.7 ve frontend-rules vyžaduje kompletní escape všech dynamických hodnot. |

### 7.11 `app/(tabs)/profile.tsx`

| | |
|---|---|
| Route | `/(tabs)/profile` |
| Purpose | uživatelská karta + nastavení (logout / smazat oznámení) |
| Reads | `useAuth()` → `user`, `role`, `logout`; `useNotifications()` → `unreadCount`, `clearAll`; `getUiRoleLabel(role, user.roles)` z `lib/mobileRoles` |
| Writes | volá `logout()`, `clearAll()` |
| Navigates to | `/login` (replace po logoutu), `/notifications` (push) |
| Renders | user card, settings group s `SettingsRow` (inline helper komponenta) |
| Odstraněno | Tlačítko "Přepnout roli" — role už není manuální |

### 7.12 `app/+not-found.tsx`

Standardní 404 screen. Expo Router convention.

---

## 8. Komponenty

### 8.1 `components/EventCard.tsx`

| | |
|---|---|
| Props | `{ event: EventListItem, onPress?: () => void }` |
| Exports | named `EventCard`, type `EventListItem` (+ deprecated alias `Event`) |
| Reads | `useColors()` |
| Writes | — (dostává `onPress` callback) |
| Shape | `{eventId, name, eventType, date, startTime, durationMinutes, venue, language, guestsTotal, status, myAssignmentId, myAttendanceStatus, myAttendedAt}` — zrcadlí `App\Service\MobileDataService::serializeEventListItem()` |
| Zobrazuje | datum + čas v boxu, název eventu, status badge, "Check-in hotový" pill při `myAttendanceStatus === "PRESENT"`, guestsTotal, venue, language |
| Použito | `StaffEventsScreen` |

### 8.2 `components/TransportCard.tsx`

| | |
|---|---|
| Props | `{ transport: TransportListItem, onPress?: () => void, onMapPress?: () => void }` |
| Exports | named `TransportCard`, type `TransportListItem` (+ deprecated alias `Transport`) |
| Reads | `useColors()` |
| Writes | — |
| Shape | `{id, eventId, eventName, eventDate, eventStartTime, venue, transportType, scheduledTime, pickupLocation, dropoffLocation, passengerCount, executionStatus, notes, vehicle}` |
| Zobrazuje | datum v boxu, název eventu, status badge (`IN_PROGRESS` / `DONE` / `Naplánováno`), pickup nebo dropoff lokace, passengerCount, transport type label, SPZ vozidla |
| Použito | `DriverTransportsScreen` |

### 8.3 `components/NotificationBell.tsx`

| | |
|---|---|
| Props | — |
| Reads | `useNotifications().unreadCount`; `useColors()`; `useRouter()` |
| Writes | `router.push("/notifications")` |
| Zobrazuje | ikona zvonku s červeným badgem (počet ≤ 9, jinak "9+") |
| Použito | `StaffEventsScreen` header |

### 8.4 `components/EmptyState.tsx`

| | |
|---|---|
| Props | `{ icon: Feather.glyphMap key, title: string, subtitle?: string }` |
| Reads | `useColors()` |
| Použito | `StaffEventsScreen`, `DriverTransportsScreen`, `app/notifications.tsx` |

### 8.5 `components/ErrorBoundary.tsx` + `components/ErrorFallback.tsx`

| | |
|---|---|
| Props | `{ FallbackComponent?, onError?, children }` |
| Typ | **class component** (React lifecycle pro error catching) |
| Použito | `app/_layout.tsx` kolem celé appky (top-level) |
| **⚠️ Porušuje §8.1** | pravidlo říká error boundary **per route**, tohle je jedna globální — pád jedné obrazovky shodí celou appku |

### 8.6 `components/KeyboardAwareScrollViewCompat.tsx`

Wrapper nad `react-native-keyboard-controller`. 29 řádků, detaily
nedokumentované (použito v loginu, ale aktuální `login.tsx` používá přímo
`KeyboardAvoidingView` — zkontrolovat, jestli wrapper není dead code).

---

## 9. Design tokens (`constants/colors.ts`)

**Shape:** `{ light: {...barvy}, radius: 12 }` — **pouze `light` paleta**,
`dark` chybí. `useColors()` bezpečně fallbackuje.

**Klíče:** `text, tint, background, foreground, card, cardForeground, primary,
primaryForeground, secondary, secondaryForeground, muted, mutedForeground,
accent, accentForeground, destructive, destructiveForeground, border, input,
warning, warningForeground, info, infoForeground, success, successForeground`.

**⚠️ Pravidlo §6.1 vyžaduje** v `src/theme/tokens.ts`: `light` + `dark` +
`spacing` + `radii` + `typography` + `shadows`. Aktuální soubor je zárodek —
chybí dark a nemá spacing/typography tokeny.

---

## 10. Nepoužité / scaffold

Věci, které v projektu jsou, ale **nic je nevolá**:

- **`App\Service\Push\FcmClient`** v backendu — ponechaný jako legacy pro
  případ, že by se někdy vracelo k FCM direct. `PushNotificationService`
  ho dnes neinjectuje (používá `ExpoPushClient`). Kandidát na smazání
  po 1–2 týdnech stabilního provozu Expo push.

**Vyřešeno PR1:**
- ~~`hooks/useAuth.ts` duplikát~~ → smazáno
- ~~`/role-select.tsx` a manuální role volba~~ → smazáno, role derivace z `user.roles`

**Vyřešeno PR2:**
- ~~`QueryClientProvider` bez `useQuery`/`useMutation`~~ → `useEvents`/`useEvent`/
  `useTransports`/`useTransport` v `hooks/queries/` (§6)
- ~~`setInterval(..., 60_000)` v `StaffEventsScreen` + `DriverTransportsScreen`~~
  → `staleTime: 60s` + `focusManager` na `AppState` (§5.4 frontend-rules)

**Vyřešeno PR3:**
- ~~`AuthContext` + `NotificationContext` (React Context)~~ → `authStore` +
  `notificationStore` (Zustand, §5.1 / §5.2)
- ~~Import `AppState, Platform` v `NotificationContext.tsx:3`~~ → celý soubor
  smazán
- ~~`AuthProvider` + `NotificationProvider` wrappery v `_layout.tsx`~~ →
  store hooks nepotřebují provider, hydrace přes `bootstrap()` volaný
  v `useEffect` + `persist` middleware

**Vyřešeno PR4:**
- ~~`addNotification()` dead export~~ → napojený na
  `Notifications.addNotificationReceivedListener` v `lib/push.ts`
- ~~blocker §0.1 `migration-mobile-backend.md`: FCM direct vs Expo~~ → rozhodnutí
  **Expo Notifications**, backend `ExpoPushClient` + `services.yaml` přepojené,
  mobilka `expo-notifications` + `lib/push.ts`
- ~~PR4 body 6, 7, 8 checklistu~~ → všechny hotové (viz `migration-mobile-backend.md`)

**Vyřešeno PR5:**
- ~~`onlineManager` + `@react-native-community/netinfo` chybí~~ → nainstalováno,
  wire v `_layout.tsx`
- ~~Offline write queue chybí~~ → `lib/writeQueue.ts` (AsyncStorage backed,
  flush při bootu + na online event, 4xx zahodí, 5xx retry)
- ~~Transport status IN_PROGRESS/DONE UI chybí~~ → `useTransportStatusMutation`
  + `<TransportStatusActions>` v TransportBody
- ~~Check-in / Check-out UI chybí~~ → `useCheckInMutation` / `useCheckOutMutation`
  + `<AttendanceActions>` v EventBody
- ~~`app/pin-unlock.tsx` chybí~~ → přidáno, routing gate redirectne na něj
  když `!user && fg.identifier` existuje
- ~~`fg.identifier` SecureStore klíč~~ → přidáno, persistuje se v
  `authStore.login` / `loginWithPin`
- ~~PR5 body 5, 11, 12 + "nové: offline queue" checklistu~~ → všechny hotové

---

## 11. Keeping this doc alive — pravidla údržby

**Tento dokument je tak užitečný, jak je aktuální. Drž ho jako test, ne jako README.**

### 11.1 Kdy UPDATE povinný (ve stejném PR jako kód)

| Udělal jsi | Updatuj |
|---|---|
| Přidal/smazal endpoint v kódu | §2.1 (source table) a příslušný screen v §7 |
| Přidal/smazal AsyncStorage klíč | §2.3 + §3.1 + context/store v §5 |
| Přidal nový screen v `app/` | §4 (tree), nová sekce v §7 |
| Přidal komponentu v `components/` | §8 |
| Přidal hook v `hooks/` | §6 |
| Přidal context nebo Zustand store | §5 |
| Změnil shape auth usera / notifikace | §5.1 / §5.2 |
| Přidal env var | §2.4 |
| Přidal externí službu (jako Nominatim) | §2.2 |
| Opravil jedno z **⚠️** | smaž **⚠️** řádek / odstavec |

### 11.2 Kdy update NENÍ potřeba

- Přejmenování proměnné / refaktor uvnitř jednoho souboru bez změny kontraktu
- Oprava stylingu, layoutu, textů v UI
- Formátování, typing hints, unused imports cleanup
- Package version bump (pokud se nemění chování)

### 11.3 Jak poznat, že dokument lže

Rychlý audit (pár minut):
1. `grep -rn "AsyncStorage.setItem\|AsyncStorage.getItem" artifacts/mobile --include="*.ts" --include="*.tsx"` — porovnej s §2.3 / §3.1
2. `grep -rn "apiFetch\|fetch(" artifacts/mobile --include="*.ts" --include="*.tsx" | grep -v node_modules` — porovnej s §2.1
3. `ls artifacts/mobile/app artifacts/mobile/screens artifacts/mobile/components` — porovnej s §4, §7, §8
4. `grep -rn "createContext\|zustand" artifacts/mobile` — porovnej s §5

Pokud audit odhalí rozdíl, **neaktualizuj jen dokument** — ptej se, jestli kód
náhodou nedělá něco, co neměl. Dokument je tichý reviewer.

### 11.4 Claude rule

Když tě uživatel požádá o refaktor/feature:
1. Přečti tento dokument **před zásahem** — ať víš, co bude tvou změnou zasažené.
2. Po zásahu **updatuj odpovídající sekce** (viz §11.1) ve stejném commit/diffu.
3. Pokud commit neobsahuje update tohoto dokumentu a změnu v §11.1 tabulce, je
   to vada PR — zmiň to uživateli.
