# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Folklore Garden Admin is a full-stack monorepo for managing event reservations and staff at Folklore Garden. It consists of:
- **PHP Symfony 7.2 API** (`api/`) - RESTful backend with JWT authentication
- **React 18 + TypeScript SPA** (`client/`) - Admin dashboard frontend
- **Shared TypeScript types** (`shared/types.ts`) - Type definitions for client-API communication

## Common Commands

### Development
```bash
# Frontend (from root)
npm run dev              # Start Vite dev server on :5000

# Backend (from api/)
cd api
composer install
php -S localhost:8000 -t public   # Local API server

# Type checking
npm run check
```

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

**Destructive ops:** úplný reset schématu (všechny tabulky) najdeš v
[`docs/ops/wipe-production-db.md`](docs/ops/wipe-production-db.md) spolu se
SQL skriptem [`sql/wipe_all_tables.sql`](sql/wipe_all_tables.sql). **Nikdy
nespouštět bez aktuální zálohy produkce.**

### Testing
```bash
cd api
vendor/bin/phpunit                # Run PHP tests
```

### Build
```bash
npm run build    # Vite builds React → dist/public/, esbuild bundles Express server → dist/index.js
npm run start    # Run production build
```

## Architecture

### Backend (api/src/)
- **Controllers**: API endpoints with `#[Route(...)]` attributes. Main controllers: `ReservationController`, `EventController`, `PaymentController`, `AuthController`
- **Entities**: 36+ Doctrine ORM entities in `Entity/`. Core: `Reservation`, `Event`, `Payment`, `User`, `StaffMember`
- **Repositories**: Data access layer extending `ServiceEntityRepository`
- **Services**: Business logic (`ReservationEmailService`, `EventGuestSyncService`)
- **Enums**: `FoodMenu` enum with pricing logic

### Frontend (client/src/)
- **Routing**: Wouter (lightweight router) in `App.tsx`
- **State**: TanStack Query for server state, React Context for auth/theme
- **UI Components**: Radix UI primitives in `components/ui/`, styled with Tailwind CSS
- **API Client**: Axios with JWT interceptor in `lib/api.ts`

### Authentication Flow
1. `POST /auth/login` returns JWT token
2. Token stored in `localStorage` as `auth_token`
3. Axios interceptor adds `Authorization: Bearer {token}` to all requests
4. 401 responses trigger redirect to `/login`

### Key Patterns
- **API Client**: Use `api.get/post/put/delete` from `client/src/lib/api.ts`
- **Data Fetching**: TanStack Query hooks (`useQuery`, `useMutation`)
- **Forms**: React Hook Form + Zod validation
- **Type Safety**: All entity interfaces in `shared/types.ts`

## Key Files

- `shared/types.ts` - All TypeScript interfaces for entities
- `client/src/lib/api.ts` - Axios client with JWT interceptor
- `client/src/App.tsx` - Route definitions
- `api/src/Config/SpecialDateRules.php` - Pricing logic by date
- `api/config/packages/security.yaml` - Authentication configuration

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
```

## API Endpoints Reference

See `api/readme.md` for complete documentation (in Czech). Key endpoints:
- `POST /auth/login` - Authentication
- `GET /api/reservations` - List reservations
- `GET /api/events` - List events with nested data
- `POST /api/payment/create` - Create Comgate payment

## Adding New Features

### New API Endpoint
1. Create/update Entity in `api/src/Entity/`
2. Create Repository in `api/src/Repository/`
3. Create Controller with `#[Route]` attributes
4. Run `php bin/console doctrine:migrations:diff && php bin/console doctrine:migrations:migrate`
5. Add TypeScript interface to `shared/types.ts`

### New Frontend Page
1. Create component in `client/src/pages/`
2. Add route in `client/src/App.tsx`
3. Add sidebar link in `client/src/components/AppSidebar.tsx`
4. Use TanStack Query for data fetching
