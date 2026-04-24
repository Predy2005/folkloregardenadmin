# Frontend Code Standards – Folklore Garden Mobile

Pravidla, která Claude v PhpStormu **musí** dodržovat při psaní React Native (Expo) kódu
pro `artifacts/mobile`. Každé pravidlo má důvod – není to buzerace, je to prevence chaosu.

**Princip:** čitelnost > chytrost, opakování jednou je lepší než špatná abstrakce, striktní typy přes všechno.

> **Rozsah.** Tenhle dokument je autoritou pro `artifacts/mobile` (Expo SDK 54, React Native 0.81,
> React 19.1, expo-router). Webový playground `artifacts/mockup-sandbox` (Vite + React + Tailwind + shadcn/ui)
> má vlastní odbočky označené **[WEB]**. Backend `artifacts/api-server` (Express) a `lib/*` balíčky
> se řídí obecnými TypeScript a import pravidly (§1.4, §2, §11, §12, §14), zbytek se na ně nevztahuje.

---

## 1. Strukturální pravidla (neporušitelná)

### 1.1 Velikost souborů

- **Komponenta max 300 řádků.** Pokud roste nad 200, začni rozdělovat. Nad 300 = refaktor povinný.
- **Hook max 150 řádků.** Většina by měla být pod 80.
- **Soubor s utility max 200 řádků.** Nad to = rozděl podle domény.
- **StyleSheet blok max 100 řádků.** Pokud styly rostou víc, vytáhni je do `ComponentName.styles.ts` sourozence.

**Jak rozdělit velkou komponentu:**
1. Vytáhnout sub-komponenty (malé, čistě prezentační)
2. Vytáhnout custom hook pro logiku (`useEventRegistration`, `useFilters`)
3. Vytáhnout types a konstanty do sourozeneckých souborů
4. Vytáhnout `StyleSheet.create(...)` do `.styles.ts` sourozence, pokud přesahuje 100 řádků
5. Pokud je obří i po tomhle – feature je moc velká, rozděl feature

### 1.2 Pravidlo kolokace

Vše, co souvisí s feature, je v té feature složce. Nesdílené typy, konstanty, testy, sub-komponenty bydlí **vedle** svojí komponenty:

```
features/events/
  StaffEventsScreen.tsx
  StaffEventsScreen.test.tsx      ← kolokace testů, ne samostatná __tests__ složka
  components/
    EventCard.tsx
    EventCard.styles.ts           ← styly specifické pro tuto komponentu
    EventFilters.tsx
    EventFilters.types.ts         ← typy specifické jen pro tuto komponentu
  hooks/
    useStaffEvents.ts
  utils/
    filterEvents.ts
```

**Nesdílené věci zůstávají feature-local.** Až tehdy, kdy druhý feature potřebuje to samé, přesuň do `src/shared/` nebo `src/lib/`. Ne dřív.

### 1.3 Shared vs feature-local (struktura `artifacts/mobile/`)

```
app/                 ← expo-router routes (file-based). Každý soubor MUSÍ mít default export.
  _layout.tsx        ← root layout (Stack, providery)
  (tabs)/            ← tab group
  login.tsx
  event-detail.tsx   ← detail routes
src/
  api/               ← HTTP klient, endpointy, API typy; obalení @workspace/api-client-react
  components/
    ui/              ← primitivní stavební bloky (Button, Card, Input, Badge...) – náš "shadcn pro RN"
    shared/          ← projektové komponenty použité >2 feature (EmptyState, NotificationBell)
  features/          ← business features (events, transports, auth, notifications)
  hooks/             ← hooks použité >2 feature (useDebounce, useColors, useHaptics)
  lib/               ← čisté utility bez závislosti na React/RN (formatDate, parseError, geo)
  stores/            ← Zustand stores (auth, ui, notifications)
  theme/             ← design tokens (colors, spacing, typography, radii)
  types/             ← globální TypeScript typy
```

> **Migrace.** Aktuální repo má `components/`, `context/`, `hooks/`, `screens/` na kořeni `artifacts/mobile/`.
> Cílový stav je `src/...` podle tabulky výš. Alias `@/*` zůstane — jen se přesměruje na `./src/*`.

**Pravidlo 2+:** dokud komponentu/hook/utility nepoužívá alespoň **dvě různé features**, zůstává ve své feature složce. Neslabuj `src/components/shared/` ani `src/hooks/` spekulativně.

### 1.4 Import pořadí

ESLint to vynutí (viz §12), ale mentálně:
1. React, React Native a externí knihovny
2. Interní absolutní importy (`@/api`, `@/lib`, `@/components`, `@workspace/*`)
3. Relativní importy (`./Component`, `../hook`)
4. Typy (`import type { ... }`)
5. Obrázky/assety přes `require('./logo.png')`

### 1.5 Jedna komponenta = jeden default export per soubor

Ne dvě komponenty v jednom souboru. Ne `export default` a k tomu tři `export const Foo`. Jeden soubor = jedna věc.

**Výjimka:** Sub-komponenta, která je tak malá (10 řádků), že vytáhnout ji do vlastního souboru je overkill. Pak je **named export**, ne default.

**Expo Router výjimka:** soubory v `app/**/*.tsx` **musí** mít default export (vyžaduje to file-based routing). Styly, typy a sub-komponenty té obrazovky nepatří do `app/`, ale do `src/features/<name>/` — v `app/` je jen tenký wrapper, který naimportuje a zrenderuje feature komponentu.

```tsx
// app/event-detail.tsx – POVOLENÝ default export, drží se pod 30 řádků
import { EventDetailScreen } from "@/features/events/EventDetailScreen";
export default EventDetailScreen;
```

---

## 2. TypeScript – striktně

### 2.1 `tsconfig.json` – tohle je minimum

Kořenový `tsconfig.base.json` drží základ pro celý workspace. `artifacts/mobile/tsconfig.json` dědí z `expo/tsconfig.base` a nad to přidává:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "allowJs": false,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["app/**/*", "src/**/*", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

**Kritické volby:** `noUncheckedIndexedAccess` (přinutí tě ověřit existenci při `arr[0]`) a `exactOptionalPropertyTypes` (rozlišuje `undefined` od "chybí").

**Proč ne `verbatimModuleSyntax`:** Metro/Hermes občas zhavaruje na side-effect `import "x"` bez runtime spotřeby. Pokud ho zapneš a build projde e2e smoke testem, nech. Pokud ne, použij `"importsNotUsedAsValues": "error"` + `"preserveValueImports": true` — výsledek stejný, menší riziko.

**[WEB]** `artifacts/mockup-sandbox` nepoužívá `expo/tsconfig.base`, dědí přímo z `tsconfig.base.json`, má navíc `"lib": ["ES2023", "DOM", "DOM.Iterable"]` a `moduleResolution: "bundler"`. Zbytek pravidel §2 platí identicky.

### 2.2 Zákazy

- **Žádné `any`.** Nikdy. Ani v testech. Pokud fakt musíš, je to `unknown` a type-guard.
- **Žádné `as` s výjimkou `as const` a narrowing po runtime ověření.** `as SomeType` jako "věřím mi" = zákaz.
- **Žádné `@ts-ignore`, `@ts-expect-error`.** Pokud se objeví, je to dočasný TODO s vysvětlením a issue číslem.
- **Žádné `!` non-null assertion operator.** Pokud víš, že to není null, zpracuj to skrz type guard nebo early return.
- **Žádné `Function`, `Object`, `{}` jako typy.** Konkrétní typy.
- **Žádné enum. Používej `as const` objekty nebo union typy.**

  ```typescript
  // ZAKÁZÁNO
  enum Role { Staff, Driver }

  // OK – as const objekt
  export const ROLE = {
    STAFF: "staff",
    DRIVER: "driver",
  } as const;
  export type Role = (typeof ROLE)[keyof typeof ROLE];
  ```

  Důvod: enum má historicky rozbité runtime chování, špatně se tree-shakuje, špatně přežívá Metro transform na production bundlu.

### 2.3 Typy vs interface

- **Prefer `type`.** Pouze když potřebuješ declaration merging (rozšíření knihovny) → `interface`.
- Typy jsou composable, nelze je náhodou rozšířit z třetí strany.

### 2.4 Types jako smlouvy

API smlouva vzniká jednou a centrálně — v `lib/api-spec/openapi.yaml`. Z ní orval generuje:

- `@workspace/api-client-react` — TanStack Query hooks + typy
- `@workspace/api-zod` — runtime Zod validátory + typy

**Generovaný kód v `lib/api-*/src/generated/**` se needituje.** Když backend změní shape, upravíš OpenAPI, pustíš `pnpm --filter @workspace/api-spec run codegen`, TypeScript ukáže všechna místa, co to rozbila.

Ruční typy (třeba pro endpointy, které v OpenAPI ještě nejsou — dnes `/smart-drive/overview`) patří do `src/api/types.ts` a musí odpovídat backend kontraktu 1:1:

```typescript
// src/api/types.ts
export type ApiSuccess<T> = { data: T; meta?: Record<string, unknown> };
export type ApiError = { error: { code: ApiErrorCode; message: string } };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export const API_ERROR_CODE = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NETWORK_ERROR: "NETWORK_ERROR",
  RESERVATION_NOT_FOUND: "RESERVATION_NOT_FOUND",
} as const;
export type ApiErrorCode = (typeof API_ERROR_CODE)[keyof typeof API_ERROR_CODE];
```

### 2.5 Zod pro validaci vstupu

Všechny formuláře → `react-hook-form` + `zod`. Schema se vytvoří jednou, z ní se odvodí jak validace, tak TypeScript typ:

```typescript
// features/auth/schemas/login.schema.ts
import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

Nepiš typy ručně paralelně se Zod schema – vždy použij `z.infer`. Import je **`zod/v4`** (soulad se stackem definovaným v `doc/stack.md` a `lib/db`).

---

## 3. Komponenty – pravidla psaní

### 3.1 Funkční komponenty, nic jiného

```typescript
// DOBŘE
export function EventCard({ event, onSignup }: EventCardProps) {
  return <View>...</View>;
}

// ŠPATNĚ – šipkové komponenty bez důvodu
export const EventCard = ({ event, onSignup }: EventCardProps) => {
  return <View>...</View>;
};
```

**Důvod:** funkční deklarace je hoist-ovatelná, lépe se stackuje v error stacku, React DevTools ji hezčeji zobrazí.

### 3.2 Props = named type, vedle komponenty

```typescript
type EventCardProps = {
  event: Event;
  onSignup: (eventId: string) => void;
  isCompact?: boolean;
};

export function EventCard({ event, onSignup, isCompact = false }: EventCardProps) {
  // ...
}
```

- Props typ **vedle** komponenty ve stejném souboru (ne `.types.ts` pokud není sdílený).
- Default hodnoty v destructuringu, ne `defaultProps` (to je deprecated).

### 3.3 Čistě prezentační vs chytré

Drž toto oddělené:

**Chytrá komponenta** (screen / container) – načítá data, spravuje state, volá API:

```typescript
// features/events/StaffEventsScreen.tsx
export function StaffEventsScreen() {
  const { data, isLoading, refetch, isRefetching } = useStaffEvents();
  const filter = useUiStore((s) => s.eventsFilter);

  if (isLoading) return <EventsSkeleton />;
  if (!data) return <ErrorState onRetry={refetch} />;

  return (
    <EventsList
      events={data}
      filter={filter}
      isRefreshing={isRefetching}
      onRefresh={refetch}
    />
  );
}
```

**Prezentační komponenta** – dostává vše přes props, nic nenačítá, nikam neposílá:

```typescript
// features/events/components/EventsList.tsx
type EventsListProps = {
  events: Event[];
  filter: EventsFilter;
  isRefreshing: boolean;
  onRefresh: () => void;
};

export function EventsList({ events, filter, isRefreshing, onRefresh }: EventsListProps) {
  const filtered = useFilteredEvents(events, filter);
  if (filtered.length === 0) return <EmptyState message="Žádné akce" />;
  return (
    <FlatList
      data={filtered}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => <EventCard event={item} />}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
    />
  );
}
```

**Proč:** prezentační komponenty jsou testovatelné bez mock providerů, reusovatelné, a obrovsky zrychlují DevX.

### 3.4 Early returns, ne vnořené podmínky

```typescript
// DOBŘE
export function EventCard({ event }: Props) {
  if (!event) return null;
  if (event.status === "CANCELLED") return <CancelledCard event={event} />;
  return <View>...</View>;
}

// ŠPATNĚ – ternary peklo v JSX
```

### 3.5 Conditional rendering

- **Logický AND (`&&`) pouze s boolean.** V React Native **nesmíš** renderovat `{items.length && <List/>}` — RN vyhodí `Text strings must be rendered within a <Text> component` když array má 0 prvků a `0` se dostane do JSX. Vždy `{items.length > 0 && <List/>}`.
- **Ternary pro mutually exclusive.** Ne `if/else` v JSX.
- **Pro 3+ stavy** – vytáhni do proměnné nebo vlastní komponenty s early return.
- **Text vždy uvnitř `<Text>`.** Holé stringy v `<View>` jsou v RN runtime chyba.

### 3.6 Keys v listech

- **Vždy stabilní id z dat.** Ne `index`.
- Pokud fakt nemáš id (typicky nově vytvořený draft), `crypto.randomUUID()` při vytváření (v Expo SDK 54+ dostupné).
- Pro `FlatList`/`SectionList` používej `keyExtractor`, ne `key` prop na renderItem.

### 3.7 `useEffect` – minimum, a jen na 4 věci

`useEffect` je poslední resort. Použij ho **jen na**:

1. Synchronizace s externím systémem (AsyncStorage, AppState, Linking event, geolocation subscription)
2. Cleanup subscription (WebSocket, setInterval, `Location.watchPositionAsync`, `Notifications.addNotificationReceivedListener`)
3. Imperativní kontrola nativních referencí (focus `TextInput`, `scrollTo`, `MapView` animace)
4. Analytics / logging

**NE na:**

- Transformace props → state (použij `useMemo` nebo derived state)
- Resetování state při změně props (použij `key` prop)
- Fetching dat (použij TanStack Query)
- Odezvu na user event (dej to do event handleru / `onPress`)
- Perzistenci do AsyncStorage (dělej to v akci ze Zustand store, ne v efektu)

Každý `useEffect` musí mít **explicitní cleanup**, pokud subscribe/timer/watcher:

```typescript
useEffect(() => {
  const sub = Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced }, handleUpdate);
  return () => {
    sub.then((s) => s.remove());
  };
}, [handleUpdate]);
```

### 3.8 `useMemo` / `useCallback` – jen s důvodem

Nememoize profylakticky. Memoize pouze když:

1. Passeš funkci / objekt jako prop do memoized komponenty (`React.memo`, `FlatList` `renderItem`)
2. Je to dependency array jiného hooku
3. Výpočet je skutečně drahý (>1ms na běžném zařízení)

V ostatních případech jen přidáváš runtime overhead.

**React 19 + React Compiler** je v projektu dostupný přes `babel-plugin-react-compiler` (už v devDependencies). Pokud je v `babel.config.js` zapnutý, **ruční memoizaci neděláš**. Claude musí zkontrolovat `babel.config.js` a rozhodnout. Aktuální stav (`presets: [["babel-preset-expo"]]` bez compiler pluginu) = ruční memoizace povolená podle bodů 1–3.

**RN specifikum:** `renderItem` ve `FlatList`/`SectionList` **vždy** obalit `useCallback`, a pokud je to samostatná komponenta, ještě `React.memo`. Bez toho se každá položka re-rendruje při každé scroll pozici.

---

## 4. State management – rozhodovací strom

Pořadí rozhodování "kam state patří":

1. **Deep-link params** (`expo-router` `useLocalSearchParams`, `router.setParams`) – filtry, vybraná záložka, search query, ID detailu. Deep-link params hrají roli "URL state" z webu.
   *Důvod:* funguje back stack, sdílitelné deep-linky (`folklore://events?filter=upcoming`), navigace nezahazuje kontext.

2. **React Query cache** – server data. **Nikdy** nekopíruj server data do lokálního useState ani do Zustandu.
   *Důvod:* single source of truth, auto-refetch, cache invalidation, funguje `refetchOnAppFocus`.

3. **Form state** – `react-hook-form`. Ne `useState` pro každý input.

4. **Lokální `useState`** – ephemeral UI state (modal open, swipe-in-progress, hovered, zoom level mapy).

5. **Zustand store** – **jen** pro state sdílený napříč vzdálenými obrazovkami (auth user, role, theme override, locale, global UI flags, read/unread notifications ID set).

**Nikdy nepoužívej Context pro data state.** Context je pro **statické** hodnoty (theme object, i18n instance, navigation). Pro měnící se state používej Zustand (žádné re-render bouře při každém AsyncStorage writeu).

> **Poznámka k migraci.** Aktuální kód má `context/AuthContext.tsx` a `context/NotificationContext.tsx`.
> Oba se přesunou do `src/stores/authStore.ts` a `src/stores/notificationsStore.ts` s perzistencí
> přes `zustand/middleware` `persist` a custom AsyncStorage adapter. Auth token **nikdy** do AsyncStorage —
> patří do `expo-secure-store` (viz §4.2).

### 4.1 Zustand store pattern

```typescript
// src/stores/authStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthState = {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
};

type AuthActions = {
  setUser: (user: User, role: Role) => void;
  setRole: (role: Role | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      setUser: (user, role) => set({ user, role, isAuthenticated: true }),
      setRole: (role) => set({ role }),
      logout: () => set({ user: null, role: null, isAuthenticated: false }),
    }),
    { name: "auth-storage", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

// Selektory – NE useAuthStore() celý, ale jen to, co potřebuju
export const useAuthUser = () => useAuthStore((s) => s.user);
export const useAuthRole = () => useAuthStore((s) => s.role);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
```

**Proč selektory:** když použiješ `const { user } = useAuthStore()`, komponenta se re-renderuje při změně **čehokoliv** ve store. Se selectorem jen když se změní `user`.

### 4.2 Citlivá data = SecureStore, ne AsyncStorage

JWT token, refresh token, PIN, biometrický klíč → `expo-secure-store`. AsyncStorage je obyčejný file na device, **není šifrovaný**.

```typescript
// src/lib/secureStorage.ts
import * as SecureStore from "expo-secure-store";

export const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};
```

Zustand persist middleware přijme tenhle adapter přes `createJSONStorage(() => secureStorage)`.

---

## 5. React Query – pravidla

### 5.1 Každý endpoint = vlastní hook

Nepiš `useQuery` přímo ve screenu. Vytvoř custom hook:

```typescript
// features/events/hooks/useEvent.ts
import { useQuery } from "@tanstack/react-query";
import { fetchEvent } from "@/api/endpoints/events";

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => fetchEvent(eventId),
    enabled: !!eventId,
  });
}
```

Preferuj generované hooky z `@workspace/api-client-react` (orval) — pokud endpoint je v OpenAPI spec. Vlastní hook piš jen pro endpointy, které v OpenAPI nejsou (dnes `/smart-drive/overview`, `/auth/*`) nebo když potřebuješ custom select/transform.

Screen pak:

```typescript
const { data: event, isLoading, error } = useEvent(eventId);
```

### 5.2 Query keys jako konstanty

```typescript
// features/events/queryKeys.ts
export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filters: EventFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, "detail"] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
};
```

Pak invalidace:

```typescript
queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
```

Neinvaliduj přes string literály – vždy překlepnutý.

### 5.3 Mutations s optimistic updates

Pro akce, kde uživatel očekává okamžitou odezvu (označit notifikaci jako přečtenou, potvrdit transport), použij `onMutate`/`onError`/`onSettled` pattern:

```typescript
export function useMarkNotificationRead(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markRead(id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notificationKeys.list() });
      const previous = qc.getQueryData<Notification[]>(notificationKeys.list());
      qc.setQueryData<Notification[]>(notificationKeys.list(), (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(notificationKeys.list(), ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}
```

### 5.4 Default konfigurace

```typescript
// app/_layout.tsx
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { AppState, Platform } from "react-native";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,          // 1 min
      gcTime: 1000 * 60 * 10,         // 10 min
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,    // neplatí pro RN, použij focusManager níž
    },
    mutations: { retry: 0 },
  },
});

// Refetch při návratu do aplikace
AppState.addEventListener("change", (status) => {
  if (Platform.OS !== "web") focusManager.setFocused(status === "active");
});
// Online/offline podle NetInfo
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);
```

Tenhle setup je v RN **povinný** — bez něj React Query nerozumí, kdy je app v popředí a kdy offline.

---

## 6. Styling – StyleSheet + typed theme (ne Tailwind, ne shadcn)

**Proč ne shadcn/ui a ne NativeWind v této aplikaci.** shadcn/ui staví na Radix UI primitivech, které jsou DOM-only — v React Native **nefungují**. NativeWind (Tailwind syntax v RN) je životaschopná volba, ale zvyšuje build komplexitu a skrývá performance náklady (každá třída je runtime lookup). Zvolený model je: **StyleSheet + typed design tokens + vlastní primitivní komponenty v `src/components/ui/`**, stejný mentální model jako shadcn — komponenty jsou **v tvém kódu**, plně editovatelné, bez vendor lock-in.

**[WEB]** `artifacts/mockup-sandbox` používá Tailwind v4 + shadcn/ui; tam se řídí původní webovou verzí §6 (viz poznámka na konci sekce).

### 6.1 Design tokens — jediný zdroj pravdy

Všechny hodnoty (barvy, spacing, radii, typography, shadows) bydlí v `src/theme/`. Žádné magic numbers v komponentách, žádné hex v `StyleSheet`.

```typescript
// src/theme/tokens.ts
export const palette = {
  light: {
    background: "#f8faf9",
    foreground: "#1a1a2e",
    card: "#ffffff",
    cardForeground: "#1a1a2e",
    primary: "#2d6a4f",
    primaryForeground: "#ffffff",
    secondary: "#e8f5e9",
    secondaryForeground: "#1a1a2e",
    muted: "#f1f4f2",
    mutedForeground: "#6b7c74",
    accent: "#52b788",
    accentForeground: "#ffffff",
    destructive: "#e63946",
    destructiveForeground: "#ffffff",
    warning: "#f4a261",
    warningForeground: "#ffffff",
    success: "#2d6a4f",
    successForeground: "#ffffff",
    border: "#dde8e2",
    input: "#dde8e2",
  },
  dark: {
    // parita s light, upravené hodnoty pro dark mode
  },
} as const;

export const spacing = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64,
} as const;

export const radii = { sm: 8, md: 10, lg: 12, xl: 16, full: 9999 } as const;

export const typography = {
  fontFamily: { regular: "Inter_400Regular", medium: "Inter_500Medium", bold: "Inter_700Bold" },
  size: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30 },
  lineHeight: { tight: 1.2, normal: 1.4, relaxed: 1.6 },
} as const;

export type ColorScheme = keyof typeof palette;
export type ThemeColor = keyof typeof palette.light;
```

**Pravidlo:** styly v komponentách konzumují výhradně tyto tokeny. `spacing[4]` místo `16`, `radii.lg` místo `12`, `palette[scheme].primary` místo `"#2d6a4f"`.

**Současný stav** — `artifacts/mobile/constants/colors.ts` je primitivní zárodek tohoto tokensystému (light only, chybí `dark`, chybí spacing/radii/typography tokeny). Migrace: rozšíří se o `dark` palette + spacing + radii + typography, přesune do `src/theme/tokens.ts`.

### 6.2 `useTheme()` hook (aktuálně `useColors()`)

```typescript
// src/theme/useTheme.ts
import { useColorScheme } from "react-native";
import { useUiStore } from "@/stores/uiStore";
import { palette, spacing, radii, typography, type ColorScheme } from "./tokens";

export function useTheme() {
  const system = useColorScheme();
  const override = useUiStore((s) => s.themeOverride);  // "light" | "dark" | "system"
  const scheme: ColorScheme = override === "system" ? (system ?? "light") : override;
  return {
    scheme,
    colors: palette[scheme],
    spacing,
    radii,
    typography,
  };
}
```

Komponenta:

```typescript
export function EventCard({ event }: EventCardProps) {
  const { colors, spacing, radii } = useTheme();
  const styles = useMemo(() => createStyles({ colors, spacing, radii }), [colors, spacing, radii]);
  return <View style={styles.root}>...</View>;
}
```

### 6.3 `StyleSheet.create` — pravidla

- **Každá komponenta má svůj `StyleSheet`**, buď inline dole v souboru, nebo v `ComponentName.styles.ts` sourozenci.
- **Styly konzumující theme tokeny** vrací **factory funkce**: `createStyles({ colors, spacing, radii })`. Memoizuje se `useMemo` proti `scheme` changes.
- **Žádné inline `style={{ ... }}`** kromě dynamických hodnot, co nejdou ve StyleSheet (např. `style={{ width: `${percent}%` }}`, `style={{ transform: [{ translateX }] }}` s Reanimated shared value).
- **Kompozice stylů přes array:** `<View style={[styles.root, isActive && styles.rootActive, customStyle]} />`. Falsy hodnoty RN ignoruje, žádný `cn()` není potřeba.
- **Žádné `StyleSheet.flatten` v render cestě** — je to pomalé.

```typescript
// features/events/components/EventCard.tsx
import { StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

type EventCardProps = { event: Event; onPress: () => void };

export function EventCard({ event, onPress }: EventCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable style={styles.root} onPress={onPress} accessibilityRole="button">
      <Text style={styles.title}>{event.title}</Text>
    </Pressable>
  );
}

function createStyles({ colors, spacing, radii, typography }: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: {
      padding: spacing[4],
      borderRadius: radii.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: typography.size.lg,
      fontFamily: typography.fontFamily.medium,
      color: colors.cardForeground,
    },
  });
}
```

### 6.4 `src/components/ui/` — naše "shadcn pro RN"

Primitivní, plně editovatelné stavební bloky. Každý primitiv:

- Konzumuje theme tokeny přes `useTheme()`
- Přijímá `style` prop pro override (array kompozice)
- Nese `accessibilityRole`, `accessibilityLabel`, `accessibilityState` kde má smysl
- Má variants přes **discrete prop**, ne přes className stringy

**První dávka primitiv (napsat ručně, žádné balíčky neinstalovat):**

- `Button` — `variant`: `"primary" | "secondary" | "destructive" | "success" | "outline" | "ghost" | "link"`; `size`: `"sm" | "md" | "lg"`; `loading`, `leftIcon`, `rightIcon`, `disabled`.
- `Text` — `variant`: `"body" | "caption" | "title" | "heading" | "muted" | "error"`; `weight`: `"regular" | "medium" | "bold"`. Obaluje RN `<Text>`, aplikuje font + color z tokenů.
- `Input` — wrapper `TextInput` s label, error, helper textem, focus state.
- `Card` — kontejner s paddingem, border, backgroundem z tokenů.
- `Badge` — malý status chip; `variant`: `"default" | "success" | "warning" | "destructive" | "info"`.
- `Avatar` — fallback iniciály, `size: "sm" | "md" | "lg"`.
- `Separator` — vodorovná linka z `colors.border`.
- `Skeleton` — šedivý obdélník s subtle shimmer animací (Reanimated).
- `Sheet` — `Modal` wrapper s slide-from-bottom prezentací.
- `Dialog` — centered modal (destructive confirm, info).
- `EmptyState` — ikona + title + caption + optional action button.
- `Spinner` — `ActivityIndicator` wrapper s theme colors.

**Pozdější dávka** (přidá se při prvním využití, ne spekulativně): `Select` (přes `@react-native-picker/picker` nebo custom Sheet), `Tabs` (přes `react-native-tab-view`), `Tooltip` (long-press overlay), `Toast` (přes `sonner-native` nebo vlastní).

### 6.5 Customizace — brand identita za 15 minut

Hlavní páka je `src/theme/tokens.ts`. Uprav:

1. **`palette.light.primary` + `palette.dark.primary`** — brand barva. Aktuálně zelená `#2d6a4f` (Folklore Garden), nechat.
2. **`radii.lg`** — aktuálně 12. Čím větší, tím "přátelštější". Aplikace drží 12 napříč kartami, inputy, buttony.
3. **`typography.fontFamily`** — Inter je načtený v `app/_layout.tsx` přes `@expo-google-fonts/inter`. Zůstává.
4. **Status barvy** — `success`, `warning`, `destructive` jsou semanticky pojmenované, **nikdy** nepoužívej raw `"#ff0000"` v komponentě. Pokud potřebuješ novou semantic, přidej token.

### 6.6 Pravidla StyleSheet / stylování

- **Žádné `className`** (neexistuje v RN bez NativeWindu).
- **Žádné inline `style={{}}`** kromě dynamických hodnot (viz §6.3).
- **`style` prop na reusable komponentě:** musí být přijat a kombinován array spreadem:

  ```typescript
  type CardProps = { style?: StyleProp<ViewStyle>; children: ReactNode };
  export function Card({ style, children }: CardProps) {
    const { colors, spacing, radii } = useTheme();
    const base = { backgroundColor: colors.card, padding: spacing[4], borderRadius: radii.lg };
    return <View style={[base, style]}>{children}</View>;
  }
  ```

- **Platform specific styly** přes `Platform.select({ ios: {...}, android: {...} })`, ne přes `if (Platform.OS === ...)` v render cestě.
- **Shadow** — na iOS přes `shadowColor/Offset/Opacity/Radius`, na Android přes `elevation`. Vytáhni do tokenu `shadows.sm|md|lg` v `theme/tokens.ts`.

### 6.7 Žádné magic numbers

Místo `padding: 13` použij `padding: spacing[3]` (12) nebo `spacing[4]` (16). Pokud fakt potřebuješ custom hodnotu, přidej ji do `spacing` tokenů jako pojmenovaný klíč.

**Povolené výjimky:**

- Dynamické hodnoty z JS: `{ width: `${percent}%` }` (progress bary)
- `Image` `width`/`height` atributy podle aspect ratia assetu
- Reanimated shared values (transform, opacity)

### 6.8 Sémantické barvy, ne syrové

**ŠPATNĚ:**

```tsx
<View style={{ backgroundColor: "#2d6a4f" }}>
  <Text style={{ color: "#fff" }}>Přihlásit</Text>
</View>
```

**DOBŘE:**

```tsx
<View style={{ backgroundColor: colors.primary }}>
  <Text style={{ color: colors.primaryForeground }}>Přihlásit</Text>
</View>
```

Důvod: při změně brand barvy měníš na jednom místě (tokens). S hex stringem grep po projektu.

### 6.9 Dark mode od začátku

Theme tokens mají `light` i `dark` variantu. `useTheme()` vybírá podle `useColorScheme()` + uživatelského override v `uiStore`. Každá nová komponenta **musí** používat tokeny, ne raw barvy.

**Claude test:** pokud komponenta sahá na `colors.primary`, `colors.foreground`, `colors.border`, `colors.mutedForeground` — dark mode funguje. Pokud má hardcoded `"#fff"`, `"#000"`, `"#6b7280"` — je to bug, přepsat.

### 6.10 Rozhodovací strom "primitiv z `ui/` nebo vlastní"

| Potřebuji… | Řešení |
|---|---|
| Klikatelné tlačítko | `ui/Button` (všechny varianty) |
| Text field | `ui/Input` + `ui/Label` |
| Formulář | `react-hook-form` + `ui/Input`, `ui/Button` |
| Modal (centered, potvrzení) | `ui/Dialog` |
| Modal (z boku/zdola, více obsahu) | `ui/Sheet` |
| Destructive confirmation | `ui/Dialog` s `variant="destructive"` |
| Rozbalovací menu | `ui/Sheet` s options list (RN nemá ekvivalent `DropdownMenu`) |
| Select z fixního listu | `ui/Sheet` s radio listem, ne nativní `Picker` |
| Radio group | vlastní přes `Pressable` + `accessibilityState.selected` |
| Toggle switch | RN `Switch` s theme colors |
| Notifikace (toast) | `sonner-native` (po schválení instalace) nebo vlastní nad Reanimated |
| Avatar uživatele | `ui/Avatar` |
| Badge (status) | `ui/Badge` |
| Progress bar | RN `ProgressBarAndroid`/`ProgressViewIOS` nebo vlastní `View` s dynamic width |
| Loading state | `ui/Skeleton` pro obsah, `ui/Spinner` pro inline |
| Tooltip | žádný — mobile pattern je long-press + Sheet |
| Tabs | pokud v rámci screenu: `react-native-tab-view`; pokud globální nav: `expo-router` `(tabs)` |
| Date picker | `@react-native-community/datetimepicker` (nativní) |
| Card container | `ui/Card` |
| Alert/info banner | vlastní komponenta nad `ui/Card` + ikona |
| Divider | `ui/Separator` |
| Bottom navigation | `expo-router` `(tabs)` — už v projektu je |
| Filter chipy | vlastní přes `ui/Badge` + `Pressable` |
| Avatar skupina | vlastní nad `ui/Avatar` |
| Capacity bar (0-100, barva dle %) | vlastní nad `View` s dynamic width |
| Stepper (wizard 1/3 2/3 3/3) | vlastní (tři `View` s active state) |
| Mapa | WebView + Leaflet (**existující pattern**, viz `app/transport-map.tsx`) |

### 6.11 Vlastní komponenty – kam patří

- **Pokud ji použije >2 feature** → `src/components/shared/` (EmptyState, NotificationBell už existují v kořenovém `components/`, migrují sem)
- **Feature-local** → `src/features/{name}/components/`
- **Primitiv nebo rozšíření primitiva** → `src/components/ui/` (jsou tvoje, smíš je editovat)

### 6.12 Ikony – Lucide, nic jiného

```typescript
import { Search, MapPin, Calendar } from "lucide-react-native";

<Search size={16} color={colors.mutedForeground} />
```

Balíček **`lucide-react-native`** (ne `lucide-react`, to je DOM). Aktuální kód používá `@expo/vector-icons` → `Feather` a `Ionicons`; při refaktoru sjednotit na Lucide (zachovat `@expo/vector-icons` jen do migrace).

**Pravidla velikosti ikon:**

- U inputu / uvnitř buttonu: `size={16}`
- V headeru / hero sekci / card title: `size={20}`
- U sekce / avataru / empty state ikony: `size={24}` nebo `size={32}`
- Žádné `size={17}`. Pokud potřebuješ jinou velikost, přidej do `theme/tokens.ts` jako `iconSize`.

---

**[WEB] §6 pro `artifacts/mockup-sandbox`** platí v původní webové verzi: Tailwind 4 + shadcn/ui + Radix + CSS variables + `cn()` z `tailwind-merge`. Brand tokeny se replikují z `src/theme/tokens.ts` (hexy) do CSS variables v `src/index.css` (HSL), takže je jeden zdroj pravdy i napříč platformami. Všechny ostatní sekce (§1–5, §7–18) platí pro web i RN stejně.

---

## 7. Formuláře

### 7.1 React Hook Form + Zod, vždy

```typescript
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "./schemas/login.schema";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (data) => {
    // data je typově bezpečné
  });

  return (
    <>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Input
            label="E-mail"
            value={field.value}
            onChangeText={field.onChange}
            autoCapitalize="none"
            keyboardType="email-address"
            error={errors.email?.message}
          />
        )}
      />
      <Button onPress={onSubmit} loading={isSubmitting}>Přihlásit</Button>
    </>
  );
}
```

RN nemá DOM form element — `onSubmit` se volá z `onPress` na submit tlačítku (nebo z `onSubmitEditing` na posledním inputu).

### 7.2 Žádné controlled inputs přes `useState`

`useState` + `onChangeText` pro každý input = pomalé, víc bugů, ztracené validace. Vždy React Hook Form s `<Controller>` (nebo `register` adapter, ale `Controller` je v RN standardní).

### 7.3 Chybové hlášky lokalizované a smysluplné

Zod errors v češtině přes custom error map:

```typescript
// src/lib/zodErrorMap.ts
import { z } from "zod/v4";

z.setErrorMap((issue, ctx) => {
  if (issue.code === "too_small") {
    if (issue.type === "string") return { message: `Minimálně ${issue.minimum} znaků` };
    if (issue.type === "number") return { message: `Minimálně ${issue.minimum}` };
  }
  if (issue.code === "invalid_string" && issue.validation === "email") {
    return { message: "Neplatná e-mailová adresa" };
  }
  return { message: ctx.defaultError };
});
```

Import jednou v `app/_layout.tsx` (side-effect import).

---

## 8. Error handling

### 8.1 Error boundaries per route

Každá route má vlastní error boundary. Pád jedné obrazovky nesmí shodit celou aplikaci.

`expo-router` podporuje `ErrorBoundary` export přímo v route souboru:

```typescript
// app/event-detail.tsx
export { ErrorBoundary } from "@/components/shared/RouteErrorBoundary";
export { default } from "@/features/events/EventDetailScreen";
```

`RouteErrorBoundary` je obyčejná React komponenta s `{ error: Error; retry: () => void }` props, která renderuje fallback UI a tlačítko "Zkusit znovu".

### 8.2 API errors = typed union

```typescript
// src/api/errors.ts
export class ApiException extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiException";
  }
}
```

Komponenta pak řeší konkrétní kódy:

```typescript
if (mutation.error instanceof ApiException) {
  if (mutation.error.code === "UNAUTHORIZED") return <ReLoginPrompt />;
  if (mutation.error.code === "RESERVATION_NOT_FOUND") return <ReservationGoneState />;
}
```

### 8.3 Toast notifikace pro non-blocking errors

Chyby, co nemění UI (failed optimistic update, copy to clipboard failed) → toast. Chyby, co rozbijí data view (failed fetch) → inline error state v komponentě.

**Library:** `sonner-native` (po schválení instalace) — stejná API jako `sonner` z webu. Alternativa: vlastní Toast primitiv nad Reanimated + `SafeAreaInsetsContext`. Dokud není rozhodnuto, `Alert.alert` z `react-native` je povolený fallback (nativní dialog, blokující).

---

## 9. Performance

### 9.1 Code splitting

`expo-router` dělá routing-level code splitting automaticky (každá route je lazy chunk v produkčním Metro bundlu). **Neděláš `React.lazy` ručně.**

Skeleton fallback dělej přes `Suspense` boundary **uvnitř** screenu, ne jako route-level fallback.

### 9.2 Image optimalizace

Místo `Image` z `react-native` **vždy** použij `expo-image`:

```typescript
import { Image } from "expo-image";

<Image
  source={{ uri: user.avatar }}
  style={{ width: 40, height: 40, borderRadius: radii.full }}
  contentFit="cover"
  placeholder={{ blurhash: user.avatarBlurhash }}
  cachePolicy="memory-disk"
  transition={200}
/>
```

Pravidla:

- `width` a `height` **povinné** (jinak layout shift + RN warning).
- `contentFit` místo webového `objectFit`.
- `placeholder` s blurhash pro user avatary / event fotky (generuje backend).
- `cachePolicy="memory-disk"` pro persistent content, `"memory"` pro krátkodobý.

### 9.3 Žádné giant lib

Před `pnpm add` zkontroluj bundle impact. V RN to znamená:

- **`minimumReleaseAge: 1440`** v `pnpm-workspace.yaml` **nesnižovat** (supply-chain guard, viz CLAUDE.md).
- **Nativní moduly** (s `ios/` nebo `android/` složkou) vyžadují prebuild / dev client. Před přidáním ověř, že existuje Expo-kompatibilní varianta (`expo-*` nebo fungující v Expo Go / dev client).
- Parse balíček přes `npx expo-doctor` po instalaci.

### 9.4 Performance monitoring

Pokud Claude píše něco složitého (velký `FlatList`, real-time update, mapa s markery), **musí** ověřit:

1. **React DevTools Profiler** přes `expo start --dev-client` → "Performance" panel.
2. **Perf Monitor** v Expo dev menu (JS FPS + UI FPS).
3. **`FlatList` optimalizace:** `keyExtractor`, `getItemLayout` (pokud známá výška), `windowSize`, `removeClippedSubviews: true` na Android, memoized `renderItem`.

Není to optional — FlatList s re-renderujícím se `renderItem` = 60fps dropne na 15.

---

## 10. Testování

### 10.1 Rozsah pro MVP

- **Unit testy** pro `src/lib/` utility (čisté funkce – snadné, rychlé, povinné)
- **Hook testy** pro custom hooks s netriviální logikou (`useEventFilter`, `useDebounce`)
- **Component testy** jen pro **kritické flows:** login, role select, přihlášení na event, potvrzení transportu
- **E2E testy** – zatím ne, přijde později s **Maestro** (ne Playwright — Playwright nefunguje s RN nativními builds)

### 10.2 Stack

- **Jest** s `jest-expo` preset — standard pro Expo projekty (Vitest neumí RN Metro transform).
- **React Native Testing Library** (`@testing-library/react-native`) pro komponenty.
- **MSW** pro API mocking — funguje v RN přes `msw/native` adapter.

**[WEB]** `artifacts/mockup-sandbox` používá Vitest + React Testing Library (DOM).

### 10.3 Pravidla psaní testů

- **Testuj chování, ne implementaci.** `screen.getByRole("button", { name: "Přihlásit" })` — ne `getByTestId("btn-login")`, ledaže chování přes role/label není dostupné.
- **User-event, ne fireEvent.** `userEvent.press(button)` — simuluje real user (včetně press-in/press-out delay).
- **Arrange-Act-Assert.** Jasně oddělené bloky.
- **Jedna assertion per test.** Nebo aspoň jedno logické tvrzení.
- **`testID` prop** jen jako poslední resort pro e2e, ne pro unit testy.

---

## 11. Naming conventions

| Věc | Konvence | Příklad |
|---|---|---|
| Komponenta | PascalCase | `EventCard.tsx` |
| Screen | PascalCase + suffix `Screen` | `StaffEventsScreen.tsx` |
| Hook | camelCase s `use` | `useEvent.ts` |
| Zustand store | camelCase s `use…Store` | `useAuthStore.ts` |
| Utility | camelCase | `formatDate.ts` |
| Styles file | `<Component>.styles.ts` | `EventCard.styles.ts` |
| Type / Interface | PascalCase | `type EventProps = ...` |
| Konstanta | SCREAMING_SNAKE | `MAX_NOTIFICATIONS = 100` |
| `as const` object | SCREAMING_SNAKE | `const ROLE = { STAFF: "staff" } as const` |
| Boolean prop | `is`/`has`/`should` | `isLoading`, `hasError` |
| Event handler prop | `onXxx` | `onPress`, `onSignup`, `onCancel` |
| Event handler interní | `handleXxx` | `handleSubmit` |
| Async funkce | prefix sloveso | `fetchEvents`, `createEvent` |
| ENV proměnná (RN) | `EXPO_PUBLIC_` prefix | `EXPO_PUBLIC_API_URL` |
| ENV proměnná (web) | `VITE_` prefix | `VITE_API_URL` |

---

## 12. ESLint konfigurace

Použij **ESLint 9 flat config** (moderní standard od 2024). Tenhle config platí pro **celý monorepo** (`eslint.config.js` v rootu), s overridy pro RN vs web.

```javascript
// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactNative from "eslint-plugin-react-native";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  { ignores: ["**/dist", "**/node_modules", "**/coverage", "**/*.generated.*", "lib/api-*/src/generated/**", ".expo"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      import: importPlugin,
    },
    rules: {
      // TypeScript
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",

      // React
      "react/jsx-key": "error",
      "react/jsx-no-useless-fragment": "warn",
      "react/self-closing-comp": "warn",
      "react/no-array-index-key": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      // Imports
      "import/order": ["error", {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
        "newlines-between": "always",
        alphabetize: { order: "asc" },
      }],
      "import/no-default-export": "error",

      // Style
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
    },
  },
  // RN-specific: artifacts/mobile
  {
    files: ["artifacts/mobile/**/*.{ts,tsx}"],
    plugins: { "react-native": reactNative },
    rules: {
      "react-native/no-inline-styles": "warn",
      "react-native/no-color-literals": "error",       // vynucuje theme tokens
      "react-native/no-unused-styles": "error",
      "react-native/no-raw-text": "error",             // holé stringy v <View> = bug
    },
  },
  // Override: expo-router routes MUSÍ mít default export
  {
    files: ["artifacts/mobile/app/**/*.{ts,tsx}"],
    rules: {
      "import/no-default-export": "off",
    },
  },
  // Web-only: a11y pravidla jen pro webové JSX (mockup-sandbox)
  {
    files: ["artifacts/mockup-sandbox/**/*.{ts,tsx}"],
    plugins: { "jsx-a11y": jsxA11y },
    rules: {
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/click-events-have-key-events": "error",
    },
  },
  // Pages mohou mít default export kvůli lazy [WEB]
  {
    files: ["**/pages/**", "**/routes/**", "**/*Page.tsx"],
    rules: {
      "import/no-default-export": "off",
    },
  },
);
```

**Důležité rozdíly vůči web verzi:**

- `jsx-a11y` **jen pro `artifacts/mockup-sandbox`** — pravidla typu `alt-text` jsou DOM-only, v RN dávají nesmysl (`Image` nemá `alt`, místo toho `accessibilityLabel`).
- `eslint-plugin-react-native` **pro `artifacts/mobile`** — vynucuje theme tokens (`no-color-literals`), holé stringy (`no-raw-text`), nepoužité styly.
- `react-refresh` plugin **jen pro web** (Vite-specific). V Expo Fast Refresh běží bez něj.
- Override pro `app/**` — default exporty povolené kvůli expo-router.

### 12.1 Prettier

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**Odchylka od web verze:** `singleQuote: false` — existující kód v monorepu používá double quotes (viz `@workspace/api-server`, `lib/*`), konzistence s generovaným kódem z orvalu (`prettier: true` produkuje double quotes).

### 12.2 Pre-commit hook

```json
// root package.json
{
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "format": "prettier --write \"**/*.{ts,tsx,md}\"",
    "typecheck": "pnpm run typecheck:libs && pnpm -r --if-present run typecheck",
    "check": "pnpm run typecheck && pnpm run lint"
  }
}
```

Pre-commit přes **Husky + lint-staged** — před commitem běží `pnpm run check`. Commit s chybami = zakázaný.

---

## 13. Accessibility (a11y)

Povinné minimum pro React Native:

- **Všechno klikatelné je `Pressable` nebo `TouchableOpacity` s `accessibilityRole="button"`.** Ne `<View onTouchEnd>`.
- **`accessibilityLabel`** pro ikony bez textu (např. hamburger menu, close X).
- **`accessibilityState`** pro toggle/checkbox/radio (`{ selected: true }`, `{ disabled: true }`, `{ checked: "mixed" }`).
- **`accessibilityHint`** pro neintuitivní akce ("Dvojitý klik přehraje zvuk").
- **Formuláře:** `TextInput` má `accessibilityLabel` matching viditelný label, `accessibilityRole="text"` není potřeba (defaultní).
- **Obrázky:** `accessibilityLabel` pro informativní, `accessible={false}` pro dekorativní.
- **Barva sama nekomunikuje stav.** Červený text + ikona varování, ne jen červený text.
- **Focus order:** `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` na skryté vrstvy (modaly pod dialogem).
- **Screen reader test:** minimum 1× ručně přes VoiceOver (iOS) nebo TalkBack (Android) před PR.

`eslint-plugin-react-native` a11y pravidla nemá (na rozdíl od webu). Ruční disciplína.

---

## 14. Git commit a PR konvence

### 14.1 Commit messages (Conventional Commits)

```
feat(events): add staff events screen
fix(auth): handle expired token refresh
refactor(events): extract EventCard to shared
chore(deps): update tanstack-query to 5.60
docs: update frontend-rules for RN
test(events): add signup flow tests
style: fix formatting
```

Scope je `features/<name>` nebo `artifacts/<name>` nebo `lib/<name>`.

### 14.2 Pull Request pravidla

- Jeden PR = jedna featurka nebo jeden fix. Ne "týdenní dump".
- Title dle Conventional Commit formátu.
- Description: **Co**, **Proč**, **Jak otestovat** (iOS Simulator steps, Android Emulator steps).
- PR nad 500 řádků diff = rozděl.
- **Screenshots** pro UI změny: iOS + Android (pokud UI není platform-specific).

---

## 15. Environment & konfigurace

### 15.1 ENV proměnné

```typescript
// src/lib/env.ts – jediné místo, kde se ENV čtou
import { z } from "zod/v4";

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]),
});

export const env = envSchema.parse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
});
```

**Důležité pro Expo:**

- Jen proměnné s prefixem `EXPO_PUBLIC_` jsou inlinované do bundle za build-time. Cokoli bez prefixu **není** dostupné na runtime na device (je to Node-side, ne RN-side).
- `process.env.EXPO_PUBLIC_*` **musíš** číst jako literal string expression — destructuring (`const { EXPO_PUBLIC_API_URL } = process.env`) Babel plugin neumí inlinovat.
- Validace při startu (v `app/_layout.tsx` side-effect import `@/lib/env`). Chybějící ENV = hlášný crash, ne silent bug.

**[WEB]** `artifacts/mockup-sandbox` čte `import.meta.env` s prefixem `VITE_`.

### 15.2 `.env.example` vždy up-to-date

Každá nová `EXPO_PUBLIC_` proměnná → přidej do `artifacts/mobile/.env.example` s komentářem.

---

## 16. Akcelerace pro Claude – rozhodovací šablony

Když Claude stojí před volbou, rozhodne takto:

### "Mám použít useState nebo Zustand?"

- State používá jen jedna komponenta → `useState`
- State sdílený mezi 2-3 blízkými komponentami → lift state up + prop drilling
- State sdílený napříč obrazovkami → Zustand
- Data z API → React Query, nikdy ne useState ani Zustand
- Filtr / vybraná záložka / detail ID → `expo-router` search params, ne Zustand

### "Mám udělat nový soubor nebo přidat do existujícího?"

- Přidávaná věc je úzce spjatá a <50 řádků → existující
- Pokud by tím existující soubor překročil 300 řádků → nový soubor
- Pokud je to samostatný koncept (nová komponenta, nový hook) → vždy nový
- Pokud je to ucelený blok stylů přesahující 100 řádků → `.styles.ts` sourozenec

### "Mám abstrahovat nebo duplikovat?"

- Duplikace max 2× → duplikace je OK, není ještě jasný vzor
- Třetí výskyt → extrahuj do shared

### "Mám řešit edge case?"

- Edge case reálně nastane → ano
- Edge case je spekulativní ("co kdyby") → ne, KISS

### "Mám napsat test?"

- Čistá funkce v `src/lib/` → ano, povinně
- Business logic hook → ano
- UI komponenta bez logiky → ne
- Kritický user flow (login, signup, transport confirm) → ano (smoke test)

### "Instaluji nový balíček?"

- Zeptej se uživatele (pravidlo §18.2).
- Ověř, že existuje Expo-kompatibilní varianta (`expo-*` nebo kompatibilní s Expo Go / dev client).
- Zkontroluj `minimumReleaseAge: 1440` v `pnpm-workspace.yaml` — balíček musí být starý aspoň 24h.
- Po instalaci pusť `npx expo-doctor`.

---

## 17. Seznam pro každou komponentu před commitem

Claude si projde tohle před tím, než navrhne commit:

- [ ] Soubor je pod 300 řádků (komponenta) / 150 řádků (hook) / 200 řádků (utility) / 100 řádků (StyleSheet block)
- [ ] Žádné `any`, `@ts-ignore`, `as X` bez runtime guardu, `!` non-null assertion
- [ ] Props typ pojmenovaný a exportovaný (pokud reusable)
- [ ] `useEffect` – má cleanup, závislosti jsou správně, není to ve skutečnosti derived state
- [ ] Styly jdou přes theme tokeny, žádné hex literály, žádný `"#fff"` / `"#000"`
- [ ] Dark mode funguje (test: zapnout system dark mode na simulátoru)
- [ ] iPhone SE (1st gen, 320×568) nezobrazuje horizontal scroll; velké Androidy (Pixel 8 Pro) nemají obrovské mezery
- [ ] Keyboard nezakryje submit tlačítko (použít `KeyboardAwareScrollView` nebo `KeyboardAvoidingView`)
- [ ] `FlatList` má `keyExtractor`, memoized `renderItem`; pokud je výška známá, i `getItemLayout`
- [ ] Všechny klikatelné elementy mají `accessibilityRole` a `accessibilityLabel` (pokud ikona bez textu)
- [ ] Loading state, error state, empty state – všechny tři pokryté
- [ ] Texty v UI jsou **česky** (Folklore Garden je CZ produkt), žádné hardcoded EN leftovery
- [ ] `pnpm run check` projde bez warnings
- [ ] Pokud komponenta volá nativní API (Location, Notifications, Camera) — permissions flow ošetřen

---

## 18. Co NIKDY nedělat

1. **Nikdy nekomituj `console.log`, `debugger`, `// TODO` bez issue čísla, `// eslint-disable` bez důvodu.**
2. **Nikdy neinstaluj balíček bez mého souhlasu.** Každý `pnpm add` = ptáš se. Supply-chain guard (`minimumReleaseAge: 1440`) **nikdy nesnižuj**.
3. **Nikdy neupravuj `pnpm-lock.yaml` ručně.** Pusť `pnpm install` a commitni výsledek.
4. **Nikdy neignoruj ESLint/TypeScript chybu vypnutím pravidla.** Oprav kód, ne pravidlo.
5. **Nikdy neudělej "malý refactor napříč projektem" mimo zadání.** Úzký scope.
6. **Nikdy nepoužívej `Alert.alert` pro formulářové validace.** `Alert.alert` je povolený jen pro **destructive confirmation** (smazat účet, zrušit rezervaci) jako fallback před `ui/Dialog`. Validace patří inline pod input.
7. **Nikdy neinjektuj HTML do WebView** s user contentem bez sanitizace. Aktuální `app/transport-map.tsx` pouští Leaflet přes `WebView` se šablonovaným HTML — souřadnice a adresy se **musí** escapovat přes `JSON.stringify` před injectem.
8. **Nikdy neukládej auth token do AsyncStorage.** Patří do `expo-secure-store`.
9. **Nikdy nevolej AsyncStorage / SecureStore v render cestě.** Jen v event handleru, Zustand akci nebo useEffect.
10. **Nikdy nepoužívej index jako key** v listu, který se může filtrovat/řadit.
11. **Nikdy neblokuj JS thread** synchronními operacemi nad 16ms (JSON.parse > 1MB, sync crypto). Veškerou těžkou práci do worker nebo server-side.
12. **Nikdy necommit `.expo/`, `static-build/`, `ios/Pods/`, `android/.gradle/`.** Gitignore je v `.gitignore`, ale pozor při ručním `git add`.

---

## Jak tenhle dokument používat

- **Claude si ho musí přečíst před každou novou fází.** První prompt pro každou novou session: "Přečti `doc/frontend-rules.md` a drž se ho."
- **Když Claude poruší pravidlo, stačí napsat:** "Pravidlo §3.7 – cleanup v useEffect chybí, oprav."
- **Pokud pravidlo přestane dávat smysl**, updatuj tento dokument a prores změnu v commit message.

Tenhle dokument je **živý**. Revize každých 2–3 měsíce, podle toho, co v praxi drhne.
