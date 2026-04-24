# Folklore Garden Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains an API server and a mobile Expo app for Folklore Garden CRM.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### api-server (`artifacts/api-server`)
Express API server. Preview at `/api`.

### mobile (`artifacts/mobile`)
Expo React Native mobile app for Folklore Garden staff and drivers.
- Preview path: `/mobile/`
- Two user roles: **Personál** (staff - waiters, cooks, work groups) and **Dopravce** (driver)

**Features:**
- JWT authentication against the Folklore Garden CRM API (`EXPO_PUBLIC_API_URL`)
- Role selection after login (staff vs driver)
- Staff view: list of assigned events/reservations with filtering by status, event details (contact, persons, transfer info)
- Driver view: list of planned transports filtered from reservations with `transferSelected=true`, or from SmartDrive endpoint
- Transport map: OpenStreetMap via Leaflet (WebView) with geocoding via Nominatim, informational marker (no navigation)
- In-app notifications system (stored in AsyncStorage)
- Auto-refresh every 60 seconds
- Bell icon with unread count badge
- Notification detail screen
- Profile screen with role switching and logout

**External API**: Points to the Folklore Garden CRM. Base URL is defined in `artifacts/mobile/constants/api.ts` (currently `https://apifolklore.testujeme.online`) and can be overridden per-build via the `EXPO_PUBLIC_API_URL` env var.
- `POST /auth/login` — JWT login
- `GET /auth/user` — get user info
- `GET /api/reservations` — list reservations (staff events)
- `GET /api/reservation/{id}` — reservation detail
- `GET /smart-drive/overview` — transport overview for drivers (falls back to reservations with transferSelected)

### mockup-sandbox (`artifacts/mockup-sandbox`)
Vite + React + Tailwind + shadcn/ui playground for component mockups.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/mobile exec expo start` — start Expo dev server

## Environment Variables

- `EXPO_PUBLIC_API_URL` — optional override for the CRM base URL (default defined in `artifacts/mobile/constants/api.ts`)
- `DATABASE_URL` — PostgreSQL connection string (required by `lib/db` and `drizzle.config.ts`)
- `PORT` — required by `api-server` and `mockup-sandbox`
- `BASE_PATH` — URL path prefix used by `mockup-sandbox` vite config and the mobile static-build pipeline
- `APP_DOMAIN` — deployment domain used by `artifacts/mobile/scripts/build.js` to rewrite bundle asset URLs
