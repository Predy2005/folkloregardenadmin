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

### 🚧 Budoucí moduly (čekají na backend API)

Připravené SQL skripty v `/sql/` složce:
- **Sklad** - Evidence jídla, gramáž, počet porcí, výdejky
- **Provizní systém** - Vouchery, partneři, výpočet provizí
- **Personální evidence** - Členové personálu, účast na akcích, docházka
- **Pokladna** - Příjmy/výdaje, CZK/EUR, výpočet výsledků akcí
- **Akce/Events** - Vytváření akcí, personál, catering, organizační plány

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
