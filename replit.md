# Folklore Garden Admin System

Administrační systém pro správu rezervací, plateb, jídel a uživatelů pro Folklore Garden.

## Technologie

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Wouter** - Routing
- **Axios** - HTTP client pro API komunikaci
- **Day.js** - Práce s datumy
- **TailwindCSS** - Styling
- **Shadcn UI** - Komponenty
- **React Hook Form** - Formuláře
- **TanStack Query** - Data fetching a caching
- **Lucide React** - Ikony

### Backend API
- **External API**: https://api.folkloregarden.cz/
- **Autentizace**: JWT (LexikJWTAuthenticationBundle)
- **Database**: PostgreSQL (Symfony Doctrine)

## Struktura projektu

```
client/
├── src/
│   ├── components/        # Reusable komponenty
│   │   ├── ui/           # Shadcn UI komponenty
│   │   ├── AppSidebar.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── StatusBadge.tsx
│   │   └── ThemeToggle.tsx
│   ├── contexts/         # React Contexts
│   │   ├── AuthContext.tsx      # JWT autentizace
│   │   └── ThemeContext.tsx     # Dark/Light mode
│   ├── lib/              # Utility funkce
│   │   ├── api.ts        # Axios client
│   │   └── queryClient.ts
│   ├── pages/            # Stránky aplikace
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Reservations.tsx
│   │   ├── Payments.tsx
│   │   ├── Foods.tsx
│   │   ├── Users.tsx
│   │   ├── DisabledDates.tsx
│   │   ├── StockItems.tsx
│   │   ├── Recipes.tsx
│   │   ├── StockMovements.tsx
│   │   ├── Partners.tsx
│   │   ├── Vouchers.tsx
│   │   ├── CommissionLogs.tsx
│   │   ├── StaffMembers.tsx
│   │   ├── StaffAttendance.tsx
│   │   ├── Cashbox.tsx
│   │   ├── Events.tsx
│   │   └── not-found.tsx
│   ├── App.tsx           # Hlavní komponenta s routing
│   ├── index.css         # Global styles + dark mode
│   └── main.tsx
├── index.html
└── vite.config.ts

shared/
├── types.ts              # TypeScript interfaces pro API entity
└── schema.ts             # (původní Drizzle schéma - nepoužívá se)
```

## Funkcionality

### ✅ Implementované moduly (s hotovým API)

#### 1. Autentizace
- **Login** - Přihlášení s JWT tokenem
- **Register** - Registrace nového uživatele
- **Logout** - Odhlášení
- **Protected Routes** - Ochrana stránek před nepřihlášenými uživateli

#### 2. Dashboard
- Přehled statistik (celkem rezervací, zaplacených, příjmů)
- Seznam posledních 5 rezervací
- Vizualizace klíčových metrik

#### 3. Rezervace
- Seznam všech rezervací s vyhledáváním
- Detail rezervace (osoby, jídla, platby, fakturační údaje, transfer)
- Zobrazení statusů (RECEIVED, WAITING_PAYMENT, PAID, CANCELLED, CONFIRMED)
- Informace o kontaktu, transferu, poznámkách

#### 4. Platby
- Seznam všech plateb z Comgate API
- Filtrace podle statusu (PAID, PENDING, CANCELLED, AUTHORIZED)
- Vyhledávání podle Transaction ID nebo Reservation Reference
- Statistiky (celková částka, počet zaplacených plateb)

#### 5. Jídla (ReservationFoods)
- CRUD operace (Create, Read, Update, Delete)
- Správa menu položek
- Označení dětského menu
- Ceny a popisy jídel

#### 6. Uživatelé
- Správa uživatelů systému
- CRUD operace
- Zobrazení rolí (ROLE_USER, ROLE_ADMIN)
- Historie přihlášení (poslední přihlášení, IP adresa)

#### 7. Blokované termíny
- Správa blokovaných dat pro rezervační systém
- Nastavení období blokace (dateFrom - dateTo)
- Důvod blokace
- Projekt (např. "reservations")

#### 8. Sklad (Stock Management)
- **StockItems** - Správa surovin a ingrediencí
  - CRUD operace s gramatury a jednotkami
  - Sledování minimálních zásob
  - Alert systém pro nízké zásoby
  - Kategorie surovin
- **Recipes** - Receptury propojené na menu
  - Vytváření receptur s ingrediencemi
  - Kalkulace množství surovin na porci
  - Propojení s menu položkami
- **StockMovements** - Evidence pohybů na skladě
  - Příjmy, výdaje, adjustments
  - Sledování množství a důvodů
  - Filtrace podle typu a data

#### 9. Provizní systém (Commission/Vouchers)
- **Partners** - Správa partnerů a affiliates
  - CRUD operace s kontakty
  - Nastavení provizní sazby
  - Sledování aktivních partnerů
- **Vouchers** - Slevové kódy a QR vouchery
  - CRUD operace se slevovými kódy
  - Nastavení platnosti a limitů použití
  - Propojení s partnery
  - Status tracking (aktivní, vypršelé)
- **CommissionLogs** - Evidence provizí
  - Výpočet provizí z rezervací
  - Sledování zaplacených/nezaplacených provizí
  - Statistiky celkových částek

#### 10. Personální evidence (Staff Management)
- **StaffMembers** - Správa zaměstnanců
  - CRUD operace se členy týmu
  - Role (kuchař, číšník, barman, atd.)
  - Hodinové sazby
  - Kontaktní údaje
- **StaffAttendance** - Docházka a odpracované hodiny
  - Záznam odpracovaných hodin
  - Výpočet částek podle hodinových sazeb
  - Označení zaplacených hodin
  - Statistiky nezaplacených hodin

#### 11. Pokladna (Cashbox)
- **Cashbox** - Správa příjmů a výdajů
  - Multi-měnový systém (CZK, EUR)
  - Kategorizace transakcí
  - Sledování bilance
  - Filtrace podle typu a měny
  - Propojení s rezervacemi a akcemi

#### 12. Akce/Events
- **Events** - Plánování a správa akcí
  - CRUD operace s akcemi
  - Stavy (plánováno, probíhá, dokončeno, zrušeno)
  - Sledování počtu hostů
  - Propojení s personálem
  - Menu planning
  - Poznámky a organizační plán

## Design

### Barevné schéma (Purple Gradient)
- **Primary Purple**: `hsl(270 70% 60%)`
- **Gradient**: Purple → Pink/Orange (pro tlačítka)
- **Dark Mode**: Default (deep charcoal background)
- **Light Mode**: Volitelné přepínání

### Fonty
- **Sans**: Inter (UI, tabulky, formuláře)
- **Serif**: Poppins (nadpisy, module titles)
- **Mono**: JetBrains Mono (ID, kódy transakcí)

### Komponenty
- Shadcn UI s purple theme
- Gradient tlačítka (primary actions)
- Status badges (color-coded)
- Sidebar navigace s purple accenty
- Dark/Light mode toggle

## API Endpoints

### Autentizace
- `POST /auth/login` - Přihlášení
- `POST /auth/register` - Registrace
- `POST /auth/logout` - Odhlášení
- `GET /auth/user` - Aktuální uživatel
- `POST /auth/forgot-password` - Reset hesla
- `POST /auth/reset-password` - Změna hesla

### Rezervace
- `GET /api/reservations` - Seznam rezervací
- `GET /api/reservation/{id}` - Detail rezervace

### Platby
- `GET /api/payment/list` - Seznam plateb (s filtry)
- `GET /api/payment/status/{refId}` - Status platby

### Jídla
- `GET /api/reservation-foods` - Seznam jídel
- `POST /api/reservation-foods` - Vytvoření jídla
- `PUT /api/reservation-foods/{id}` - Úprava jídla
- `DELETE /api/reservation-foods/{id}` - Smazání jídla

### Uživatelé
- `GET /api/users` - Seznam uživatelů
- `POST /api/users` - Vytvoření uživatele
- `PUT /api/users/{id}` - Úprava uživatele
- `DELETE /api/users/{id}` - Smazání uživatele

### Blokované termíny
- `GET /api/disable-dates` - Seznam blokací
- `POST /api/disable-dates` - Vytvoření blokace
- `PUT /api/disable-dates/{id}` - Úprava blokace
- `DELETE /api/disable-dates/{id}` - Smazání blokace

### Sklad
- `GET /api/stock-items` - Seznam surovin
- `POST /api/stock-items` - Vytvoření suroviny
- `PUT /api/stock-items/{id}` - Úprava suroviny
- `DELETE /api/stock-items/{id}` - Smazání suroviny
- `GET /api/recipes` - Seznam receptur
- `POST /api/recipes` - Vytvoření receptury
- `PUT /api/recipes/{id}` - Úprava receptury
- `DELETE /api/recipes/{id}` - Smazání receptury
- `GET /api/stock-movements` - Seznam pohybů
- `POST /api/stock-movements` - Vytvoření pohybu

### Provizní systém
- `GET /api/partners` - Seznam partnerů
- `POST /api/partners` - Vytvoření partnera
- `PUT /api/partners/{id}` - Úprava partnera
- `DELETE /api/partners/{id}` - Smazání partnera
- `GET /api/vouchers` - Seznam voucherů
- `POST /api/vouchers` - Vytvoření voucheru
- `PUT /api/vouchers/{id}` - Úprava voucheru
- `DELETE /api/vouchers/{id}` - Smazání voucheru
- `GET /api/commission-logs` - Seznam provizních logů
- `PUT /api/commission-logs/{id}/mark-paid` - Označení jako zaplaceno

### Personální evidence
- `GET /api/staff` - Seznam zaměstnanců
- `POST /api/staff` - Vytvoření zaměstnance
- `PUT /api/staff/{id}` - Úprava zaměstnance
- `DELETE /api/staff/{id}` - Smazání zaměstnance
- `GET /api/staff-attendance` - Seznam docházky
- `POST /api/staff-attendance` - Vytvoření záznamu
- `PUT /api/staff-attendance/{id}/mark-paid` - Označení jako zaplaceno

### Pokladna
- `GET /api/cashbox` - Seznam transakcí
- `POST /api/cashbox` - Vytvoření transakce

### Akce/Events
- `GET /api/events` - Seznam akcí
- `POST /api/events` - Vytvoření akce
- `PUT /api/events/{id}` - Úprava akce
- `DELETE /api/events/{id}` - Smazání akce

## Konfigurace

### Environment Variables
JWT token se ukládá do `localStorage` jako `auth_token`.

### API Base URL
```typescript
const API_BASE_URL = 'https://api.folkloregarden.cz';
```

### Axios Interceptors
- **Request**: Automatické přidání `Authorization: Bearer {token}` headeru
- **Response**: Automatické odhlášení při 401 Unauthorized

## Spuštění

```bash
npm run dev
```

Aplikace běží na portu definovaném ve Vite konfiguraci.

## Navigace

### Public routes
- `/login` - Přihlášení
- `/register` - Registrace

### Protected routes (vyžadují přihlášení)
- `/` - Dashboard
- `/reservations` - Rezervace
- `/payments` - Platby
- `/foods` - Jídla
- `/stock-items` - Sklad
- `/recipes` - Receptury
- `/stock-movements` - Pohyby skladu
- `/partners` - Partneři
- `/vouchers` - Vouchery
- `/commission-logs` - Provizní logy
- `/staff` - Personál
- `/staff-attendance` - Docházka
- `/cashbox` - Pokladna
- `/events` - Akce
- `/users` - Uživatelé
- `/disabled-dates` - Blokované termíny

## State Management

- **AuthContext** - JWT token, uživatel, login/logout
- **ThemeContext** - Dark/Light mode toggle
- **TanStack Query** - Data fetching, caching, mutations

## Testing

Data-testid atributy jsou přidány na všechny interaktivní elementy pro snadné testování:
- `button-login`, `button-register`
- `input-email`, `input-password`
- `link-dashboard`, `link-reservations`
- `row-reservation-{id}`, `row-payment-{id}`
- atd.

## Poznámky

- Backend API je samostatný projekt (PHP Symfony)
- Frontend komunikuje pouze přes REST API
- CORS je nakonfigurováno na backend straně
- JWT token expiruje (čas závisí na backend konfiguraci)
- Všechny nové moduly (8-12) používají stejný design pattern jako existující moduly
- Komponenty implementují CRUD operace s filtrováním, vyhledáváním a statistikami
- Purple gradient design je konzistentně aplikován napříč celou aplikací

## Historie změn

### 2025-10-22
- ✅ Implementován modul **Sklad** (StockItems, Recipes, StockMovements)
- ✅ Implementován modul **Provizní systém** (Partners, Vouchers, CommissionLogs)
- ✅ Implementován modul **Personální evidence** (StaffMembers, StaffAttendance)
- ✅ Implementován modul **Pokladna** (Cashbox s multi-měnou CZK/EUR)
- ✅ Implementován modul **Akce/Events** (Events s plánováním a statusy)
- ✅ Sidebar navigace rozšířena o všechny nové moduly
- ✅ Opravena chyba s React hooks v sidebaru (removed asChild pattern)
