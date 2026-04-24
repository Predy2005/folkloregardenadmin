# Local development — jak aplikaci rozběhnout

> **Kdy číst:** poprvé na stroji; při úpravě něčeho, co se týká buildu / dev
> serveru; když něco nejede a potřebuješ si ověřit setup.
>
> **Rozsah:** jak lokálně pustit **mobilní appku** (`artifacts/mobile`) — to je
> hlavní produkt. Sekundárně `api-server` a `mockup-sandbox`.
>
> **Co tenhle dokument NENÍ:** deployment / produkční build / EAS Submit. To
> přijde samostatně, až bude relevantní.

---

## 1. Prerekvizity (jednorázově)

### 1.1 Nástroje na stroji

| Nástroj | Verze | Jak ověřit |
|---|---|---|
| **Node.js** | 24.x (LTS) | `node -v` |
| **pnpm** | 10.x | `pnpm -v` — pokud chybí: `corepack enable && corepack prepare pnpm@latest --activate` |
| **git** | libovolná nová | `git --version` |

Projekt **nejede přes npm ani yarn** — kořenový `preinstall` je shodí. Pokud ti
`pnpm` chybí, nejrychlejší cesta je corepack (ship-ne s Node 24).

Volitelné (podle toho, kde budeš mobil testovat — viz §3):

| Pokud chceš… | Nainstaluj |
|---|---|
| testovat na vlastním telefonu | **Expo Go** z App Store nebo Google Play |
| testovat na iOS Simulatoru | **Xcode** z App Store (~10 GB, Mac only) |
| testovat na Android emulatoru | **Android Studio** + v něm vytvořit AVD (Pixel 8, API 34+) |

### 1.2 První install repozitáře

```bash
git clone <repo>
cd Shift-Manager
pnpm install
```

První `pnpm install` může zabrat pár minut (Expo + Metro = hodně závislostí).
Supply-chain guard (`minimumReleaseAge: 1440`) odmítne balíček mladší než 24 h
— viz `pnpm-workspace.yaml` pokud narazíš na error typu *"is younger than…"*.

### 1.3 Proměnné prostředí (optional override)

Repo **nemá** `.env.example` — žádná env var není pro běžný lokální chod
**povinná**. Default API URL je hardcoded v `artifacts/mobile/constants/api.ts`.

Pokud potřebuješ mířit jinam než na default CRM:

```bash
# artifacts/mobile/.env (gitignorovaný)
EXPO_PUBLIC_API_URL=https://staging-api.example.com
```

**Důležité:** `EXPO_PUBLIC_*` prefix je **povinný** — jiné proměnné Expo Babel
plugin do bundle nevloží (budou `undefined` na device).

---

## 2. Mobilní appka — rychlý start (2 minuty)

```bash
cd artifacts/mobile
pnpm exec expo start
```

V terminálu se objeví **QR kód** a menu příkazů:

```
› Press s │ switch to development build
› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web
› Press r │ reload app
› Press j │ open debugger
› Press ? │ show all commands
```

Expo běží přes **Metro bundler** na `http://localhost:8081`. Appka je v **Expo
Go compatible** režimu — nemá `ios/` ani `android/` složku, nic se nebuilduje
nativně.

> **Nepoužívej `pnpm run dev`** — `dev` script ve `package.json` je teď
> `pnpm exec expo start` (jednoduchý), ale pouštíš ho **z `artifacts/mobile`
> adresáře** (ne z rootu), jinak si Metro nenajde konfigurační soubory.
> Z rootu jde rovnocenně `pnpm --filter @workspace/mobile exec expo start`.

---

## 3. Kde appku spustit

Expo Go umí 4 cíle. Každý má svoje kompromisy:

### 3.1 Reálný telefon přes Expo Go (doporučeno pro start)

1. V App Store / Google Play stáhni **Expo Go**.
2. V terminálu pustíš `pnpm exec expo start`.
3. **iOS:** naskenuj QR Fotoaparátem → otevře Expo Go.
   **Android:** v Expo Go → "Scan QR code".

Telefon **musí být na stejné Wi-Fi** jako Mac. Kanceláře s firewall, VPN nebo
gost Wi-Fi mezi tebou a Mac to blokují — řeší `--tunnel`:

```bash
pnpm exec expo start --tunnel
```

Tunel jde přes ngrok, je pomalejší, ale jede odkudkoli.

### 3.2 iOS Simulator (Mac, rychlá iterace UI)

```bash
pnpm exec expo start
# po startu stiskni: i
```

Expo Go se do simulátoru nainstaluje sám (poprvé pár vteřin). Pokud máš víc
Simulátorů, Expo použije ten, co běží; jinak spustí default.

Pokud máš v terminálu *"Unable to boot simulator"* — spusť Simulator.app ručně
(Xcode → Open Developer Tool → Simulator) a pak `i`.

### 3.3 Android Emulator

1. V Android Studio otevři **Device Manager** a spusť AVD (Pixel 8 / API 34+).
2. V Expo terminálu stiskni `a`.

Expo Go do emulátoru nainstaluje automaticky. Pokud ne, v emulátoru otevři
Google Play → nainstaluj Expo Go → pak v Expo stiskni `a`.

### 3.4 Web (browser, nejrychlejší, omezené)

```bash
pnpm exec expo start
# stiskni: w
```

Otevře `http://localhost:8081`. Jede přes `react-native-web`.

**Limity webového režimu:**

- `expo-haptics` — no-op
- `expo-location` — jiné API, často nefunguje na localhost bez HTTPS
- `expo-glass-effect` (iOS 26 native tabs) — nefunguje, padá na `ClassicTabLayout`
- `@react-native-async-storage/async-storage` — mapuje se na `localStorage` (jiné limity velikosti, jiný storage per origin)
- `WebView` v `transport-map.tsx` — funguje jako `<iframe>` s omezením same-origin

Dobré na **rychlé ladění layoutu**. **Nepoužívat pro verifikaci feature** před PR.

### 3.5 Kdy co použít

| Situace | Cíl |
|---|---|
| Rychlá iterace layoutu, ladění stylů | iOS Simulator |
| Testování reálných gest, haptiky, kamery | Reálný telefon přes Expo Go |
| Android-specific bug | Android Emulator |
| Sdílení příkladu s kolegou bez jeho setupu | `--tunnel` + reálný telefon |
| Screenshot do PR | Simulator (čistší rámeček než fotka telefonu) |
| Před mergem | **Oba** OS (iOS + Android) aspoň jedno spuštění |

---

## 4. API server (`artifacts/api-server`)

Aktuálně má jen `/api/health`. Lokálně:

```bash
PORT=3000 pnpm --filter @workspace/api-server run dev
```

`PORT` je **povinný** — server se bez něj neuvede (v `src/index.ts` to hází).

Zkouška:

```bash
curl http://localhost:3000/api/health
```

**Pozor — mobilní appka tenhle server NEVOLÁ.** Cílí na externí CRM
(`apifolklore.testujeme.online`, viz `doc/architecture.md` §2.1). Pokud bys
chtěl appku nasměrovat na lokální API server, musel bys:

1. Implementovat odpovídající endpointy v `api-server` (`/auth/login`, `/api/reservations`, atd.)
2. Nastavit `EXPO_PUBLIC_API_URL=http://<IP-tvého-Macu>:3000` (ne `localhost` — ten telefon nezná)
3. Najít IP Macu: `ipconfig getifaddr en0`

Dneska nemá smysl — CRM běží jinde.

---

## 5. Mockup sandbox (`artifacts/mockup-sandbox`)

Vite + React + Tailwind playground na shadcn komponenty.

```bash
cd artifacts/mockup-sandbox
PORT=5173 BASE_PATH=/ pnpm run dev
```

**Obě** env vars jsou povinné — `vite.config.ts` jinak hodí error.

Pak `http://localhost:5173/`. Vite auto-reloaduje.

---

## 6. DB (`lib/db`)

Vyžaduje běžící **PostgreSQL** a `DATABASE_URL`:

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/folklore pnpm --filter @workspace/db run push
```

`drizzle-kit push` rovnou naleje schema. **Dev only** — produkce půjde přes
migrace, tohle je scaffold. Schema je dnes prázdné (`lib/db/src/schema/index.ts`
jen re-exportuje), takže `push` nic konkrétního nevytvoří.

---

## 7. Běžné problémy (troubleshooting)

### 7.1 „Unable to resolve module…"

Metro cache se rozsypala (typicky po přidání balíčku nebo git rebase):

```bash
pnpm exec expo start --clear
```

Pokud nepomůže, tvrdě vyčisti:

```bash
rm -rf node_modules .expo
cd ../..
pnpm install
```

### 7.2 „Network response timed out" na telefonu

Telefon se Metra nechytá. Dvě varianty:

- **Stejná Wi-Fi, ale routed through firewall:** `pnpm exec expo start --tunnel`
- **Jiná síť:** stejně `--tunnel`

### 7.3 „Metro already running on 8081"

```bash
lsof -iTCP:8081 | grep LISTEN
kill <PID>
```

nebo `pkill -f metro`.

### 7.4 iOS Simulator: bílá obrazovka po otevření

Obvykle race condition při prvním spuštění Expo Go v Simulatoru:

```bash
# v terminálu Expo CLI
shift+i   # switch iOS device
```

Nebo zavři Simulator a otevři jinou model (např. z iPhone 16 → iPhone 15).

### 7.5 Android: „Unable to install Expo Go"

Emulator nemá Google Play Services. Zakládej **AVD s Google Play image**
(v Device Manageru sloupec "Services" říká "Google Play", ne "Google APIs").

### 7.6 Fonts se nenačetly (appka je po loginu v Helvetice)

`@expo-google-fonts/inter` v `_layout.tsx` se někdy nechytne poprvé — restart
appky (`r` v Expo CLI) to řeší. Pokud ne, check Metro log, jestli se font
skutečně nafetchoval.

### 7.7 TypeScript hlásí chyby, které v editoru nejsou

Project-wide typecheck:

```bash
pnpm run typecheck
```

Editor (WebStorm/VSCode) může používat jinou verzi TS nebo zastaralý cache —
restartuj TS server (v WebStorm: *File → Invalidate Caches → Restart*).

### 7.8 `pnpm install` selhává na „is younger than the configured minimum release age"

Supply-chain guard (`minimumReleaseAge: 1440` v `pnpm-workspace.yaml`). Balíček
musí být publikovaný aspoň 24 h. Řešení: počkat, nebo zvolit starší verzi.
**Nesnižuj `minimumReleaseAge`** a nepřidávej do `minimumReleaseAgeExclude` nic
bez pochopení rizika (viz komentář v `pnpm-workspace.yaml` + `CLAUDE.md`).

---

## 8. Typecheck a lint (před commitem)

```bash
# z kořene workspace
pnpm run typecheck       # tsc napříč libs + artifacts
pnpm run build           # typecheck + build všeho
```

ESLint config zatím v projektu **není** (v `doc/frontend-rules.md` §12 je
target config — přidá se během refaktoru). Prettier je nainstalovaný, ale
pre-commit hook (Husky) taky ne — v budoucnu.

---

## 9. Kde pokračovat

- **`doc/architecture.md`** — co kde appka čte a zapisuje, strom screenů/komponent
- **`doc/frontend-rules.md`** — kódová pravidla (co smíš, co ne)
- **`doc/stack.md`** — stack přehled (Node, React, TS, Expo verze)
- **`CLAUDE.md`** — top-level orientation (architektura celého monorepa)

---

## 10. Keeping this doc alive

Stejný princip jako u ostatních dokumentů — updatuj **ve stejném PR**, když:

| Udělal jsi | Updatuj |
|---|---|
| Přidal povinnou env var pro lokální běh | §1.3 |
| Změnil dev script v `package.json` některého artefaktu | §2 / §4 / §5 |
| Přidal native modul, který vyžaduje dev client (nefunguje v Expo Go) | §3.1 + přidej varování |
| Narazil na časově náročnou gotcha, která se bude opakovat | §7 |
| Migroval auth z AsyncStorage na SecureStore / odstranil `@folklore_auth` | §4 pokud se změní flow připojení k lokálnímu API |
