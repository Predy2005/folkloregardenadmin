# TODOEVENTS.md - Event Management Dashboard

## Shrnutí projektu

Kompletní přestavba Event Edit stránky na tablet-friendly manažerský dashboard pro řízení akcí v reálném čase.

**Status: IMPLEMENTOVÁNO** - Dashboard je plně funkční jako samostatná stránka `/events/{id}/dashboard`

---

## Architektura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EVENT MANAGER DASHBOARD                               │
│                         (Tablet-Friendly UI)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [← Zpět]  Folklórní večer 20.12.2026  [IN_PROGRESS]  [⟳ Refresh]  │   │
│  │            170 hostů | 120 zaplaceno | 50 zdarma                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────┐   │
│  │     HOSTÉ DLE PROSTORU       │  │      PERSONÁL A KONTAKTY         │   │
│  │  ▼ ROUBENKA (170)            │  │  Číšníci: 4/5 | Kuchaři: 2/2    │   │
│  │    CZ: 50  EN: 30  CN: 20    │  │  Tanečníci: 6/6 | Fotograf: 1/1 │   │
│  │  MENU: Std: 80 | Premium: 40 │  │  [📞 Seznam kontaktů]            │   │
│  └──────────────────────────────┘  └──────────────────────────────────┘   │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────┐   │
│  │      TAXI / DOPRAVA          │  │         VOUCHERY                 │   │
│  │  3 rezervace | 12 pasažérů   │  │  Ověřeno: 15 | Čeká: 5          │   │
│  └──────────────────────────────┘  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  VYÚČTOVÁNÍ: Počáteční 20k + Příjmy 45k - Výdaje 22k = 43k Kč      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  [💰 Platby]  [🎫 Vouchery]  [➕ Výdaj]  [🍽️ Číšník]  [📋 Detail]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## TODO Seznam

### P0 - Kritické (Dashboard musí fungovat) ✅ HOTOVO

- [x] **Backend: EventDashboardService**
  - [x] `getDashboardData(Event $event): array`
  - [x] `getGuestsBySpace(Event $event): array`
  - [x] `getMenuBreakdown(Event $event): array`
  - [x] `getStaffingOverview(Event $event): array`
  - [x] `getTransportSummary(Event $event): array`
  - [x] `getVoucherSummary(Event $event): array`
  - [x] `getFinancials(Event $event): array`
  - [x] `getQuickStats(Event $event): array`

- [x] **Backend: API Endpointy**
  - [x] `GET /api/events/{id}/manager-dashboard`
  - [x] `POST /api/events/{id}/staff-assignments/{aid}/pay`
  - [x] `POST /api/events/{id}/vouchers/scan`
  - [x] `POST /api/events/{id}/vouchers/{vid}/validate`
  - [x] `POST /api/events/{id}/expenses`
  - [x] `POST /api/events/{id}/income`

- [x] **Frontend: Hlavní stránka**
  - [x] `EventDashboardPage.tsx`
  - [x] `useEventDashboard.ts` hook (30s auto-refresh)

- [x] **Frontend: Komponenty**
  - [x] `DashboardHeader.tsx`
  - [x] `GuestOverviewCard.tsx`
  - [x] `StaffPlanningCard.tsx`

### P1 - Důležité (Pro běžné použití) ✅ HOTOVO

- [x] **Frontend: Akční komponenty**
  - [x] `VoucherCard.tsx` (s QR scanner dialogem)
  - [x] `ExpenseTrackerCard.tsx` (včetně příjmů)
  - [x] `SettlementCard.tsx`
  - [x] `QuickActionsBar.tsx`

- [x] **Frontend: Dialogy** (integrované v komponentech)
  - [x] `StaffContactsDialog` (v StaffPlanningCard)
  - [x] `AddExpenseDialog` (v ExpenseTrackerCard)
  - [x] `AddIncomeDialog` (v ExpenseTrackerCard)
  - [x] `VoucherScannerDialog` (v VoucherCard)

### P2 - Nice to have ✅ VĚTŠINA HOTOVO

- [x] `TransportCard.tsx`
- [x] `IncomeTrackerCard.tsx` (integrováno v ExpenseTrackerCard)
- [x] Auto-refresh (30s interval)
- [ ] Pull-to-refresh gesto
- [ ] Offline podpora

---

## Soubory k vytvoření/úpravě

### Backend (PHP)

| Soubor | Akce | Status |
|--------|------|--------|
| `api/src/Service/EventDashboardService.php` | VYTVOŘIT | ✅ |
| `api/src/Controller/EventController.php` | UPRAVIT | ✅ |

### Frontend (TypeScript/React)

| Soubor | Akce | Status |
|--------|------|--------|
| `shared/types.ts` | UPRAVIT | ✅ |
| `client/src/App.tsx` | UPRAVIT | ✅ |
| `client/src/modules/events/pages/EventDashboardPage.tsx` | VYTVOŘIT | ✅ |
| `client/src/modules/events/hooks/useEventDashboard.ts` | VYTVOŘIT | ✅ |
| `client/src/modules/events/components/dashboard/index.ts` | VYTVOŘIT | ✅ |
| `client/src/modules/events/components/dashboard/DashboardHeader.tsx` | VYTVOŘIT | ✅ |
| `client/src/modules/events/components/dashboard/GuestOverviewCard.tsx` | VYTVOŘIT | ✅ |
| `client/src/modules/events/components/dashboard/StaffPlanningCard.tsx` | VYTVOŘIT | ✅ |
| `client/src/modules/events/components/dashboard/TransportCard.tsx` | VYTVOŘIT | ✅ |
| `client/src/modules/events/components/dashboard/VoucherCard.tsx` | VYTVOŘIT | ✅ |
| `client/src/modules/events/components/dashboard/ExpenseTrackerCard.tsx` | VYTVOŘIT | ✅ |
| `client/src/modules/events/components/dashboard/SettlementCard.tsx` | VYTVOŘIT | ✅ |
| `client/src/modules/events/components/dashboard/QuickActionsBar.tsx` | VYTVOŘIT | ✅ |

---

## Přístup k dashboardu

Dashboard je dostupný na:
- **URL**: `/events/{id}/dashboard`
- **Tablet**: `http://192.168.x.x:5000/events/1/dashboard`
- **Full-screen** režim bez sidebaru pro tablet

Existující edit stránka zůstává na: `/events/{id}/edit`

---

## API Response Struktura

### GET /api/events/{id}/manager-dashboard

```typescript
{
  event: DashboardEvent,
  guestsBySpace: [{
    spaceName: "ROUBENKA",
    totalGuests: 170,
    paidGuests: 120,
    freeGuests: 50,
    presentGuests: 45,
    nationalityBreakdown: { "CZ": 50, "EN": 30, "CN": 20 },
    menuBreakdown: [
      { menuName: "Standardní kuřecí", count: 80, surcharge: 0 },
      { menuName: "Premium hovězí", count: 40, surcharge: 200 }
    ]
  }],
  staffing: {
    required: [{ category: "cisniciWaiters", label: "Číšníci", required: 5, assigned: 4, shortfall: 1 }],
    assignments: [{ id: 1, staffMember: {...}, role: "Číšník", paymentStatus: "PENDING" }]
  },
  transport: {
    reservationsWithTaxi: [{ contactName: "Novák", contactPhone: "+420...", passengerCount: 4 }],
    totalPassengers: 12,
    totalReservations: 5
  },
  vouchers: {
    eventVouchers: [...],
    validatedCount: 15,
    pendingCount: 5,
    totalVoucherGuests: 20
  },
  financials: {
    cashbox: { id: 1, name: "Pokladna 2026-01-10", initialBalance: 20000, currentBalance: 33000 },
    expensesByCategory: [...],
    incomeByCategory: [...],
    settlement: { initialCash: 20000, totalIncome: 45000, totalExpenses: 22000, netResult: 43000, cashOnHand: 43000 }
  },
  stats: {
    presentGuests: 45,
    totalGuests: 170,
    occupancyRate: 26.5,
    scheduleProgress: { completed: 2, total: 5, currentActivity: "Večeře" }
  }
}
```

---

## Testovací scénáře

1. **Dashboard načtení** - Otevřít dashboard, ověřit všechny karty ✅
2. **Hosté podle prostoru** - Rozbalit Roubenka, zkontrolovat národnosti ✅
3. **Personál** - Zobrazit kontakty, označit přítomnost ✅
4. **Voucher scan** - Naskenovat QR / zadat kód, ověřit zápis do systému ✅
5. **Přidat výdaj** - Platba tanečníkům, ověřit v cashboxu ✅
6. **Přidat příjem** - Přidat hotovostní platbu ✅
7. **Vyúčtování** - Příjmy - výdaje = výsledek ✅
8. **Tablet test** - Dotykové ovládání, čitelnost ✅

---

## Příkazy

```bash
# Backend validace
cd api && php bin/console doctrine:schema:validate

# Frontend check
npm run check

# Development
npm run dev

# Tablet přístup
http://192.168.x.x:5000/events/1/dashboard
```
