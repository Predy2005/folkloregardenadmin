# Folklore Garden Admin

Full-stack monorepo pro správu akcí, rezervací, personálu, skladu a financí areálu **Folklore Garden**. Projekt se skládá z PHP/Symfony API (`api/`) a React SPA (`client/`), které společně tvoří kompletní provozní systém venue – od veřejných rezervací přes interní event management, platby a fakturaci, až po plánování personálu, sklad, recepty, transport a vizuální editor půdorysu.

---

## Obsah

- [Technologický stack](#technologický-stack)
- [Architektura](#architektura)
- [Struktura repozitáře](#struktura-repozitáře)
- [Rychlý start](#rychlý-start)
- [Prostředí a konfigurace](#prostředí-a-konfigurace)
- [Hlavní moduly (business funkce)](#hlavní-moduly-business-funkce)
- [Frontend – struktura a routy](#frontend--struktura-a-routy)
- [Backend – entity a servisy](#backend--entity-a-servisy)
- [API endpointy – detailní soupis](#api-endpointy--detailní-soupis)
- [Autentizace a oprávnění](#autentizace-a-oprávnění)
- [Platby (Comgate)](#platby-comgate)
- [Asistent (AI chatbot) a parser rezervací](#asistent-ai-chatbot-a-parser-rezervací)
- [Floor plan editor](#floor-plan-editor)
- [Databázové migrace](#databázové-migrace)
- [Testy](#testy)
- [Destruktivní operace](#destruktivní-operace)
- [Přehled dokumentace](#přehled-dokumentace)

---

## Technologický stack

### Backend (`api/`)
- **PHP 8.2+**, **Symfony 7.2**
- **Doctrine ORM** (PostgreSQL) + Doctrine Migrations
- **LexikJWTAuthenticationBundle** (JWT autentizace)
- **NelmioCorsBundle** (CORS)
- **Symfony Mailer** (SMTP pro potvrzovací maily)
- **Comgate** platební brána (přes HTTPClient)
- Testy: **PHPUnit**

### Frontend (`client/`)
- **React 18.3** + **TypeScript 5.6**, build přes **Vite 5**
- **Wouter** (lightweight routing)
- **TanStack React Query 5** (server state)
- **Axios** (HTTP klient s JWT interceptorem)
- **Radix UI** + **shadcn/ui** komponenty, **Tailwind CSS 3.4**
- **React Hook Form** + **Zod** (formuláře a validace)
- **Konva** + **react-konva** (canvas editor půdorysu)
- **dnd-kit**, **Recharts**, **Framer Motion**, **date-fns / dayjs**
- **pdfjs-dist**, **mammoth** (parsování dokumentů při importu)

---

## Architektura

```
┌────────────────────┐      HTTPS/JSON      ┌────────────────────┐
│ React SPA (Vite)   │  ◀───────────────▶   │ Symfony API        │
│ client/ + server/  │   Bearer JWT auth    │ api/               │
│ :3000 (dev/prod)   │                      │ :8000 (dev)        │
└────────────────────┘                      └──────────┬─────────┘
                                                       │
                                             ┌─────────▼─────────┐
                                             │ PostgreSQL        │
                                             │ Doctrine ORM      │
                                             └───────────────────┘
                                                       │
                                      ┌────────────────┼────────────────┐
                                      ▼                ▼                ▼
                                 Comgate API       SMTP (Mailer)        OpenAI
                                 (platby)          (potvrzení)          (assistant + parser)

      ┌──────────────────┐     JWT + refresh
      │  Mobile (Expo)   │  ◀────────────────▶  Symfony API
      │  Shift-Manager/  │     /api/mobile/*
      └──────────────────┘
```

- Stateless REST, komunikace JSON.
- Autentizace: `POST /auth/login` → JWT → uložen v `localStorage` jako `auth_token` → Axios interceptor posílá `Authorization: Bearer …`.
- Reakce na `401` vyvolává redirect na `/login`.
- Frontend (React SPA) je servován přes Express server (`server/index.ts`) s integrovaným Vite middleware v dev módu; v produkci tentýž Express servíruje statický build z `dist/public/`. **Stejný port 3000** v dev i prod.
- Mobilní aplikace (Expo React Native v `Shift-Manager/`) komunikuje s `/api/mobile/*` endpointy přes JWT + refresh tokens.

---

## Struktura repozitáře

```
folkloregardenadmin/
├── api/                         # Symfony 7.2 backend
│   ├── src/
│   │   ├── Controller/          # ~50 controllerů (viz API reference)
│   │   ├── Entity/              # ~65 Doctrine entit
│   │   ├── Repository/          # Data access
│   │   ├── Service/             # Business logic (Assistant, Email, Export, …)
│   │   ├── Config/              # SpecialDateRules (cenotvorba)
│   │   └── Enum/                # FoodMenu, …
│   ├── config/                  # Symfony konfigurace
│   ├── migrations/              # Doctrine migrace
│   ├── public/index.php         # entrypoint
│   ├── tests/                   # PHPUnit testy
│   └── readme.md                # starší, detailní CZ dokumentace API
│
├── client/                      # React SPA
│   └── src/
│       ├── App.tsx              # providers + router
│       ├── routes/              # AuthenticatedRoutes, PublicRoutes
│       ├── modules/             # business moduly (viz níže)
│       ├── shared/              # sdílené komponenty/hooky/lib
│       ├── pages/               # standalone stránky (404)
│       └── hooks/               # globální hooky
│
├── shared/
│   └── types.ts                 # TS typy sdílené mezi klientem a API
│
├── docs/                        # provozní dokumentace
│   └── ops/                     # runbooky (wipe DB, …)
├── sql/                         # pomocné SQL skripty
├── podklady/                    # vstupní podklady (import, PDF, RTF, CSV)
├── CLAUDE.md                    # pokyny pro Claude Code
├── SYSTEM_DOCUMENTATION.md      # širší systémová dokumentace
├── EVENTS.md, TODO*.md          # pracovní poznámky k modulům
└── package.json, vite.config.ts, tsconfig.json, tailwind.config.ts
```

---

## Rychlý start

### Požadavky
- Node.js 18+, npm nebo yarn
- PHP 8.2+, Composer 2
- PostgreSQL 14+

### 1) Instalace závislostí
```bash
# Frontend (z rootu)
npm install

# Backend
cd api && composer install
```

### 2) Konfigurace prostředí
```bash
# Frontend: vytvořte .env v rootu
echo "VITE_API_BASE_URL=http://localhost:8000" > .env

# Backend: vytvořte api/.env.local (viz ENV_SETUP.md)
```
Minimální `api/.env.local`:
```dotenv
APP_ENV=dev
APP_SECRET=<random>
DATABASE_URL=postgresql://app:password@localhost:5432/folkloregardencz
JWT_PASSPHRASE=<secret>
MAILER_DSN=smtp://user:pass@host:587
COMGATE_MERCHANT=<id>
COMGATE_SECRET=<secret>
COMGATE_URL=https://payments.comgate.cz/v1.0
COMGATE_NOTIFY_URL=http://localhost:8000/api/payment/notify
COMGATE_TEST=true
ANTHROPIC_API_KEY=<key>    # jen pokud používáte asistenta
```

### 3) Databáze
```bash
cd api
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
```

### 4) Spuštění
```bash
# Backend (z api/)
php -S localhost:8000 -t public

# Frontend + Express dev server (z rootu)
npm run dev          # http://localhost:3000 (Vite middleware + HMR)
```

> **Pozor:** `npm run dev` (development) i `npm run start` (production build) běží na **stejném portu 3000**. Pokud měníš zdrojáky a nevidíš změny, zkontroluj `lsof -iTCP:3000 -sTCP:LISTEN` — pokud tam je `node dist/index.js`, máš spuštěný production build (žádný HMR). Zastav ho a pusť `npm run dev`.

### Další užitečné příkazy
```bash
npm run check            # TypeScript type-check
npm run build            # produkční build (dist/)
cd api && vendor/bin/phpunit   # PHP testy
cd api && php bin/console doctrine:migrations:diff   # diff migrace
```

---

## Prostředí a konfigurace

| Proměnná | Strana | Popis |
|---|---|---|
| `VITE_API_BASE_URL` | FE | URL backendu (dev `http://localhost:8000`, prod `https://api.folkloregarden.cz`) |
| `DATABASE_URL` | BE | PostgreSQL connection string |
| `JWT_PASSPHRASE` | BE | passphrase pro JWT klíče v `api/config/jwt/` |
| `MAILER_DSN` | BE | SMTP DSN – odesílatel `info@folkloregarden.cz` |
| `COMGATE_*` | BE | merchant, secret, URL, notify URL, test flag |
| `ANTHROPIC_API_KEY` | BE | Claude API klíč (AI asistent) |
| `APP_ENV` / `APP_SECRET` | BE | standard Symfony |

Kompletní seznam s defaulty je v **`ENV_SETUP.md`**.

---

## Hlavní moduly (business funkce)

### Core
- **Autentizace a uživatelé** – JWT login, registrace (admin only), forgot/reset password, role a granularní oprávnění.
- **Dashboard** – KPI (rezervace, obrat, obsazenost), grafy, rychlé akce.

### Rezervace
- Veřejný formulář → `POST /reservations` (cena podle `SpecialDateRules`, menu dle `FoodMenu`, transfer).
- Interní správa: detail, editace, bulk operace, statistiky, import z XLSX (preview + commit), vazba na event.
- **Pole** (od 04/2026):
  - `contact_email` je **nullable** (kontakty importované z xlsx někdy nemají email).
  - `ordered_by` (text) — kdo objednávku provedl, pokud jiný než kontakt (např. zaměstnanec CK).
  - Default `drinkOption` u nově vytvořené osoby: **`allin` ("Neomezeně")** pro všechny kromě kojenců.
- Hromadná úprava počtu osob v rezervaci přes batch metody `removePersonsAt` / `setPersonsCount` (closure-aware) — UI Dialog s cílovým počtem + AlertDialog confirm před smazáním.
- Typy rezervací, blokace dat (disabled dates).
- Platby přes Comgate – vytvoření, notifikace, status, seznam.

### Eventy (privátní akce)
- Event = zastřešující entita pro větší akci (např. svatba, firemní večeře), vytvořená z rezervace nebo samostatně.
- **Default čas akce** `19:30:00`, **default doba trvání** `150 minut` (od 04/2026).
- Guesti (sync z rezervací), jídla a nápoje (EventMenu / EventBeverage), schedule, vouchery, transport.
- **Floor plan** – vizuální editor stolů (Konva): správa stolů, usazování hostů, šablony, kopírování mezi akcemi, návrh usazení, waiter view.
- Hromadná úprava počtu hostů ve skupině přes `set-group-count` (per-rezervace nebo "Manuálně přidaní"); při zmenšení preferuje smazat hosty, kteří **nejsou** `isPresent`/`isPaid`.
- Finanční dashboard eventu, platební přehled, útraty u stolu, pokladna eventu.
- Personál: automatický výpočet požadavků podle formule, přiřazení, docházka, výplata. Sjednocený `ConfirmationBadge` (potvrdil/odhlásil/čeká) v editaci i na dashboardu.

### Personál
- Staff members, role, přiřazení k rolím, docházka.
- Staffing formulas – pravidla pro automatické navržení obsazení eventu podle počtu hostů.

### Finance
- **Pokladna (Cashbox)**: hlavní pokladna + pokladny za eventy, pohyby, kategorie pohybů, audit log, přesuny mezi pokladnami, uzávěrky.
- **Faktury**: vystavení z rezervace (deposit + final), preview, PDF, odeslání e-mailem, dobropisy, bulk operace.
- **Kurzy měn** (ExchangeRate) – správa vícemenových kurzů.
- **Pricing** – defaulty (dospělý/dítě/infant), date overrides, cena pro konkrétní datum.
- **Food pricing** – overridy cen a dostupnosti pro jídla v čase.

### Provoz
- **Sklad**: stock items, movements (příjem/výdej), plánované požadavky na event, batch pohyby.
- **Recepty**: recepty s ingrediencemi, import, napojení na menu (MenuRecipe).
- **Jídla a nápoje**: `ReservationFoods`, `Drinks`.
- **Transport**: dopravci, vozy, řidiči, přiřazení k eventům.
- **Venue**: budovy, místnosti, šablony půdorysů (designer).

### Partneři a kontakty
- **Kontakty** – CRM pro zákazníky, napojení na rezervace.
- **Partneři** – B2B (CK, hotely, průvodci, ostatní), provize, výpočet ceny, přehled rezervací a provizí.
  - **Kategorie partnerů** (`PartnerCategory`) – dynamický číselník (Cestovní kancelář, Průvodce, Hotel, Ostatní…), spravovatelný přes `/partner-categories`. Smazání kategorie nezruší partnery, jen jim hodnota osamí.
  - **Kontaktní osoby** (`PartnerContact`) – 1 partner → N osob (jméno, email, telefon, poznámka). Tab "Kontaktní osoby" v editaci partnera.
- **Vouchery** – poukazy, redemption, event vouchers.

### Správa
- **Role a permissions** – granularní (`{module}.{action}`), UserPermission override, role permissions matrix, `/auth/me` permissions.
- **Company settings** – fakturační údaje, logo, nastavení provozu.
- **Documentation topics** – znalostní báze (zdroj pro AI asistenta).
- **Help chatbot** – AI asistent integrovaný do UI, poháněný Claude.

---

## Frontend – struktura a routy

### Top-level (`client/src/`)
- `App.tsx` – providers (Auth, Query, Theme, Currency, Tooltip) + Wouter router
- `main.tsx` – entrypoint
- `routes/AuthenticatedRoutes.tsx` – autenticated router s lazy loading
- `modules/` – 18 business modulů (viz níže)
- `shared/` – komponenty, kontexty, hooky, lib
- `hooks/`, `pages/`, `components/`

### Moduly (`client/src/modules/`)
| Modul | Obsah |
|---|---|
| **auth** | Login, register, forgot/reset; `AuthContext`, `usePermissions`, guardy (`RequireRole`, `RequirePermission`); profil |
| **dashboard** | Hlavní dashboard s KPI a grafy |
| **reservations** | Seznam, filtr, detail, create/edit, bulk import, AI akce (chatbot utility `utils/ai.ts`) |
| **events** | CRUD, dashboard eventu (real-time), waiter view, taby (info, hosté, stoly – `TablesTab`), QuickActionsBar |
| **staff** | Staff CRUD, docházka, staffing formulas, bulk akce |
| **contacts** | Kontakty (CRM), editace |
| **partners** | Partneři, provize, vouchery, commission logs |
| **payments** | Přehled a párování plateb |
| **invoices** | Vytvoření, editace, PDF, deposit/final, hromadné akce |
| **cashbox** | Pokladny, pohyby, kategorie, přesuny |
| **foods** | Menu items, kategorie, pricing |
| **drinks** | Nápoje |
| **recipes** | Recepty s ingrediencemi |
| **stock** | Sklad – items, movements, requirements, receiving |
| **transport** | Dopravci, vozy, řidiči |
| **venue** | Budovy, místnosti, šablony, **Konva designer** půdorysů |
| **admin** | Uživatelé, role, permissions, nastavení, disabled dates, typy rezervací, cash kategorie, **help topics** |

### Hlavní routy (`AuthenticatedRoutes.tsx`)
Všechny routy jsou lazy-loaded.

**Veřejné (bez auth):**
- `/login`, `/register`, `/forgot-password`, `/reset-password/:token`

**Chráněné (v `AuthenticatedLayout`):**
- Core: `/`, `/profile`
- Rezervace: `/reservations`, `/reservations/new`, `/reservations/:id/edit`, `/reservations/import`
- Eventy: `/events`, `/events/new`, `/events/:id/edit`, `/events/:id/dashboard`, `/events/:id/waiter`
- Personál: `/staff`, `/staff/new`, `/staff/:id/edit`, `/staff-attendance`, `/staffing-formulas`
- Kontakty/partneři: `/contacts`, `/contacts/:id/edit`, `/partners`, `/partners/new`, `/partners/:id/edit`, `/partner-categories`, `/vouchers`, `/commission-logs`
- Finance: `/payments`, `/invoices`, `/invoices/new`, `/invoices/:id/edit`, `/cashbox`
- Provoz: `/foods`, `/foods/new`, `/foods/:id/edit`, `/drinks`, `/recipes`, `/recipes/new`, `/recipes/:id/edit`, `/stock-items`, `/stock-movements`, `/stock-requirements`, `/stock/receive`
- Venue: `/transport`, `/transport/new`, `/transport/:id/edit`, `/venue/buildings`, `/venue/templates`, `/venue/templates/:id/designer`
- Admin: `/settings`, `/pricing`, `/users`, `/roles`, `/disabled-dates`, `/reservation-types`, `/cash-categories`, `/help-topics`

### Sdílené komponenty (výběr)
- `HelpChatbot` (drawer s AI asistentem) + `shared/components/chatbot/*`
- `AppSidebar`, `PageHeader`, `StatCard`, `StatusBadge`
- `FormDialog`, `ConfirmDialog`, `BulkActionBar`
- `AutocompleteInput`, `CategoryCombobox`, `NationalityInput`, `CurrencySelect`, `SearchInput`, `FilterBar`
- `ui/*` – 50+ Radix/shadcn primitiv

### Sdílená knihovna (`shared/lib/`)
- `api.ts` – Axios instance + JWT interceptor
- `queryClient.ts` – TanStack Query konfigurace
- `formatting.ts`, `nationality.ts`, `toast-helpers.ts`, `utils.ts`, `constants.ts`, `query-helpers.ts`

---

## Backend – entity a servisy

### Kategorie entit (`api/src/Entity/`, ~65 entit)

**Auth/Users:** `User`, `UserLoginLog`, `Role`, `Permission`, `RolePermission`, `UserRole`, `UserPermission`

**Reservations:** `Reservation`, `ReservationPerson`, `ReservationFoods`, `ReservationTransfer`, `ReservationType`, `DisabledDates`, `Payment`

**Events:** `Event`, `EventGuest`, `EventSpace`, `EventTable`, `EventMenu`, `EventBeverage`, `EventSchedule`, `EventStaffRequirement`, `EventStaffAssignment`, `EventInvoice`, `EventTransport`, `EventVoucher`, `EventTag`

**Floor plan:** `Building`, `Room`, `FloorPlanElement`, `FloorPlanTemplate`

**Staff:** `StaffMember`, `StaffRole`, `StaffMemberRole`, `StaffAttendance`, `StaffingFormula`, `StaffReservationAssignment`

**Finance:** `Cashbox`, `CashMovement`, `CashMovementCategory`, `CashboxTransfer`, `CashboxClosure`, `CashboxAuditLog`, `TableExpense`, `Invoice`, `ExchangeRate`, `PricingDefault`, `PricingDateOverride`, `FoodItemPriceOverride`, `FoodItemAvailability`

**Stock / Recipes:** `StockItem`, `StockMovement`, `Recipe`, `RecipeIngredient`, `MenuRecipe`, `FoodDrinkPairing`, `DrinkItem`

**Transport:** `TransportCompany`, `TransportVehicle`, `TransportDriver`

**Partners / Contacts / Vouchers:** `Partner`, `PartnerCategory`, `PartnerContact`, `CommissionLog`, `Contact`, `Voucher`, `VoucherRedemption`

**AI Assistant / Docs:** `AssistantConversation`, `AssistantActionLog`, `DocumentationTopic`

**Meta:** `CompanySettings`

### Enum a konfigurace
- `App\Enum\FoodMenu` – katalog jídel (`getLabel`, `getPrice`); standardní menu 0 Kč, speciální +75 Kč.
- `App\Config\SpecialDateRules` – ceny dle data, povolená menu, cena transferu.

### Služby (`api/src/Service/`)
- `Assistant/*` – AI asistent (Claude integrace, detekce akcí, conversation store)
- `ReservationEmailService` – potvrzovací e-mail (CZ/EN dle nationality)
- `EventGuestSyncService` – sync hostů mezi Reservation a Event
- Další služby pro export, invoicing, pricing, seating atd.

---

## API endpointy – detailní soupis

> Base URL (dev): `http://localhost:8000`
> Většina endpointů vrací JSON. Autentizace přes `Authorization: Bearer <JWT>`.
> Pokud není uvedeno jinak, požaduje se přihlášený uživatel.

### 1. Autentizace a uživatelé

#### `AuthController` – prefix `/auth`
| Endpoint | Metoda | Popis | Oprávnění | Vstup | Výstup |
|---|---|---|---|---|---|
| `/auth/register` | POST | Registrace nového uživatele (admin) | `ROLE_ADMIN` | `{email, password}` | `{status, token}` |
| `/auth/login` | POST | Přihlášení (Symfony security firewall) | Public | `{email, password}` | `{token}` |
| `/auth/logout` | POST | Odhlášení | auth | – | `{status}` |
| `/auth/forgot-password` | POST | Žádost o reset hesla | Public | `{email}` | `{status}` (generic response) |
| `/auth/reset-password` | POST | Reset hesla pomocí tokenu | Public | `{resetToken, newPassword}` | `{status}` |
| `/auth/user` | GET | Info o přihlášeném uživateli | auth | – | `{id, email, username, roles, permissions, isSuperAdmin}` |
| `/auth/profile` | PUT | Úprava profilu / změna hesla | auth | `{email?, currentPassword?, newPassword?}` | `{status, user}` |

#### `UserController` – prefix `/api/users`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/users` | GET | Seznam uživatelů | `users.read` |
| `/api/users` | POST | Vytvoření uživatele – `{email, password, name?}` | `users.create` |
| `/api/users/{id}` | GET | Detail uživatele | `users.read` |
| `/api/users/{id}` | PUT/PATCH | Úprava – `{username?, email?, name?, role?, password?}` | `users.update` |
| `/api/users/{id}` | DELETE | Smazání | `users.delete` |

#### `UserLoginLogController`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/user-login-logs` | GET | Log přihlášení `{id, userId, loginAt, ipAddress, userAgent}` | `ROLE_ADMIN` |

#### `RoleController` – prefix `/api/roles`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/roles` | GET | Seznam rolí | `permissions.read` |
| `/api/roles` | POST | `{name, displayName?, description?, priority?, permissions?}` | `permissions.update` |
| `/api/roles/{id}` | GET | Detail | `permissions.read` |
| `/api/roles/{id}` | PUT/PATCH | Úprava | `permissions.update` |
| `/api/roles/{id}` | DELETE | Smazání | `permissions.update` |
| `/api/roles/{id}/permissions` | GET | Permissions role | `permissions.read` |
| `/api/roles/{id}/permissions` | PUT | `{permissions: []}` | `permissions.update` |

#### `PermissionController` – prefix `/api/permissions`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/permissions` | GET | Všechna oprávnění | `permissions.read` |
| `/api/permissions/grouped` | GET | Seskupená podle modulu | `permissions.read` |
| `/api/permissions/modules` | GET | Seznam modulů | `permissions.read` |
| `/api/permissions/users/{id}/roles` | GET | Role uživatele | `permissions.read` |
| `/api/permissions/users/{id}/roles` | PUT | `{roleIds: []}` | `permissions.update` |
| `/api/permissions/users/{id}/permissions` | GET | Efektivní oprávnění uživatele | `permissions.read` |
| `/api/permissions/users/{id}/permissions` | POST | `{permissionKey, action: 'grant'|'revoke'|'remove'}` | `permissions.update` |
| `/api/permissions/users/{id}/matrix` | GET | Matice s původem oprávnění | `permissions.read` |
| `/api/permissions/me` | GET | Oprávnění aktuálního uživatele | auth |

---

### 2. Rezervace

#### `ReservationController`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/reservations` | GET | Seznam (s osobami, platbami) | `reservations.read` |
| `/api/reservations` | POST | Interní vytvoření | `reservations.create` |
| `/api/reservations/{id}` | GET | Detail | `reservations.read` |
| `/api/reservations/{id}` | PUT | Úprava | `reservations.update` |
| `/api/reservations/{id}` | DELETE | Smazání | `reservations.delete` |
| `/api/reservation/{id}` | GET | Alt. detail (kompat.) | `reservations.read` |
| `/api/reservations/bulk-update` | PUT/PATCH | `{ids: [], updates}` | `reservations.update` |
| `/api/reservations/bulk-check` | POST | Validace hromadného vstupu (kontrola závislostí před smazáním) | `reservations.delete` |
| `/api/reservations/bulk-delete` | DELETE | `{ids: []}` | `reservations.delete` |
| `/api/reservations/statistics` | GET | Statistiky | `reservations.read` |
| `/api/reservations/{id}/payment-summary` | GET | Přehled plateb | `reservations.read` |
| `/api/reservations/{id}/payment-method` | PUT | Změna metody platby | `reservations.update` |
| `/api/reservations/{id}/mark-paid` | POST | Označit jako uhrazené | `reservations.update` |
| `/api/reservations/{id}/record-payment` | POST | `{amount, method, note?}` | `reservations.update` |
| `/api/reservations/{id}/adjust-payment` | POST | `{amount, reason?}` | `reservations.update` |
| `/api/reservations/{id}/linked-event` | GET | Navázaný event | `reservations.read` |
| `/reservations` | POST | **Veřejný** endpoint formuláře – viz [Struktura veřejné rezervace](#struktura-veřejné-rezervace) | Public |

##### Struktura veřejné rezervace (`POST /reservations`)
```jsonc
{
  "date": "2026-06-01",                             // YYYY-MM-DD; po 18:00 nelze rezervovat dnešek
  "contact": {
    "name": "Jan Novák",
    "email": "jan@example.com",
    "phone": "+420777123456",
    "nationality": "CZ",
    "note": "...",
    "clientComeFrom": "Hotelová recepce"
  },
  "invoice": {
    "sameAsContact": false,
    "name": "...", "company": "...", "ico": "...", "dic": "...",
    "email": "...", "phone": "..."
  },
  "transfer": { "selected": true, "count": 2, "address": "..." },
  "persons": [
    { "type": "adult",  "menu": "5" },
    { "type": "child",  "menu": "6" },
    { "type": "infant", "menu": "" }
  ],
  "agreement": true,
  "withPayment": true,
  "paymentMethod": "ALL"
}
```
Server:
- ověří e-mail a `agreement`,
- vypočte cenu: osoba (`SpecialDateRules`) + příplatek jídla (`FoodMenu::getPrice`) + transfer (`count × cena`),
- ověří `FoodMenu` proti povoleným menu pro daný den,
- uloží `Reservation` + `ReservationPerson[]`,
- při `withPayment: true` zavolá Comgate a vrátí `{ redirect }`,
- odešle potvrzovací HTML e-mail (CZ/EN).

#### `ReservationFoodsController` – prefix `/api/reservation-foods`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/reservation-foods` | GET | Seznam | auth |
| `/api/reservation-foods` | POST | `{name, description?, price, surcharge?, isChildrenMenu?}` | `foods.create` |
| `/api/reservation-foods/{id}` | PUT/PATCH | Úprava | `foods.update` |
| `/api/reservation-foods/{id}` | DELETE | Smazání | `foods.delete` |
| `/api/reservation-foods/bulk-update` | PUT/PATCH | `{ids, updates}` | `ROLE_SUPER_ADMIN` |
| `/api/reservation-foods/bulk-delete` | DELETE | `{ids}` | `ROLE_SUPER_ADMIN` |

#### `ReservationImportController` – prefix `/api/reservations/import`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/reservations/import/preview` | POST | multipart `files[]` – náhled importu (XLSX) | `reservations.create` |
| `/api/reservations/import/commit` | POST | multipart `files[]` – commit importu | `reservations.create` |

#### `ReservationTypeController` – prefix `/api/reservation-types`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/reservation-types` | GET / POST | Seznam / `{name, code, color?, sortOrder?, note?}` | `reservation_types.read` / `.create` |
| `/api/reservation-types/{id}` | PUT / DELETE | Úprava / smazání | `reservation_types.update` / `.delete` |

#### `DisableDatesController` – prefix `/api/disable-dates`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/disable-dates` | GET | Seznam blokací | `disabled_dates.read` |
| `/api/disable-dates` | POST | `{date?} | {dateFrom, dateTo?}, reason?, project?` | `disabled_dates.create` |
| `/api/disable-dates/{id}` | PUT | Úprava | `disabled_dates.update` |
| `/api/disable-dates/{id}` | DELETE | Smazání | `disabled_dates.delete` |

---

### 3. Eventy a floor plan

#### `EventController` – prefix `/api/events`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/events` | GET / POST | Seznam / vytvoření | `events.read` / `.create` |
| `/api/events/{id}` | GET / PUT/PATCH / DELETE | Detail / úprava / smazání | `events.read` / `.update` / `.delete` |
| `/api/events/bulk-update` | PUT/PATCH | Hromadná úprava | `ROLE_SUPER_ADMIN` |
| `/api/events/bulk-delete` | DELETE | Hromadné smazání | `ROLE_SUPER_ADMIN` |
| `/api/events/from-reservation/{id}` | POST | Vytvoření eventu z rezervace | `events.create` |
| `/api/events/{id}/spaces` | GET / PUT/PATCH | Prostory eventu | `events.read` / `.update` |
| `/api/events/{id}/stock-requirements` | GET | Skladové požadavky | `events.read` |
| `/api/events/{id}/move-guests` | POST | Přesun hostů mezi prostory/stoly | `events.update` |
| `/api/events/{id}/quick-reservation` | POST | Rychlá rezervace navázaná na event | `events.update` |

#### `EventGuestController`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/events/{id}/guests` | GET | Seznam hostů | `events.read` |
| `/api/events/{id}/guests/sync` | POST | Sync hostů z rezervací | `events.update` |
| `/api/events/{id}/guest-summary` | GET | Souhrn hostů | `events.read` |
| `/api/events/{id}/guests/bulk-update` | PUT/PATCH | Hromadná úprava `{guestIds, updates}` | `events.update` |
| `/api/events/{id}/guests/bulk-delete` | DELETE | Hromadné smazání `{guestIds}` | `events.update` |
| `/api/events/{id}/guests/set-group-count` | POST | Hromadná úprava počtu hostů ve skupině `{reservationId: int|null, targetAdults, targetChildren}` | `events.update` |

#### `EventFloorPlanController`
Kompletní API pro editor půdorysu a seating:

| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/events/{id}/tables` | GET | Seznam stolů |
| `/api/events/{id}/tables` | POST | Vytvoření stolu |
| `/api/events/{id}/tables/{tableId}` | PUT / DELETE | Úprava / smazání stolu |
| `/api/events/{id}/floor-plan` | GET / PUT | Načtení / uložení celého půdorysu |
| `/api/events/{id}/floor-plan/from-template/{templateId}` | POST | Vytvoření z šablony |
| `/api/events/{id}/floor-plan/copy-from/{sourceId}` | POST | Zkopírování z jiného eventu |
| `/api/events/{id}/floor-plan/save-as-template` | POST | Uložení jako šablona |
| `/api/events/{id}/seating-suggestion` | POST | Návrh rozsazení |
| `/api/events/{id}/seating-apply` | PUT | Aplikace rozsazení |
| `/api/events/{id}/seating-clear` | DELETE | Zrušení rozsazení |
| `/api/events/{id}/seating-stats` | GET | Statistiky rozsazení |
| `/api/events/{id}/waiter-view` | GET | Layout pro číšníka |
| `/api/events/{id}/reassign-guest` | POST | `{guestId, tableId}` |
| `/api/events/{id}/assign-guests-batch` | POST | Hromadné přiřazení |
| `/api/events/{id}/unseat-guest` | POST | `{guestId}` |
| `/api/events/{id}/tables/{tableId}/unseat-all` | POST | Všichni od stolu pryč |
| `/api/events/{id}/tables/{fromTableId}/move-to/{toTableId}` | POST | Přesun stolu |
| `/api/events/{eventId}/tables/{tableId}/expenses` | GET / POST | Útraty u stolu |
| `/api/events/{eventId}/expenses/{expenseId}` | PUT / DELETE | Úprava / smazání útraty |
| `/api/events/{eventId}/tables/{tableId}/expenses/settle` | POST | Uhrazení útrat stolu |
| `/api/events/{eventId}/expenses/summary` | GET | Souhrn útrat |

> Čtení vyžaduje `events.read`, mutace `events.update`.

#### `EventMenuController`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/events/{id}/menu` | GET / POST | Menu eventu |
| `/api/events/{id}/menu/{menuId}` | PUT / DELETE | Úprava / smazání |
| `/api/events/{id}/beverages` | GET / POST | Nápoje |
| `/api/events/{id}/beverages/{beverageId}` | PUT / DELETE | Úprava / smazání |
| `/api/events/{id}/schedule` | GET / POST | Harmonogram |
| `/api/events/{id}/schedule/{scheduleId}` | PUT / DELETE | Úprava / smazání |
| `/api/events/{id}/available-menus` | GET | Dostupná menu pro den |

#### `EventStaffController`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/events/{id}/staff-requirements` | GET | Požadavky na personál |
| `/api/events/{id}/staff-requirements/recalculate` | POST | Přepočet dle formule |
| `/api/events/{id}/staff-requirements/{category}` | PUT | `{count}` |
| `/api/events/{id}/staff-requirements/{category}/reset` | POST | Reset požadavku |
| `/api/events/{id}/staff-assignments` | GET / POST | Přiřazení personálu |
| `/api/events/{id}/staff-assignments/{assignmentId}` | PUT / DELETE | Úprava / smazání |
| `/api/events/{id}/staff-assignments/{assignmentId}/attendance` | PUT | Docházka |
| `/api/events/{id}/staff-assignments/role/{role}/presence` | PUT | Přítomnost celé role |
| `/api/events/{id}/staff-assignments/{assignmentId}/pay` | POST | Výplata |
| `/api/events/{id}/staff-assignments/mark-all-present` | POST | Všichni přítomni |
| `/api/events/{id}/staff-assignments/fix-roles` | POST | Auto-oprava rolí |
| `/api/events/{id}/pay-all-staff` | POST | Vyplatit všem |

#### `EventFinanceController`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/events/{id}/manager-dashboard` | GET | Finanční dashboard eventu |
| `/api/events/{id}/payments` | GET | Přehled plateb |
| `/api/events/{id}/reservations/{reservationId}/payment-note` | PUT/PATCH | Poznámka k platbě |
| `/api/events/{id}/reservations/{reservationId}/record-payment` | POST | Zaznamenat platbu |
| `/api/events/{eventId}/tables/{tableId}/movements` | GET | Pohyby u stolu |
| `/api/events/{eventId}/tables/movements-summary` | GET | Souhrn pohybů |

#### Vouchery eventu
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/events/{id}/vouchers` | GET / POST | Seznam / vytvoření |
| `/api/events/{id}/vouchers/{eventVoucherId}` | PUT / DELETE | Úprava / smazání |
| `/api/events/{id}/vouchers/scan` | POST | `{voucherCode}` |
| `/api/events/{id}/vouchers/{voucherId}/validate` | POST | Validace |

---

### 4. Platby a finance

#### `PaymentController`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/payment/create` | POST | Vytvoření platby u Comgate – `{price, label, refId, email, method?}` → `{redirect}` | `reservations.create` |
| `/api/payment/notify` | POST | Webhook Comgate (notify) | Public |
| `/payment/notify` | POST | Alternativní webhook | Public |
| `/api/payment/status/{refId}` | GET | Stav platby dle `refId` | Public |
| `/api/payment/list` | GET | Seznam plateb (filtr: `dateFrom, dateTo, status, search`) | `payments.read` |
| `/payment/result` | GET/POST | HTML stránka výsledku platby (redirect z brány) | Public |
| `/payment/status` | POST | Technický endpoint s kontrolou `digest` | Public |
| `/api/payment/test-create` | GET | Testovací platba 100 Kč | `ROLE_ADMIN` |

> Comgate vyžaduje částku v haléřích (integer). Mapování zajišťuje controller.

#### `InvoiceController` – prefix `/api/invoices`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/invoices` | GET | Seznam (filtr: `status, dateFrom, dateTo`) | `invoices.read` |
| `/api/invoices` | POST | Vytvoření | `invoices.create` |
| `/api/invoices/{id}` | GET / PUT / DELETE | Detail / úprava / smazání | `invoices.read/update/delete` |
| `/api/invoices/{id}/pdf` | GET | PDF download | `invoices.read` |
| `/api/invoices/{id}/send` | POST | Odeslání | `invoices.update` |
| `/api/invoices/{id}/send-email` | POST | `{email?}` | `invoices.update` |
| `/api/invoices/{id}/pay` | POST | Označit uhrazenou | `invoices.update` |
| `/api/invoices/{id}/cancel` | POST | Stornovat | `invoices.update` |
| `/api/invoices/{id}/credit-note` | POST | Dobropis | `invoices.create` |
| `/api/invoices/bulk-update` | PUT | Hromadná úprava | `invoices.update` |
| `/api/invoices/bulk-delete` | DELETE | Hromadné smazání | `invoices.delete` |
| `/api/invoices/bulk-pdf` | POST | `{ids}` → ZIP | `invoices.read` |
| `/api/invoices/reservation/{reservationId}` | GET | Faktura k rezervaci | `invoices.read` |
| `/api/invoices/create-from-reservation/{reservationId}` | POST | Vytvoření z rezervace | `invoices.create` |
| `/api/invoices/preview-deposit/{reservationId}` | GET | Náhled zálohové | `invoices.create` |
| `/api/invoices/preview-final/{reservationId}` | GET | Náhled konečné | `invoices.create` |
| `/api/invoices/create-deposit/{reservationId}` | POST | Vytvoření zálohové | `invoices.create` |
| `/api/invoices/create-final/{reservationId}` | POST | Vytvoření konečné | `invoices.create` |
| `/api/invoices/overdue` | GET | Po splatnosti | `invoices.read` |

#### `CashboxController` + `CashboxMainController` + `CashboxEventController`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/cashbox` | GET | Seznam pokladen |
| `/api/cashbox/{id}` | GET | Detail |
| `/api/cashbox/{id}/movement` | POST | `{amount, category, ...}` |
| `/api/cashbox/{id}/close` | POST | Uzavření (`cashbox.close`) |
| `/api/cashbox/{id}/destroy` | POST | Zrušení |
| `/api/cashbox/result/{reservationId}` | GET | Výsledek pokladny pro rezervaci |
| `/api/cashbox/main` | GET / POST | Hlavní pokladna / inicializace |
| `/api/cashbox/main/adjust-balance` | POST | `ROLE_SUPER_ADMIN` |
| `/api/cashbox/main/info` | PUT/PATCH | Metadata |
| `/api/cashbox/main/report` | GET | Report |
| `/api/cashbox/main/movements` | GET | Pohyby |
| `/api/cashbox/main/transfer-to-event` | POST | `{eventId, amount}` |
| `/api/cashbox/event/{eventId}` | GET / POST | Pokladna eventu |
| `/api/cashbox/event/{eventId}/adjust-balance` | POST | `ROLE_SUPER_ADMIN` |
| `/api/cashbox/event/{eventId}/report` | GET | Report |
| `/api/cashbox/event/{eventId}/movement` | POST | Pohyb |
| `/api/cashbox/event/{eventId}/movement/{movementId}` | PUT/PATCH | Úprava |

#### `CashboxTransferController`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/cashbox/transfers/pending` | GET | Čekající přesuny |
| `/api/cashbox/transfers/all` | GET | Všechny přesuny |
| `/api/cashbox/transfers/{id}/confirm` | POST | Potvrzení |
| `/api/cashbox/transfers/{id}/approve-closure` | POST | Schválení uzávěrky (`ROLE_SUPER_ADMIN`) |
| `/api/cashbox/event/{eventId}/pending-transfers` | GET | Pending přesuny eventu |

#### `CashMovementCategoryController` – prefix `/api/cash-movement-categories`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/cash-movement-categories` | GET / POST | Seznam / vytvoření |
| `/api/cash-movement-categories/{id}` | PUT / DELETE | Úprava / smazání |
| `/api/cash-movement-categories/autocomplete` | GET | `?q=` autocomplete |

#### `ExchangeRateController` – prefix `/api/exchange-rates`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/exchange-rates` | GET | Seznam (`?base, target, from, to`) |
| `/api/exchange-rates/latest` | GET | Nejnovější kurz |
| `/api/exchange-rates` | POST | `{baseCurrency, targetCurrency, rate, effectiveDate?, source?}` |
| `/api/exchange-rates/{id}` | DELETE | Smazání |

---

### 5. Personál

#### `StaffMemberController` – prefix `/api/staff`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/staff` | GET / POST | Seznam / `{firstName, lastName, email?, phone?, ...}` | `staff.read/create` |
| `/api/staff/{id}` | GET / PUT/PATCH / DELETE | Detail / úprava / smazání | `staff.read/update/delete` |
| `/api/staff/{id}/history` | GET | Historie práce | `staff.read` |
| `/api/staff/bulk-update` | PUT/PATCH | Hromadná úprava (whitelist `isActive`/`position`/`hourlyRate`/`fixedRate`) | `staff.update` |
| `/api/staff/bulk-delete` | DELETE | Hromadné smazání | `staff.delete` |
| `/api/staff/import/preview` | POST | XLSX preview (multipart `file`) | `staff.create` |
| `/api/staff/import/commit` | POST | XLSX commit (z draftů) | `staff.create` |

#### Další staff endpointy
| Base | Endpoint | Metoda | Popis |
|---|---|---|---|
| `/api/staff-roles` | `/` | GET/POST | Role |
| | `/{id}` | PUT/PATCH/DELETE | Úprava/smazání |
| `/api/staff-member-roles` | `/` | GET/POST | Přiřazení rolí členům |
| | `/{id}` | DELETE | Odebrání |
| `/api/staff-attendance` | `/` | GET/POST | Docházka |
| | `/{id}` | PUT/PATCH/DELETE | Úprava/smazání |
| | `/{id}/mark-paid` | POST | Vyplaceno |
| `/api/staff-assignments` | `/` | GET/POST | Přiřazení k rezervaci |
| | `/{id}` | PUT/PATCH/DELETE | Úprava/smazání |
| `/api/staffing-formulas` | `/` | GET/POST | Formule pro obsazování |
| | `/{id}` | GET/PUT/PATCH/DELETE | Detail/úprava/smazání |
| | `/recommendation` | GET | `?guestCount=` doporučení |

---

### 6. Sklad a recepty

#### `StockItemController` – `/api/stock-items`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/stock-items` | GET / POST | Seznam / `{name, unit, ...}` | `stock_items.read/create` |
| `/api/stock-items/{id}` | PUT/PATCH / DELETE | Úprava / smazání | `stock_items.update/delete` |
| `/api/stock-items/bulk-update` | PUT/PATCH | `ROLE_SUPER_ADMIN` | |
| `/api/stock-items/bulk-delete` | DELETE | `ROLE_SUPER_ADMIN` | |

#### `StockMovementController` – `/api/stock-movements`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/stock-movements` | GET | `?stockItemId, limit, offset` |
| `/api/stock-movements/by-item/{stockItemId}` | GET | Pohyby položky |
| `/api/stock-movements` | POST | `{stockItemId, movementType, quantity, reason?}` |
| `/api/stock-movements/batch` | POST | Dávkové pohyby |

#### `StockRequirementController` – `/api/stock-requirements`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/stock-requirements` | GET | Seznam |
| `/api/stock-requirements/events/{id}` | GET | Požadavky pro event |

#### `RecipeController` – `/api/recipes`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/recipes` | GET / POST | `{name, description?, portions?, ingredients?}` | `recipes.read/create` |
| `/api/recipes/{id}` | GET / PUT/PATCH / DELETE | | `recipes.*` |
| `/api/recipes/import` | POST | CSV/JSON import | `recipes.create` |
| `/api/recipes/bulk-delete` | DELETE | `{ids}` | `ROLE_SUPER_ADMIN` |

#### `MenuRecipeController` – `/api/menu-recipes`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/menu-recipes` | GET | `?reservationFoodId, all` |
| `/api/menu-recipes` | POST | `{reservationFoodId, recipeId, portionsPerServing?, courseType?}` |
| `/api/menu-recipes/{id}` | PUT / DELETE | Úprava / smazání |
| `/api/menu-recipes/bulk` | POST | `{reservationFoodId, recipes: [...]}` |

---

### 7. Pricing

#### `PricingController` – `/api/pricing`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/pricing/defaults` | GET / PUT | `{adultPrice, childPrice, infantPrice, includeMeal?}` |
| `/api/pricing/date-overrides` | GET / POST | `{date, adultPrice, childPrice?, ...}` |
| `/api/pricing/date-overrides/{id}` | GET / PUT / DELETE | |
| `/api/pricing/date-overrides/bulk-delete` | DELETE | `{ids}` |
| `/api/pricing/for-date/{date}` | GET | Ceny pro konkrétní den |

#### `FoodPricingController` – `/api/food-pricing`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/food-pricing/overrides` | GET / POST | `?foodId`; `{foodId, dateFrom, price, dateTo?, reason?}` |
| `/api/food-pricing/overrides/{id}` | PUT/PATCH / DELETE | |
| `/api/food-pricing/availability` | GET / POST | `{foodId, dateFrom, available, dateTo?, reason?}` |
| `/api/food-pricing/availability/{id}` | PUT/PATCH / DELETE | |
| `/api/food-pricing/effective` | GET | `?foodId, date` → `{available, price, currency}` |

---

### 8. Venue a transport

#### `VenueController` – `/api/venue`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/venue/buildings` | GET / POST | Budovy |
| `/api/venue/buildings/{id}` | PUT / DELETE | |
| `/api/venue/rooms` | GET | Všechny místnosti |
| `/api/venue/buildings/{buildingId}/rooms` | GET / POST | Místnosti budovy |
| `/api/venue/rooms/{id}` | PUT / DELETE | |
| `/api/venue/templates` | GET / POST | Šablony půdorysu |
| `/api/venue/templates/{id}` | GET / PUT / DELETE | |
| `/api/venue/templates/{id}/duplicate` | POST | `{newName?}` |

#### `TransportController` – `/api/transport`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/transport` | GET / POST | Dopravci | `transport.read/create` |
| `/api/transport/{id}` | GET / PUT/PATCH / DELETE | | `transport.*` |
| `/api/transport/bulk` | POST | Hromadné akce | `transport.update` |
| `/api/transport/{id}/vehicles` | GET / POST | Vozy dopravce | `transport.read/create` |
| `/api/transport/vehicles/{vid}` | GET / PUT/PATCH / DELETE | | |
| `/api/transport/{id}/drivers` | GET / POST | Řidiči | |
| `/api/transport/drivers/{did}` | GET / PUT/PATCH / DELETE | | |
| `/api/transport/by-event/{eventId}` | GET | Transport pro event | `transport.read` |
| `/api/transport/{id}/events` | GET | Eventy pro dopravce | `transport.read` |
| `/api/transport/event-assignments` | POST | Vytvoření přiřazení | `transport.create` |
| `/api/transport/event-assignments/{aid}` | PUT/PATCH / DELETE | | |

#### `DrinkController` – `/api/drinks`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/drinks` | GET / POST | Nápoje (`drinks.read/create`) |
| `/api/drinks/{id}` | GET / PUT/PATCH / DELETE | (`drinks.*`) |
| `/api/drinks/bulk` | POST | Hromadná akce |

---

### 9. Partneři, kontakty, vouchery

#### `PartnerController` – `/api/partner`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/partner` | GET / POST | `{name, partnerType (slug)}` — `partnerType` je slug z dynamického číselníku `PartnerCategory` |
| `/api/partner/{id}` | GET / PUT/PATCH / DELETE | |
| `/api/partner/bulk` | POST | Hromadná akce |
| `/api/partner/detect` | POST | Detekce partnera z dat |
| `/api/partner/{id}/calculate-price` | POST | `{basePrice}` → `{finalPrice, markup}` |
| `/api/partner/{id}/reservations` | GET | Rezervace partnera |
| `/api/partner/{id}/commissions` | GET | Provize |

#### `PartnerCategoryController` – `/api/partner-categories`
Dynamický číselník kategorií partnerů (Cestovní kancelář, Průvodce, Hotel, Ostatní…). Default seed při migraci. Smazání kategorie nezruší partnery, jen jim slug osamí.

| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/partner-categories` | GET | Seznam (`?activeOnly=1`) | auth |
| `/api/partner-categories` | POST | `{name, slug?, displayOrder?, isActive?}` (slug se generuje z názvu) | `partners.update` |
| `/api/partner-categories/{id}` | PUT/PATCH | Úprava | `partners.update` |
| `/api/partner-categories/{id}` | DELETE | Smazání | `partners.update` |

#### `PartnerContactController` – kontaktní osoby u partnera
1 partner → N kontaktů. FK CASCADE — smazání partnera smaže i jeho kontakty.

| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/partners/{id}/contacts` | GET | Seznam kontaktů partnera | `partners.read` |
| `/api/partners/{id}/contacts` | POST | `{firstName, lastName?, email?, phone?, notes?, displayOrder?}` | `partners.update` |
| `/api/partner-contacts/{id}` | PUT/PATCH | Úprava | `partners.update` |
| `/api/partner-contacts/{id}` | DELETE | Smazání | `partners.update` |

#### `ContactController` – `/api/contacts`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/contacts` | GET / POST | `{firstName, lastName, email?, phone?}` |
| `/api/contacts/{id}` | GET / PUT/PATCH / DELETE | |
| `/api/contacts/{id}/reservations` | GET | Rezervace kontaktu |
| `/api/contacts/bulk-update` | PUT/PATCH | `ROLE_SUPER_ADMIN` |
| `/api/contacts/bulk-delete` | DELETE | `ROLE_SUPER_ADMIN` |

#### `VoucherController` – `/api/voucher`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/voucher` | GET / POST | `{code, value?, expiryDate?}` |
| `/api/voucher/{id}` | GET / PUT/PATCH / DELETE | |
| `/api/voucher/redeem` | POST | `{code}` → `{status, value}` |

---

### 10. Company settings, dokumentace, asistent

#### `CompanySettingsController` – `/api/company-settings`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/company-settings` | GET / PUT | Globální nastavení firmy |
| `/api/company-settings/init` | POST | Inicializace defaultů |

#### `DocumentationTopicController` – `/api/documentation-topics`
| Endpoint | Metoda | Popis | Oprávnění |
|---|---|---|---|
| `/api/documentation-topics` | GET / POST | Seznam / `{title, content?}` | `ROLE_ADMIN` |
| `/api/documentation-topics/{id}` | GET / PUT/PATCH / DELETE | | `ROLE_ADMIN` |

#### `AssistantController` – `/api/assistant`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/assistant/chat` | POST | `{message, conversationId?, context?}` → `{response, actionId?, actions?}` |
| `/api/assistant/confirm/{actionId}` | POST | Potvrzení navržené akce |
| `/api/assistant/reject/{actionId}` | POST | Zamítnutí akce |
| `/api/assistant/conversations` | GET / POST | Seznam / uložení konverzace |
| `/api/assistant/conversations/{id}` | GET | Detail konverzace |

---

### 11. Utility a testy

#### `ApiController`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api` | GET | Základní info |
| `/api/test` | GET | `{status: 'ok'}` |

#### `SmartDriveController` – `/smart-drive`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/smart-drive/` | GET | Index |
| `/smart-drive/assign` | GET/POST | FCM notifikace (vyžaduje `deviceToken` + payload) |
| `/smart-drive/overview` | GET | Ukázkový přehled |

#### `TestReservationEmailController`, `TestSafeMailerController`
| Endpoint | Metoda | Popis |
|---|---|---|
| `/api/test/reservation-email` | GET | Testovací potvrzovací e-mail |
| `/api/test/safe-mailer` | GET/POST | Test SMTP |
| `/api/test/safe-mailer/status` | GET | Stav maileru |

---

## Autentizace a oprávnění

- **JWT** (LexikJWTAuthenticationBundle) – klíče v `api/config/jwt/`, passphrase v `JWT_PASSPHRASE`.
- **Login**: `POST /auth/login` → `{ token }`; klient ukládá do `localStorage` jako `auth_token`.
- **Axios interceptor** (`client/src/shared/lib/api.ts`) přidává `Authorization: Bearer <token>` a při `401` přesměruje na `/login`.
- **Role model**: uživatel má role (`UserRole`) + přímá oprávnění (`UserPermission` s `grant/revoke`). Role sdružují `Permission`. Existuje `isSuperAdmin` flag, který obchází kontrolu.
- **Granularita**: oprávnění ve formátu `{modul}.{akce}`, např. `reservations.read`, `events.update`, `cashbox.close`.
- **Guardy v UI**: `RequireRole`, `RequirePermission` v `modules/auth/`.
- **CORS**: přes `nelmio/cors-bundle`.

---

## Platby (Comgate)

1. **FE** → `POST /api/payment/create` s `{price, label, refId, email}`.
2. **BE** vytvoří `Payment` entitu, zavolá Comgate, uloží `transactionId`, vrátí `{ redirect }`.
3. Uživatel je přesměrován na platební bránu.
4. **Comgate → BE**: webhook `POST /api/payment/notify` aktualizuje stav.
5. **Comgate → FE**: redirect na `/payment/result` (HTML), kde se zobrazí výsledek.
6. Stav lze zjistit: `GET /api/payment/status/{refId}`.

> **Pozor**: Comgate požaduje částku v haléřích (`integer`). Ceny v business logice jsou v Kč – převod je v controlleru.

Konfigurace: `COMGATE_MERCHANT`, `COMGATE_SECRET`, `COMGATE_URL`, `COMGATE_NOTIFY_URL`, `COMGATE_TEST`.

---

## Asistent (AI chatbot) a parser rezervací

V projektu jsou **dva oddělené AI integrační body**, oba volají stejný AI server (OpenAI):

### 1) Backend chatbot (`/api/assistant/chat`)
- **FE**: `HelpChatbot` drawer (`client/src/shared/components/HelpChatbot.tsx`) + `shared/components/chatbot/*`.
- **BE**: `AssistantController` + `api/src/Service/Assistant/*` (`AssistantOrchestrator`, `AiGatewayService`, `ToolRegistry`).
- **Schopnosti**: vyhledání rezervací/eventů/personálu/kontaktů, vytvoření rychlého záznamu (vždy s potvrzením uživatele), návrhy akcí (`actionId` → `/confirm` / `/reject`), tool-use přes function calling.
- **Historie**: konverzace ukládány v `AssistantConversation`, akce logovány v `AssistantActionLog`.

### 2) Frontend parser rezervací (`client/src/modules/reservations/utils/ai.ts`)
- Volá AI **přímo z prohlížeče** přes `POST /v1/chat/completions`. ⚠ API klíč je aktuálně hardcoded v JS bundle (security debt). Plánovaný refactor: přesunout na backend přes interní endpoint.
- Schema je liberální: `date` v rezervaci nullable (poptávky bez data), `reservations` může být prázdné pole.
- System prompt instruuje AI, aby chybějící datum nahradila `null`, ne odmítla rezervaci.

### Konfigurace (oba systémy)

```dotenv
# api/.env (jediný OpenAI server)
AI_SERVER_1_URL=https://api.openai.com
AI_SERVER_1_KEY=<openai-key>
AI_SERVER_1_MODEL=gpt-4.1-mini
```

Konfigurace v `api/config/services.yaml` injectne tyto env vars do `AiGatewayService`. Při selhání AI vrací `AssistantController` HTTP 502.

### Jak aktualizovat nápovědu pro AI

AI asistent při odpovědích používá **znalostní bázi z entity `DocumentationTopic`** (tabulka `documentation_topic`). Tu vyhledává tool `App\Service\Assistant\Tool\GetHelpTopicTool` přes orchestrator.

**Spravuje se v UI**: stránka `/help-topics` (vyžaduje `ROLE_ADMIN`). Endpoint `/api/documentation-topics` umožňuje CRUD nad poli `title`, `slug`, `content`, `category`, případně `tags`.

**Workflow při změně systému** (např. přibyla nová feature, kterou má asistent znát):
1. Přihlas se jako admin → menu **Help témata** (`/help-topics`).
2. Najdi téma podle modulu (rezervace, eventy, personál, …) nebo přidej nové.
3. Update **content** (markdown) — popiš stručně, jak feature funguje, kde je v UI, jaké API endpointy obsluhuje, jak se konfiguruje.
4. Ulož — chatbot témata čte za běhu, **není potřeba reload aplikace** ani redeploy.

**Co tam patří** (a co ne):
- ✅ Procesy a postupy (jak založit rezervaci, jak udělat uzávěrku pokladny, jak vyplatit personál).
- ✅ Vztahy mezi entitami (rezervace ↔ event ↔ pokladna).
- ✅ Konvence (formát data, povinné pole, výchozí hodnoty).
- ❌ Citlivá data, hesla, klíče.
- ❌ Detaily implementace, které se mění (názvy tříd, čísla řádků). Ty patří do `CLAUDE.md` / `api/readme.md`.

**System prompt vs. nápověda**: chatbot system prompt (chování, persona, jazyk) je v `AssistantOrchestrator`. Aktualizace prompt vyžaduje code change + redeploy — používej ho na "jak má asistent mluvit", ne na obsah znalostí.

---

## Floor plan editor

- **Canvas** postavený na **Konva** + **react-konva**.
- Designer šablon (`/venue/templates/:id/designer`) a event floor plan (`/events/:id/dashboard`).
- Entity: `Building`, `Room`, `FloorPlanElement`, `FloorPlanTemplate`, `EventTable`.
- Funkce: drag & drop stolů, tvary, vrstvy, šablonování, kopírování mezi eventy, automatický návrh rozsazení, waiter view (pro obsluhu), útraty u stolu, unsettle/settle.

---

## Databázové migrace

```bash
cd api

# Vygenerování nové migrace z diffu entit
php bin/console doctrine:migrations:diff

# Aplikace čekajících migrací (dev)
php bin/console doctrine:migrations:migrate

# Regenerace getterů/setterů (při změně entit)
php bin/console make:entity --regenerate App\\Entity
```

### Produkční migrace (bez console)

Produkční server nemá přístup k `php bin/console`. Každá Doctrine migrace proto
**musí mít** PHP ekvivalent v [`api/prod_migrations/`](api/prod_migrations/README.md).

```bash
# CLI (pokud máš SSH)
php api/prod_migrations/run.php

# Browser (vyžaduje PROD_MIGRATION_TOKEN v .env.local)
# https://api.folkloregarden.cz/prod_migrate.php?token=...
```

Skripty jsou **idempotentní** (kontrolují `doctrine_migration_versions`,
přeskočí už aplikované), **data-safe** (jen aditivní změny), běží v transakci.

### Historie migrací (chronologicky)

| Doctrine | Prod | Změna |
|---|---|---|
| `Version20260415090000` | – | AI asistent (`documentation_topic`, `assistant_action_log`) |
| `Version20260415090100` | – | seed dokumentačních témat |
| `Version20260415090200` | – | `assistant_conversation` |
| `Version20260423100000` | `20260423100000_mobile_auth.php` | mobilní auth (PIN pole, staff/driver ↔ user, `user_device`, `event_transport.execution_status`, mobilní permissions/role) |
| `Version20260423100100` | `20260423100100_refresh_token.php` | `refresh_token` tabulka |
| `Version20260425160000` | `20260425160000_profile_photo.php` | `staff_member.photo_path` |
| `Version20260427070000` | `20260427070000_pin_lookup_hash.php` | `user.pin_lookup_hash` |
| `Version20260427120000` | `20260427120000_decline_reason.php` | `event_staff_assignment.decline_reason` |
| `Version20260428085420` | `20260428085420_reservation_ordered_by.php` | `reservation.ordered_by` (kdo objednal) |
| `Version20260428111718` | `20260428111718_reservation_email_nullable.php` | `reservation.contact_email` DROP NOT NULL |
| `Version20260428113803` | `20260428113803_food_notes_allergens.php` | `reservation_foods.notes` + `.allergens` |
| `Version20260428114400` | `20260428114400_partner_category.php` | `partner_category` + 4 default kategorie + remap `RECEPTION`/`DISTRIBUTOR` → `OTHER` |
| `Version20260428120554` | `20260428120554_partner_contact.php` | `partner_contact` (FK CASCADE) |
| `Version20260428121513` | `20260428121513_event_duration_default.php` | `event.duration_minutes` default 120 → 150 |

Také: `sql/ai_assistant_migration.sql` (Adminer-friendly SQL varianta původních AI migrací).

---

## Testy

```bash
cd api
vendor/bin/phpunit                      # všechny testy
vendor/bin/phpunit tests/Path/Test.php  # konkrétní
```

Testy: `api/tests/`, konfigurace `api/phpunit.dist.xml`.

```bash
# Frontend
npm run check                           # TS type-check (žádné dedikované unit testy)
```

---

## Destruktivní operace

Kompletní wipe schématu viz **`docs/ops/wipe-production-db.md`** a skript **`sql/wipe_all_tables.sql`**.

> **Nikdy nespouštět bez aktuální zálohy produkce.**

Další pomocné skripty v `sql/` a `api/drop_all_tables.sql`.

---

## Přehled dokumentace

| Soubor | Obsah |
|---|---|
| `README.md` (tento) | Root přehled projektu |
| `CLAUDE.md` | Pokyny pro Claude Code |
| `api/readme.md` | Původní CZ dokumentace API (detailně entity + PaymentController) |
| `SYSTEM_DOCUMENTATION.md` | Širší systémová dokumentace |
| `BACKEND_INSTRUCTIONS.md` | Instrukce k backendu |
| `ENV_SETUP.md` | Detail .env proměnných |
| `EVENTS.md` | Business specifika modulu eventů |
| `TODO_REFACTORING.md`, `TODO_TABLES_FLOOR_PLAN.md`, `TODOEVENTS.md` | Pracovní TODO |
| `design_guidelines.md` | UI/UX pravidla |
| `docs/ops/wipe-production-db.md` | Runbook pro wipe DB |

---

## Licence

Interní projekt Folklore Garden. Všechna práva vyhrazena.
