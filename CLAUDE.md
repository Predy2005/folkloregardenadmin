# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Folklore Garden Admin is a full-stack monorepo for managing event reservations and staff at Folklore Garden. It consists of:
- **PHP Symfony 7.2 API** (`api/`) - RESTful backend with JWT authentication
- **React 18 + TypeScript SPA** (`client/`) - Admin dashboard frontend
- **Express dev server** (`server/`) - Vite middleware integration; same port (3000) for both dev and prod
- **Shared TypeScript types** (`shared/types.ts`) - Type definitions for client-API communication
- **Mobile app** (`Shift-Manager/artifacts/mobile/`) - Expo React Native app pro personál a řidiče

## Common Commands

### Development
```bash
# Frontend + integrated dev server (Vite middleware uvnitř Express)
npm run dev              # http://localhost:3000 (s HMR)

# Production build + run (žádný HMR, statický bundle z dist/)
npm run build
npm run start            # http://localhost:3000

# Backend Symfony API (samostatný proces)
cd api
composer install
php -S localhost:8000 -t public

# Type checking
npm run check
```

**Pozor:** `npm run dev` i `npm run start` běží na **stejném portu 3000**. Pokud měníš zdrojáky a nevidíš změny, zkontroluj `lsof -iTCP:3000 -sTCP:LISTEN` — pokud tam je `node dist/index.js`, máš spuštěný production build (žádný HMR). Zastav ho a pusť `npm run dev`.

### Database (Doctrine ORM)
```bash
cd api
php bin/console doctrine:migrations:diff      # Generate migration from entity changes
php bin/console doctrine:migrations:migrate   # Apply migrations
php bin/console make:entity --regenerate App\\Entity  # Regenerate getters/setters
```

**Production migrace (bez `php bin/console`):** po každé nové Doctrine migraci
v `api/migrations/` **musí** vzniknout i PHP ekvivalent v
[`api/prod_migrations/`](api/prod_migrations/README.md). Produkční server
často nemá CLI/console přístup, takže se migrace spouští přes prohlížeč
(`run.php?token=...`) nebo SSH (`php run.php`). Každý skript je idempotentní,
běží v transakci, zapisuje se do `doctrine_migration_versions`, aby Doctrine
migraci znovu nespustil. **Konvence:** název souboru = timestamp Doctrine verze,
např. `20260423100000_mobile_auth.php` ← `Version20260423100000.php`.

**Diff produkuje smetí**: `migrations:diff` občas vyplodí ALTER INDEX rename
operace (`uniq_xxx → UNIQ_HASH`) jako vedlejší efekt drift mezi entitami a DB.
Před commitem migraci **vždy očisti** — ponech jen SQL relevantní pro tvou
změnu, smaž rename indexy. Tyhle renames nedávají žádný benefit a můžou rozbít
ručně psaný SQL.

**Destructive ops:** úplný reset schématu (všechny tabulky) najdeš v
[`docs/ops/wipe-production-db.md`](docs/ops/wipe-production-db.md) spolu se
SQL skriptem [`sql/wipe_all_tables.sql`](sql/wipe_all_tables.sql). **Nikdy
nespouštět bez aktuální zálohy produkce.**

### Testing
```bash
cd api
vendor/bin/phpunit                # Run PHP tests
```

### SonarQube (lokální, pre-commit)
```bash
docker compose -f docker-compose.sonar.yml up -d   # nahodí SonarQube na :9000
# v UI vytvoř projekt key 'folkloregardenadmin', vygeneruj token a exportuj:
export SONAR_TOKEN="sqa_..."
export SONAR_HOST_URL="http://localhost:9000"
```

Pre-commit hook spouští `scripts/sonar-check.sh`, který:
1. Sebere staged `.php`/`.ts`/`.tsx`/`.js`/`.jsx` soubory (exkluduje `vendor/`, `node_modules/`, `dist/`, `migrations/`).
2. Pustí `sonar-scanner` přes Docker s `sonar.inclusions=<staged>` a `qualitygate.wait=true`.
3. Stáhne issues přes `/api/issues/search` pro dotčené komponenty.
4. Pokud jsou issues, zavolá `claude -p ... --dangerously-skip-permissions` se subagentem `sonar-review` (`.claude/agents/sonar-review.md`), který je opraví v souborech a re-stagne je.

Hook **neblokuje commit** když Sonar neběží nebo `SONAR_TOKEN` chybí — jen warning. Vypnutí pro jediný commit: `git commit --no-verify` nebo `SONAR_TOKEN="" git commit`.

Plný setup: [`docs/ops/sonar-setup.md`](docs/ops/sonar-setup.md). Manuální spuštění Claude review mimo commit: `/agents sonar-review` v Claude Code.

### Security audit (lokální, pre-commit)
Pre-commit hook spouští `scripts/security-check.sh` **před** Sonarem (rychlejší blokátory první):

1. **gitleaks** přes Docker — scan staged souborů na hardcoded secrets (~1s). Při nálezu commit zablokován.
2. **Claude /security-review** (subagent `.claude/agents/security-review.md`) v headless režimu — sémantický audit:
   - OWASP top 10 (XSS, SQL injection, auth bypass, ...)
   - Symfony: `#[IsGranted]` coverage na destruktivních endpointech
   - React: `dangerouslySetInnerHTML` s user inputem, `eval`/`new Function`
   - Server: CSP a security headers (Express přes `helmet` v `server/index.ts`, Symfony přes `SecurityHeadersListener`)
   - Vědomé výjimky: hardcoded OpenAI key v **git historii** `client/src/modules/reservations/utils/ai.ts` (od §1.1 refactoru klíč v aktuálním kódu už není — FE volá BE proxy; revokace na OpenAI dashboardu je úkol uživatele), `auth_token` v `localStorage` (jen INFO).

Findings se zapíšou do `.security-findings.json`. **CRITICAL/HIGH → commit ZABLOKOVÁN**, MEDIUM/LOW → warning. Manuální oprava: `/agents security-review` v Claude Code.

Agent **neopravuje automaticky** (na rozdíl od Sonaru) — security fixy potřebují posouzení. Bypass: `git commit --no-verify`.

**Security headers — současný stav:**
- Express (`server/index.ts`): `helmet` s CSP. V dev `script-src` povoluje `unsafe-inline`/`unsafe-eval` kvůli Vite HMR a WebSocket pro HMR. V prod jen `'self'`, plus HSTS 2 roky. `style-src` má `unsafe-inline` i v prod (Tailwind/Radix runtime styly — nonce-based CSP je out of scope). API endpoint pro CSP `connect-src` se bere z `process.env.API_BASE_URL`, default `https://api.folkloregarden.cz` v prod.
- Symfony API (`api/src/EventListener/SecurityHeadersListener.php`): drakonický CSP `default-src 'none'; frame-ancestors 'none'` (API vrací jen JSON), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (geo/mic/camera off), HSTS na HTTPS. Registrován přes `#[AsEventListener]` s prioritou `-10` (po nelmio_cors). **Výjimka** — paths `^/api/doc*` (Swagger UI HTML) dostávají uvolněný CSP `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https://cdn.jsdelivr.net https://validator.swagger.io; font-src 'self' data: https://cdn.jsdelivr.net; connect-src 'self'` — Nelmio servíruje swagger-ui assets z jsdelivr CDN a `loadSwaggerUI()` běží jako inline `<script>`. Reálné API endpointy (`/api/reservations`, `/api/auth`, …) drží striktní `default-src 'none'`.

### Build
```bash
npm run build    # Vite builds React → dist/public/, esbuild bundles Express server → dist/index.js
npm run start    # Run production build
```

## Architecture

### Backend (api/src/)
- **Controllers**: API endpoints with `#[Route(...)]` attributes. Klíčové: `ReservationController`, `EventController`, `EventGuestController`, `EventStaffController`, `PaymentController`, `AuthController`, `StaffMemberController`, `PartnerController`, `PartnerCategoryController`, `PartnerContactController`, `AssistantController`.
- **Entities**: 40+ Doctrine ORM entit v `Entity/`. Core: `Reservation`, `Event`, `EventGuest`, `EventStaffAssignment`, `Payment`, `User`, `StaffMember`, `Partner`, `PartnerCategory`, `PartnerContact`, `ReservationFoods`, `DrinkItem`, `FoodDrinkPairing`.
- **Repositories**: Data access layer extending `ServiceEntityRepository`.
- **Services**: Business logic — `ReservationEmailService`, `EventGuestSyncService`, `EventGuestStatsService`, `Assistant\AssistantOrchestrator`, `Assistant\AiGatewayService`, `Import\ExcelReservationReader`, `Import\StaffExcelImportService`.
- **Enums**: `FoodMenu` enum s pricing logikou.

### Frontend (client/src/)
- **Routing**: Wouter (lightweight router). Top-level App v `App.tsx`, autenticated routes v `routes/AuthenticatedRoutes.tsx`.
- **State**: TanStack Query pro server state, React Context pro auth/theme/currency.
- **UI Components**: Radix UI primitives v `shared/components/ui/`, styled s Tailwind CSS. Sdílené non-trivial komponenty (např. `MultiSelectFilter`, `NationalityInput`, `PageHeader`, `InfoTooltip`) jsou v `shared/components/`.
- **API Client**: Axios s JWT interceptorem v `shared/lib/api.ts`.
- **Modulární struktura**: každá doména má vlastní složku `client/src/modules/<domain>/` s podsložkami `pages/` (route komponenty), `components/`, `hooks/`, `dialogs/`, `utils/`, `types/`. Nikdy nepřidávat stránky do `client/src/pages/` — taková složka neexistuje.
- **Frontend pravidla**: kompletní set v `docs/frontend-rules.md` (file size limits, naming, structure, performance). Před prací s `/client` si je vždycky projeď.
- **Refactor stav (2026-05-15)**: po sweepu §2.X (`docs/refactor-todo.md`) všechny velké soubory rozděleny — Lint **0 warnings, 0 errors**, **0 cycles**. Zbývající `*Page.tsx` orchestrátory nad 250 ř. jsou akceptované (prop drilling, další split by zhoršil čitelnost). Mechanická práce (color tokens §3.1+§3.2, AI BE proxy §1.1, JWT cookie §1.2) je deferred.

### Authentication Flow
1. `POST /auth/login` returns JWT token **v JSON body** + **`Set-Cookie: auth_token=<jwt>; HttpOnly; SameSite=Lax`** (Phase A §1.2 refactoru).
2. Token stored in `localStorage` as `auth_token` (FE legacy flow). Cookie taky uložená browserem automaticky.
3. Axios interceptor adds `Authorization: Bearer {token}` to all requests. BE umí přijmout JWT i z **cookie** (Lexik `token_extractors.cookie.enabled: true`) — paralelní kanál pro budoucí Phase B (FE přejde na cookie-only).
4. Logout → BE smaže cookie (`Set-Cookie: auth_token=deleted; Max-Age=0`). FE musí navíc smazat `localStorage` (Phase A nezmění FE chování).
5. 401 responses trigger redirect to `/login`.

**Phase A vs Phase B vs Phase C** (viz `docs/refactor-todo.md` §1.2): Phase A = BE umí cookie (HOTOVO 2026-05-18). Phase B = FE přejde z localStorage na cookie, zapne `withCredentials: true`. Phase C = BE vypne Authorization header extractor (cookie-only). Phase B/C zůstávají TODO; mobile app má vlastní auth firewall (`MobileAuthController`, refresh tokens v DB), nedotčená.

**Permissions**: backend kontroly přes `#[IsGranted('<resource>.<action>')]` (např. `reservations.update`, `staff.delete`). Super admin role obchází všechny granular permissions. Frontend gate používá `useAuth().hasPermission('<resource>.<action>')`. **Nepoužíváme `ROLE_SUPER_ADMIN` jako gate** pro běžné akce — granular permissions umožňují adminům dělat běžné věci, super-admin si necháme pro destruktivní/system operace.

**Role policy (seed `SeedPermissionsCommand`):**
- `SUPER_ADMIN` (priority 100) — wildcard `*`, všechno včetně CRUD nad role/permission definicemi.
- `ADMIN` (priority 90) — všechny moduly + `permissions.read` + `permissions.update`, takže může **přiřazovat role** běžným uživatelům. Nemůže ale (a) přiřadit `SUPER_ADMIN` roli (gated v `PermissionController:149`), (b) editovat SUPER_ADMIN uživatele (gated v `PermissionService::canManageUser`), (c) měnit definice rolí/permissions samotných (to je SUPER_ADMIN-only).
- `MANAGER` (priority 70) a níž — `permissions.*` **nemají**, takže do user-role assignmentů nesmí.

### Key Patterns
- **API Client**: Use `api.get/post/put/delete` from `shared/lib/api.ts`
- **Data Fetching**: TanStack Query hooks (`useQuery`, `useMutation`)
- **Forms**: React Hook Form + Zod validation
- **Type Safety**: Všechny entity interfaces v `shared/types.ts`
- **Multipart upload**: Axios automaticky nastaví `Content-Type` s boundary, když pošleš `FormData`. Příklad: viz `ImportStaffDialog.tsx`.
- **Toast helpers**: `successToast(msg)`, `errorToast(error)` z `shared/lib/toast-helpers.ts`.

## Key Files

- `shared/types.ts` - All TypeScript interfaces for entities + enum labels (např. `DRINK_OPTION_LABELS`, `PERSON_TYPE_LABELS`).
- `client/src/shared/lib/api.ts` - Axios client with JWT interceptor.
- `client/src/routes/AuthenticatedRoutes.tsx` - Route definitions for logged-in users (lazy imports).
- `client/src/shared/components/MultiSelectFilter.tsx` - Reusable multi-select filter widget (Popover + checkboxes + search).
- `client/src/shared/components/ui/input.tsx` - Wrapped `<input>` s globálním fixem: `type="number"` se po kliknutí auto-selectne (řeší UX problém s vedoucími nulami).
- `api/src/Config/SpecialDateRules.php` - Pricing logic by date.
- `api/config/packages/security.yaml` - Authentication configuration.
- `api/prod_migrations/_runner.php` + `run.php` - Production migration runner (PDO, idempotentní).

## Environment Variables

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:8000   # or https://api.folkloregarden.cz
```

### Backend (api/.env)
```
DATABASE_URL=postgresql://app:password@localhost:5432/folkloregardencz
JWT_PASSPHRASE=<secret>
COMGATE_MERCHANT=<id>
COMGATE_SECRET=<secret>
MAILER_DSN=smtp://...

# AI gateway pro chatbota /api/assistant/chat (AssistantOrchestrator → AiGatewayService).
# Aktuálně jediný server (OpenAI). Konfigurace v api/config/services.yaml.
AI_SERVER_1_URL=https://api.openai.com
AI_SERVER_1_KEY=<openai-key>
AI_SERVER_1_MODEL=gpt-4.1-mini

# Token pro spuštění production migrací přes prohlížeč (run.php?token=...)
PROD_MIGRATION_TOKEN=<long-secret>
```

`api/.env` je v `.gitignore` (root `.gitignore:10`), takže reálné klíče tam můžou zůstat.

## API Endpoints Reference

Kompletní dokumentace přes **Swagger UI** (Nelmio API Doc Bundle):
- `GET /api/doc` — kompletní admin dokumentace, gated `ROLE_ADMIN` přes **HTTP Basic Auth** proti `User` entitě (přihlas se svým existujícím admin username + heslem, otevře se nativní browser dialog).
- `GET /api/doc/partner` — partner-restricted subset, gated `ROLE_PARTNER_SWAGGER` přes **HTTP Basic Auth** proti `partner.swagger_username` + `swagger_password_hash` (bcrypt). Credentials generuje admin v `/partners/{id}/edit` → karta `SwaggerAccessCard` (vedle `ApiKeyCard`). Plaintext heslo se zobrazí jen jednou; partner ho dostane bezpečným kanálem.
- `GET /api/doc.json` / `/api/doc/partner.json` — OpenAPI 3.0 JSON (gated stejně jako UI).

Konfigurace v `api/config/packages/nelmio_api_doc.yaml` (areas `default` + `partner` filtrované přes `path_patterns`). Bezpečnostní schémata: `Bearer` (JWT) a `ApiKey` (X-API-Key header). Routy v `api/config/routes/nelmio_api_doc.yaml`.

**Firewally & gates** (security.yaml, **pořadí matters** — specifické před obecnými):
- Firewall `partner_swagger_ui` (pattern `^/api/doc/partner`) + access `ROLE_PARTNER_SWAGGER` → `http_basic` proti `PartnerSwaggerUserProvider` (dohledá Partner podle `swaggerUsername`, aktivní + nenull hash).
- Firewall `admin_swagger_ui` (pattern `^/api/doc`) + access `ROLE_ADMIN` → `http_basic` proti `app_user_provider` (existující User entita).
- Firewall `partner_api` (pattern `^/api/partner-api`) — custom `PartnerApiKeyAuthenticator` na X-API-Key (beze změny, akorát rozšířen o alias key path, viz níž).

**Auto-fill X-API-Key v partner Swageru:** Po úspěšném Basic Auth loginu Twig override `templates/bundles/NelmioApiDocBundle/SwaggerUi/index.html.twig` zavolá `SwaggerAccessService::issueAliasKey()` přes Twig extension `partner_alias_key()`. Vystavený alias má tvar `fgsk_swagger_<base64url(payload)>.<base64url(hmac)>` — payload `{pid, exp}`, podpis HMAC-SHA256 s `APP_SECRET`, TTL **1h**. JS pak volá `ui.preauthorizeApiKey('ApiKey', alias)` a Swagger UI začne automaticky posílat `X-API-Key: fgsk_swagger_…` na všechny "Try it out" requesty. `PartnerApiKeyAuthenticator` rozpoznává alias prefix a verifikuje HMAC místo SHA-256 lookupu — reálný production klíč v UI nikdy nefiguruje, alias je vázán jen na konkrétní partner ID a po 1h exspiruje.

Endpointy jsou v Swaggeru viditelné automaticky (Nelmio sken `#[Route]` attributů). Pro popisky parametrů a response schémat přidávat `OpenApi\Attributes` (`#[OA\Tag]`, `#[OA\Response]`, `#[OA\Parameter]`) — postupně, není nutné dělat naráz.

Doplňková legacy česká dokumentace v `api/readme.md`. Klíčové endpointy:

- `POST /auth/login` — Authentication (JWT)
- `GET /api/reservations` — List reservations
- `POST /api/reservations` — Create
- `PUT /api/reservations/{id}` — Update
- `GET /api/events` — List events with nested data
- `POST /api/payment/create` — Create Comgate payment
- `POST /api/assistant/chat` — AI chatbot orchestrating tools

### Bulk operace (konvence)

**Pravidlo**: bulk endpointy mají stejné gate jako odpovídající single-item operace (granular permission, ne `ROLE_SUPER_ADMIN`). Frontend selection (checkboxy) a Export (xlsx generovaný v prohlížeči) **nejsou gateované** — vidí je každý, kdo má `*.read`. Destruktivní akce v bulk panelu jsou gateované přes `hasPermission()`.

| Endpoint | Gate |
|---|---|
| `PUT /api/staff/bulk-update` | `staff.update` (whitelist polí: `isActive`, `position`, `hourlyRate`, `fixedRate`) |
| `DELETE /api/staff/bulk-delete` | `staff.delete` |
| `POST /api/staff/import/preview` + `commit` | `staff.create` |
| `PUT /api/events/{id}/guests/bulk-update` | `events.update` |
| `DELETE /api/events/{id}/guests/bulk-delete` | `events.update` |
| `POST /api/events/{id}/guests/set-group-count` | `events.update` |
| `PUT /api/reservations/bulk-update` | `reservations.update` |
| `DELETE /api/reservations/bulk-delete` | `reservations.delete` |
| `POST /api/reservations/bulk-check` | `reservations.delete` |

## UI Patterns

### Multi-select filtry
Použít `MultiSelectFilter` z `shared/components/MultiSelectFilter.tsx`. Stav drží `Set<string>`. Prázdný set = "vše". Vícenásobný výběr = OR mezi položkami v rámci filtru, AND mezi filtry. Použito v `/staff` (4 filtry: Stav, Pozice, Sazba, Typ); doporučeno i pro nové stránky.

### Bulk action toolbar
Šablona: bar se objeví, když `selectedIds.size > 0`. Vlevo `Badge` s počtem, vpravo `Zrušit výběr`. Mezi nimi tlačítka:
- Akce read-only (Export do xlsx) → vždy viditelné.
- Akce update (změna stavu/pozice atd.) → gated přes `hasPermission('<x>.update')`.
- Smazat → `variant="destructive"`, gated přes `hasPermission('<x>.delete')`.

Reálné příklady: `/staff` (`StaffMembersPage.tsx`), `/reservations` (`ReservationTable.tsx`), `/events/<id>/edit` tab Hosté (`GuestsTab.tsx`), tab Personál v rezervaci (`ReservationPersonsSection.tsx`).

### Modální dialogy
- Pro create/edit formy → `Dialog` z `shared/components/ui/dialog.tsx`.
- Pro destruktivní confirm → `AlertDialog` z `shared/components/ui/alert-dialog.tsx`. **Nikdy nepoužívej `window.confirm`/`window.prompt`** — jsou nestylované a špatně se používají na tabletech.

### Number inputs
`Input type="number"` má globální fix v `shared/components/ui/input.tsx`: po kliknutí (mouse focus) se obsah **auto-selectne**, takže můžeš rovnou přepsat hodnotu (řeší UX problém, kdy kurzor skočil za nulu a vznikalo `015` místo `15`). `requestAnimationFrame` je tam kvůli browser quirku, kdy `select()` na `mousedown` jinak hned přepíše prohlížeč.

### Hromadné mutace s closure-aware logikou
Pokud potřebuješ v cyklu volat mutation, která pracuje s aktuálním stavem (např. `removePerson`), **nepiš to jako cyklus** — způsobí to stale closure (každá iterace vidí původní stav). Místo toho přidej batch metodu (`removePersonsAt(indices[])`, `setPersonsCount(target)`) do parent hooku, která provede vše v jediném `updateXxx` callu. Příklad: `useReservationPersons.ts`.

## Domain Modules

### Reservations (`/reservations`, `/reservations/{id}/edit`)

**Entity pole** (`Reservation.php`):
- `contact_email` (varchar 255, **nullable** od migrace `Version20260428111718`) — Email rezervace je volitelný (kontakty importované z xlsx někdy email nemají). Pokud je vyplněn, validuje se jako email; prázdný string se ukládá jako `NULL`.
- `contact_note` (text, nullable) — Poznámka k rezervaci. V UI vždy `<Textarea>`.
- `ordered_by` (text, nullable, migrace `Version20260428085420`) — Kdo objednávku provedl, pokud jiná osoba než kontakt (typicky zaměstnanec CK / asistent / recepce hotelu). UI: `<Textarea>` pod poznámkou v `ContactTab` i v `ReservationEditPage`.

**Default nápojový balíček** v rezervaci:
- `PersonEntry.drinkOption` ∈ `none` / `welcome` / `allin`. Český label v `shared/types.ts` `DRINK_OPTION_LABELS`: `allin → "Neomezeně"` (přejmenováno z "All inclusive").
- Při vytvoření osoby (formulář, AI parser, bulk add, set-count) se default určuje takto: **`infant` → `none`, ostatní → `allin`**.
- Helper `defaultDrinkOption(type)` v `useReservationPersons.ts` (frontend); backend `ReservationController.php:470` a `:1173` má identickou type-aware logiku.
- `FoodDrinkPairing.isDefault` flag existuje, ale **dnes není napojený na auto-přiřazení** — jen UI badge na `/foods/{id}/edit` → tab Nápoje.

**Hromadná úprava počtu osob v rezervaci** (`ReservationPersonsSection.tsx`):
- Selection toolbar nad listem osob: checkbox "Označit vše", badge "X vybráno", tlačítka "Upravit počet" (Dialog s inputem cílového počtu) a "Smazat vybrané" (AlertDialog).
- Implementace přes batch metody `removePersonsAt` a `setPersonsCount` v `useReservationPersons.ts` — viz [Hromadné mutace s closure-aware logikou](#hromadné-mutace-s-closure-aware-logikou).

### Events (`/events`, `/events/{id}/edit`)

**Events list view** (rozšířený, nahrazuje Google Sheet TODO):
- Sloupce: Datum/čas · Akce (jméno + Highlight ⭐ + typ + tagy + prostor + organizátor) · Hosté (paid/free split) · Tým (manažerka + hl. číšník) · Kapela/show · Status · akční tlačítka.
- Manažerka (coordinator) z `Event.coordinatorId` (interní) nebo `external_coordinator_name` (externí, suffix "(ext)").
- Hl. číšník + kapela agregované z `EventStaffAssignment` joinovaného s `staff_member.position`. **Hl. číšník** = pozice `HEAD_WAITER`. **Kapela** = pozice `MUSICIAN`, `BAND`, `DANCER`, `DANCE_GROUP`, `SOUND_TECH` (pak v tooltipu).
- Highlight = tag `Highlight` v `eventTags` array.
- `EventController::list` agreguje vše v 1 batch DQL query (žádný N+1) — vrací navíc pole `coordinator`, `managers`, `headWaiters`, `band`, `eventTags`.
- **Filtrování** (`EventFilters.tsx`, vše klientské v `filterAndSortEvents` z `utils/eventFilters.ts`):
  - **Time tabs**: Nejbližší / Nadcházející / Prošlé / Všechny.
  - **Date range** (Od / Do): když je vyplněno, **přebíjí time tab** (UI ho zašedne) a řadí vzestupně podle data.
  - **Hlavní multi-select**: Typ, Status, Manažerka (auto-naplněné z aktuálních eventů, searchable).
  - **Highlight ⭐**: toggle, zobrazí jen akce s tagem `Highlight` v `eventTags`.
  - **Search**: hledá napříč názvem, organizátorem, manažerkou, tagy, hl. číšníky i kapelou.
  - **Pokročilé filtry** (collapsible) — `Prostor` multi-select + tri-state toggles (klik = ano → ne → vypnuto): `Kapela`, `Manažerka`, `Hl. číšník`, `Neplatící`, `Má hosty` + `Min/Max počet hostů` (number inputs).
  - Counter aktivních filtrů + tlačítko "Zrušit vše (N)".
  - `EventFilterOptions` interface drží všechny stavy filtrů; všechny boolean filtry jsou tristate `boolean | null` kde `null` = filtr neaktivní.

**Default čas a doba trvání akce**:
- **Čas akce**: `19:30:00` (předtím `18:00:00`). Hodnota se uplatní v `EventController::create` (POST `/api/events`) a v `createFromReservation`. Nastaveno v `EventController.php:469` a `:556`.
- **Doba trvání**: `150 minut` (předtím `120`). Migrace `Version20260428121513` mění DB default; existující akce zůstávají na svých hodnotách. Property na entitě `Event.durationMinutes = 150`.

**Bulk operace na hostech**:
- `bulk-update` / `bulk-delete` standardně.
- `set-group-count` — hromadná úprava počtu hostů ve skupině (per-rezervace nebo "Manuálně přidaní"). Body: `{ reservationId: int|null, targetAdults: int, targetChildren: int }`. Při zmenšení preferuje smazat hosty, kteří nejsou `isPresent`/`isPaid`.

**Confirmation badge u personálu** (mobilní app potvrzení účasti):
- `EventStaffAssignment` má `assignmentStatus` (`ASSIGNED`/`CONFIRMED`/`DECLINED`), `confirmedAt`, `declineReason`.
- Sjednocený badge `ConfirmationBadge` exportovaný z `tabs/staff/StaffCategorySection.tsx` se používá v 3 místech: edit eventu, dashboard `StaffCategoryRow`, dashboard `StaffDialog/ContactsList`.
- Dashboard má identickou funkcionalitu jako edit (toggle present/absent, mark absent, smazat) — vizuálně kompaktnější pro tablet.

### Staff / Personnel (`/staff`)

**Bulk akce**: aktivovat/deaktivovat, změnit pozici, exportovat (xlsx, klientský), smazat. Selection (checkboxy) a Export jsou viditelné vždy; destruktivní akce dle `hasPermission('staff.update' | 'staff.delete')`.

**Multi-select filtry** (Stav / Pozice / Sazba / Typ) přes `MultiSelectFilter`.

**Import xlsx** (`ImportStaffDialog.tsx`):
- Endpoints: `POST /api/staff/import/preview` (jen parse, žádný DB write) → `POST /api/staff/import/commit`.
- Excel struktura: sekce `ČÍŠNÍK`/`KUCHAŘ`/`POMOCNÉ SÍLY`/`KAPELA`/`BARMAN`/`HOSTESKA`/`OCHRANKA`/`ŘIDIČ` → mapuje na kódy `WAITER`/`CHEF`/`CLEANER`/`MUSICIAN`/`BARTENDER`/`HOSTESS`/`SECURITY`/`DRIVER`.
- Telefon normalizuje (`"608 946 196"` → `"+420608946196"`).
- Deduplikace: nejdřív přes telefon, pak přes (jméno+příjmení), case-insensitive.

**Empty-string-to-null fix**: `StaffMemberController::create`/`update` převádí prázdné stringy nullable polí (`email`, `phone`, `address`, `position`, `emergencyContact`, `emergencyPhone`, `notes`) na `NULL`. Bez tohoto by `UNIQUE(email)` constraint padal při více členech bez emailu.

### Tickets / TODO (`/tickets`, `/tickets/{id}`)
Modul nahrazuje Excel TODO list — admin/manager hlásí, developer řeší.

**Entity** (migrace `Version20260429120611`):
- `ticket` — title, description, status (`OPEN`/`IN_PROGRESS`/`WAITING_FOR_INFO`/`RESOLVED`/`CLOSED`/`WONTFIX`), priority (`LOW`/`NORMAL`/`HIGH`/`CRITICAL`), type (`BUG`/`FEATURE`/`QUESTION`/`IMPROVEMENT`), source (`MANUAL`/`AUTO_ERROR_LOG`), `module` tag, `createdBy`/`assignedTo` (User FK SET NULL), `error_hash` + `stack_trace` pro auto-tickety, `occurrence_count`.
- `ticket_comment` — vlákno odpovědí, `is_internal` flag.
- `ticket_attachment` — soubory v `var/uploads/tickets/`, servírované přes auth-protected endpoint (ne přímou URL).

**API** (gate `tickets.*`):
- `GET /api/tickets` (filtry: `status[]`, `priority[]`, `type[]`, `assignedToMe`, `search`) + `/api/tickets/counts`
- `POST /api/tickets`, `GET/PUT/DELETE /api/tickets/{id}`
- `POST /api/tickets/{id}/comments`, `DELETE /api/tickets/{id}/comments/{cid}`
- `POST /api/tickets/{id}/attachments` (multipart, optional `commentId`)
- `GET /api/tickets/{id}/attachments/{aid}` (auth-protected file delivery)

**Auto-error capture** (`ErrorTicketListener`, `kernel.exception` priority -100):
- Při HTTP 5xx vytvoří/zvedne `occurrence_count` na ticketu se stejným `error_hash` (md5 z class + message + 3 stack frames).
- 4xx ignoruje. Endpoint `/api/tickets/*` se přeskakuje (nelogovat sám sebe).
- **Aktivní jen v `prod` env** — v dev má profiler.

**UI** (`client/src/modules/tickets/`):
- `/tickets` — list s multi-select filtry (status/priorita/typ) + search; defaultně skrývá `RESOLVED`/`CLOSED`/`WONTFIX`.
- `/tickets/{id}` — detail s vláknem komentářů, change-status / change-priority dropdown v sidebaru. Místo mazání má **"Dokončit a uzavřít"** akci (sets `status=CLOSED`); zavřené tickety nezmizí, jen se přestanou zobrazovat v default listu (zobrazí se po výběru ve Status filtru). DELETE endpoint na BE zůstává, ale není v UI dosažitelný.
- `CreateTicketDialog` + textarea v detailu mají `onPaste` listener (helper `extractImagesFromClipboard`) — **Ctrl+V s obrázkem v clipboardu** uploaduje screenshot.
- `WAITING_FOR_INFO` → po odpovědi creatora se ticket auto-otevře (status `OPEN`).
- Sidebar link "Tickety / TODO" gated na `tickets.read` (Bug ikona).

**Permissions seed**: `ROLE_ADMIN` + `ROLE_SUPER_ADMIN` mají full set (read/create/update/delete/comment); `ROLE_MANAGER` (pokud existuje) má `read/create/comment`.

**Excel TODO seed** (migrace `Version20260429120800`): 19 položek z původního Excel TODO listu se naseedovalo s odpovídajícími statusy (`HOTOVO` → `RESOLVED`, atd.).

### Contacts / Adresář (`/contacts`)

**Pole entity `Contact`**: `name`, `email`, `phone`, `company`, faktura
(`invoice_name`, `invoice_email`, `invoice_phone`, `invoice_ic`, `invoice_dic`),
adresa (`billing_street`, `billing_city`, `billing_zip`, `billing_country`),
`pohoda_code` (legacy ERP číslo, např. `0123`, `,5067`, `+5002`),
`bank_account`, `note`, `source_reservation_id`. Migrace `Version20260514112710`.

**Jednorázový import z Pohody** (`api/prod_migrations/20260514112800_pohoda_contacts_import.php`):
- Zdroj: `api/prod_migrations/data/contacts_pohoda_20260514.json` (2624 záznamů,
  sloučení z `podklady/43079149.RTF` + `podklady/zakaznici_rtf.csv` přes Pohoda Číslo).
- Strategie: **upsert** — primárně dedup podle `pohoda_code`, sekundárně podle
  přesné shody jména (case-insensitive) u kontaktů bez `pohoda_code`. Nikdy
  nepřepisuje neprázdné existující hodnoty (`COALESCE(NULLIF(...), :new)`).
- Spuštění na produ: `php api/prod_migrations/run.php 20260514112800` (CLI)
  nebo `run.php?token=...&only=20260514112800` (browser).
- Idempotentní (záznam ve `doctrine_migration_versions`).

### Partners (`/partners`, `/partners/{id}/edit`, `/partner-categories`)

**Partner API key** (admin generuje, partner se autentizuje přes `X-API-Key`) — **plná dokumentace v [`docs/partner-api.md`](docs/partner-api.md)** (architektura, lifecycle, security model, curl příklady, troubleshooting):
- DB sloupce na `partner`: `api_key_hash` (SHA-256 hex, 64 znaků, partial unique index `WHERE NOT NULL`), `api_key_last4` (poslední 4 znaky pro UI), `api_key_generated_at`, `api_key_last_used_at` (audit kdy se klíč naposled použil k auth). Migrace `Version20260515093000` + `Version20260515094500`, prod `20260515093000_partner_api_key.php` + `20260515094500_partner_api_key_last_used.php`. Plaintext klíče se nikdy neukládá.
- Service `App\Service\PartnerApiKeyService` — `generate(Partner)` vrátí plaintext jednou (formát `fgsk_<48hex>`), `revoke(Partner)` vynuluje sloupce, `hash(string)` pro porovnání při auth.
- Admin endpointy (gate `partners.update`): `POST /api/partner/{id}/api-key` (generuje/rotuje, vrací plaintext jednou), `DELETE /api/partner/{id}/api-key` (zneplatní).
- UI: `ApiKeyCard` v profilu partnera (`/partners/{id}/edit`), pod `BillingCard`. Stavy: žádný klíč → tlačítko "Vygenerovat"; existující klíč → display `...last4` + datum + buttony Rotovat/Zneplatnit. Při vygenerování Dialog s plaintext klíčem (auto-select, copy button) + varování "uvidíš jen jednou".
- **Partner auth flow** (Phase 2A+B+C hotovo):
  - `App\Security\PartnerApiKeyAuthenticator` — custom Symfony authenticator čte `X-API-Key`, SHA-256 hashuje, dohledá Partner přes unique index na `apiKeyHash`. Při neaktivním partneru / neplatném klíči vrací 401 JSON.
  - `App\Security\PartnerSecurityUser` — wrapper Partner ↔ `UserInterface`, role `ROLE_PARTNER`, identifier `partner-{id}`. Z controlleru `$this->getUser()->getPartner()`.
  - Firewall `partner_api` (security.yaml) pattern `^/api/partner-api`, stateless, custom_authenticator. **Před** `main` firewallem.
  - Access control `^/api/partner-api → ROLE_PARTNER`.
  - Audit: každá úspěšná auth nastaví `partner.api_key_last_used_at = NOW()` (`PartnerApiKeyAuthenticator::authenticate`).
- **Partner endpointy** (`PartnerApiController`, prefix `^/api/partner-api`, `#[IsGranted('ROLE_PARTNER')]`):
  - `GET /me` — profile aktuálního partnera + audit timestamps. Také auth verification.
  - `GET /reservations?limit=50&offset=0` — list vlastních rezervací (filter `partnerId = current`), order `date DESC, id DESC`, pagination clamped na 1-200.
  - `GET /reservations/{id}` — detail s ownership checkem. Cizí rezervace vrací **404** (ne 403, neunikne info o existenci).
  - `POST /reservations` — vytvoří rezervaci s `partnerId = current` (klient nepřebije, hodnota se ignoruje pokud ji pošle), status `RECEIVED`, source `PARTNER_API`, clientComeFrom = jméno partnera. Validace: `date` (YYYY-MM-DD, ne dnes po 18:00), `contactName`/`contactPhone`/`contactNationality` povinné, email volitelný (validovaný pokud zadán), `persons[]` musí mít aspoň 1 záznam s type ∈ `adult|child|infant`. Menu validováno proti `SpecialDateRules::getAllowedMenus`. Cena se počítá serverem (`SpecialDateRules::getBasePrice` + `FoodMenu::getPrice`), klientem zadané ceny se ignorují. Response: `{id, status, date, totalPrice, currency}`.
  - `PATCH /reservations/{id}/cancel` — zruší vlastní rezervaci. Whitelist stavů `RECEIVED|CONFIRMED|WAITING_PAYMENT`. Stavy `PAID`/`AUTHORIZED`/`CANCELLED` vrací **409** s clear error message — refund je admin-only flow.

**Bezpečnostní invarianty partner API (testováno):**
- Ownership check ve všech detail/cancel endpointech (filter na `partnerId = current` před vrácením dat).
- `partnerId` při create vždy přepsaný z auth contextu, **ne** z request body.
- Cancel whitelist statusů — nelze zrušit zaplacené rezervace přes API.
- Všechny error responses jsou `application/json` (auth, validace, ownership 404 i status 409).

**Swagger UI access pro partnera** (zrcadlí Partner API key flow, ale pro interaktivní dokumentaci):
- DB sloupce na `partner`: `swagger_username` (VARCHAR(64), partial UNIQUE index `WHERE NOT NULL`), `swagger_password_hash` (bcrypt), `swagger_credentials_generated_at`. Migrace `Version20260516100000`, prod `20260516100000_partner_swagger_credentials.php`.
- Service `App\Service\SwaggerAccessService` — `generateCredentials(Partner)` vrátí `{username, password}` jednou (heslo plaintext, hash do DB), `revokeCredentials(Partner)` vynuluje sloupce. Plus alias key issuer: `issueAliasKey(Partner) → 'fgsk_swagger_<base64payload>.<base64hmac>'` (TTL 1h, HMAC-SHA256 s `APP_SECRET`) a `verifyAliasKey(string) → ?int` (vrací partner ID, nebo `null` při neplatném/expirovaném podpisu).
- Admin endpointy (gate `partners.update`): `POST /api/partner/{id}/swagger-credentials` (generuje/rotuje, vrací plaintext heslo jednou), `DELETE /api/partner/{id}/swagger-credentials` (zneplatní).
- Auth flow: `PartnerSwaggerUserProvider` dohledá Partner podle `swaggerUsername` (jen aktivní + neprázdný hash) → `PartnerSwaggerUser` wrapper s rolí `ROLE_PARTNER_SWAGGER` (přístup **jen** do `/api/doc/partner`, ne do reálných `/api/partner-api/*` endpointů). `http_basic` firewall ověří heslo přes bcrypt.
- Auto-fill X-API-Key: Twig override `templates/bundles/NelmioApiDocBundle/SwaggerUi/index.html.twig` volá Twig extension `partner_alias_key()` (`App\Twig\SwaggerAccessExtension`); pokud je `Security::getUser()` instance `PartnerSwaggerUser`, vystaví alias a JS po `loadSwaggerUI()` zavolá `ui.preauthorizeApiKey('ApiKey', alias)`. `PartnerApiKeyAuthenticator` rozpoznává prefix `fgsk_swagger_` přes `SwaggerAccessService::isAliasKey()` a verifikuje HMAC podpis namísto SHA-256 hash lookupu. U alias klíčů se **neupdatuje** `apiKeyLastUsedAt` — slouží jen pro Swagger Try-it-out, ne pro audit produkčního provozu.
- UI: `SwaggerAccessCard` v profilu partnera (`/partners/{id}/edit`), pod `ApiKeyCard`. Stavy: žádné credentials → "Vygenerovat přístup"; existující → username + datum + Rotovat/Zneplatnit. Při generování Dialog s plaintext username + password (oba copy buttony) + odkaz na `/api/doc/partner`.


**Pole entity `Partner`**: standardní (`name`, `partnerType`, `email`, `phone`,
`address`, `ic`, `dic`, `bankAccount`, …) + `pohoda_code` (legacy ERP číslo,
namapování partnera na záznam z Pohoda exportu, migrace `Version20260514112710`).

**Dynamický číselník kategorií** (`PartnerCategory`):
- Tabulka `partner_category` (`name`, `slug` UNIQUE, `displayOrder`, `isActive`, `createdAt`) — migrace `Version20260428114400`. Default seed: TRAVEL_AGENCY (Cestovní kancelář), GUIDE (Průvodce), HOTEL (Hotel), OTHER (Ostatní).
- `Partner.partnerType` zůstává jako **string slug** — žádný FK constraint na `partner_category`. Smazání kategorie nezruší partnery, jen jim hodnota osamí (zobrazí se v select jako "(smazaná kategorie)" aby se select neresetoval).
- API: `/api/partner-categories` GET (autenticated), POST/PUT/DELETE (`partners.update`).
- UI: stránka `/partner-categories` (CRUD), tlačítko "Spravovat kategorie" v hlavičce `/partners`. Dropdown v editaci partnera (`BasicInfoCard`) i sloupec v listu `/partners` načítá popisky z `usePartnerCategories()`. Fallback labely (RECEPTION, DISTRIBUTOR) pro legacy slugy v `DEFAULT_PARTNER_CATEGORY_LABELS`.

**Kontaktní osoby u partnera** (`PartnerContact`):
- Tabulka `partner_contact` (`partner_id` FK CASCADE, `firstName`, `lastName`, `email`, `phone`, `notes`, `displayOrder`, `createdAt`, `updatedAt`) — migrace `Version20260428120554`. 1 partner → N kontaktů.
- API:
  - `GET /api/partners/{id}/contacts` (`partners.read`)
  - `POST /api/partners/{id}/contacts` (`partners.update`)
  - `PUT /api/partner-contacts/{id}` (`partners.update`)
  - `DELETE /api/partner-contacts/{id}` (`partners.update`)
- UI: nový tab **Kontaktní osoby** v editaci partnera (`PartnerContactsTab.tsx`) — tabulka kontaktů + Dialog pro create/edit (jméno, příjmení, email, telefon, poznámka, pořadí). Klik na řádek = edit, koš = AlertDialog confirm + delete.

### Foods / Menu (`/foods`, `/foods/{id}/edit`)

**Pole entity `ReservationFoods`** (rozšíření migrace `Version20260428113803`):
- `notes` (text, nullable) — Interní poznámka k jídlu pro kuchyň/personál. Nezobrazuje se hostovi.
- `allergens` (text, nullable) — Volný text alergenů (typicky čárkami oddělený seznam: "Lepek, Mléko, Vejce, Sója"). UI: 2 `<Textarea>` v `BasicInfoTab.tsx`.

**Drink pairings** (`FoodDrinkPairing`):
- Admin v `/foods/{id}/edit` → tab Nápoje páruje nápoje s jídly (s `isDefault` flag a `surcharge`).
- **Reálné auto-přiřazení v rezervaci dnes nefunguje** — flag se jen zobrazuje jako badge.

## AI / asistent

Dva oddělené AI integrační body:

1. **Backend chatbot** (`/api/assistant/chat`) — Symfony `AssistantOrchestrator` + `AiGatewayService`, klíče v `api/.env`. Podporuje function calling / tool use přes `ToolRegistry`. Při selhání AI vrací 502.
2. **Frontend parser rezervací** (`client/src/modules/reservations/utils/ai.ts`) — od §1.1 refactoru volá AI **přes BE proxy** `POST /api/reservations/ai-proxy` (gated `reservations.create`, viz `ReservationAiController`). FE pošle messages array, BE volá `AiGatewayService` se stejným klíčem z env jako chatbot. **Klíč už není v JS bundle**, ale zůstává v git historii (rotaci řeší user sám, viz `feedback_no_api_key_changes.md`).
   - FE zachovává všechnu parsing/cleanup/JSON-repair logiku: `parseMultiReservationWithAI`, `cleanEmailThread`, `extractJsonFromContent`, `repairTruncatedJson`, `parseReservationsDeterministic` (regex-based pro strukturované tour-agency emaily), `extractEmailMetadata` (extrakce kontaktu + sdílených údajů). BE je jen tenký proxy pro chat-completion.
   - BE proxy validuje: `messages` array povinné, `role ∈ {system,user,assistant}`, celkový content limit 50 000 znaků (413 jinak). Při selhání AI vrací 502.
   - **Schema je liberální**: `AiMultiReservationEntrySchema.date` je nullable (poptávky bez data), `reservations` může být prázdné pole (pouze pozdrav/podpis bez objednávky). UI fallback v `useAIAssistant.ts` vytvoří jednu prázdnou rezervaci s notou "doplň ručně".
   - System prompt instruuje AI, aby chybějící datum nahradila `null` (ne prázdný string, ne vynechání), a prázdný `reservations: []` jen pokud email vůbec nemá rezervační info.
   - Při Zod chybě parser ukáže konkrétní pole + zprávu (ne jen "neočekávaný formát").

Oba systémy volají jediný AI server (OpenAI) přes `AiGatewayService::chat` — `POST /v1/chat/completions` z BE s klíčem `AI_SERVER_1_KEY`.

## Adding New Features

### Nový API endpoint (s perzistencí)
1. Vytvoř/uprav Entitu v `api/src/Entity/`.
2. Vytvoř Repository v `api/src/Repository/` (extends `ServiceEntityRepository`).
3. Vytvoř Controller s `#[Route]` atributy a `#[IsGranted(...)]` gate.
4. Vygeneruj migraci: `php bin/console doctrine:migrations:diff` → očisti drift (jen ALTER/CREATE relevantní pro tvou změnu).
5. Aplikuj lokálně: `php bin/console doctrine:migrations:migrate`.
6. **Vytvoř production migraci** v `api/prod_migrations/{timestamp}_{nazev}.php` — idempotentní PDO skript volaný `ProductionMigrationRunner`. Použij `IF NOT EXISTS` / `IF EXISTS` checks.
7. Přidej TypeScript interface do `shared/types.ts`.

### Nová frontend stránka
1. Vytvoř komponentu v `client/src/modules/<domain>/pages/<NázevPage>.tsx`.
2. Přidej route v `client/src/routes/AuthenticatedRoutes.tsx` (lazy import + `<Route path>`).
3. Přidej sidebar link v `client/src/shared/components/AppSidebar.tsx`, pokud je top-level navigace.
4. Pro data fetching použij TanStack Query hook v `client/src/modules/<domain>/hooks/`.
5. Pro formuláře: React Hook Form + Zod schema. Pro multi-select filtry: `MultiSelectFilter`.
6. Pro permissions gate: `useAuth().hasPermission('<x>.<action>')`.

### Konvence pro pojmenování slovů ve formulářích
- Empty string z formuláře → `NULL` v DB pro nullable sloupce. Backend by měl mít helper `emptyToNull` (viz `StaffMemberController` nebo `ReservationFoodsController`).
- Number inputy: stav v komponentě jako `string`, převod na `Number` až při submitu / mutation. Tím se vyhneš tomu, že `0` přetekne v UI.

## Mobile App (`Shift-Manager/artifacts/mobile/`)

Expo React Native app pro personál a řidiče. Hlavní routy:
- `/(tabs)/profile` — profil personalisty / řidiče
- `/event-detail` — detail přiřazené akce
- `/login` + `/pin-unlock` — auth (PIN-based)

Backend endpointy v `api/src/Controller/Mobile*Controller.php` (`MobileAuthController`, `MobileMeController`). Service `MobileAuthService` + `MobileAccountProvisioningService` + `MobileDataService`. Refresh tokens v `RefreshToken` entitě, push notifikace přes `Push\PushNotificationService`.
