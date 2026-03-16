# EVENTS.md - Dokumentace modulu Events

## Obsah

1. [Přehled](#přehled)
2. [Architektura](#architektura)
3. [Entity a vztahy](#entity-a-vztahy)
4. [API Endpointy](#api-endpointy)
5. [Služby (Services)](#služby-services)
6. [Frontend komponenty](#frontend-komponenty)
7. [Datové toky](#datové-toky)
8. [Klíčová business logika](#klíčová-business-logika)

---

## Přehled

Modul Events zajišťuje kompletní správu akcí v systému Folklore Garden. Zahrnuje:

- **Správu akcí** - vytváření, editace, plánování
- **Správu hostů** - synchronizace z rezervací, check-in, usazení
- **Personální plánování** - přiřazení personálu, docházka, výplaty
- **Finanční tracking** - platby z rezervací, faktury, výdaje, příjmy
- **Dashboard pro manažery** - real-time přehled během akce (tablet-friendly)
- **Integrace s fakturami** - propojení s Invoice modulem, zálohové a finální faktury

---

## Architektura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EVENTS MODULE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  BACKEND (api/src/)                                                         │
│  ├── Entity/                                                                │
│  │   ├── Event.php              # Hlavní entita akce                       │
│  │   ├── EventGuest.php         # Hosté na akci                            │
│  │   ├── EventMenu.php          # Menu položky (agregované)                │
│  │   ├── EventStaffAssignment.php # Přiřazení personálu                    │
│  │   ├── EventTable.php         # Stoly (floor plan)                       │
│  │   ├── EventSchedule.php      # Časový harmonogram                       │
│  │   ├── EventVoucher.php       # Vouchery na akci                         │
│  │   ├── EventSpace.php         # Prostory akce                            │
│  │   ├── EventBeverage.php      # Nápoje                                   │
│  │   └── EventInvoice.php       # Propojení s fakturami                    │
│  ├── Controller/                                                            │
│  │   └── EventController.php    # 40+ API endpointů                        │
│  ├── Service/                                                               │
│  │   ├── EventGuestSyncService.php   # Sync hostů z rezervací              │
│  │   ├── EventDashboardService.php   # Data pro dashboard                  │
│  │   ├── AutoEventService.php        # Auto-vytváření akcí                 │
│  │   └── SeatingAlgorithmService.php # Algoritmus usazení                  │
│  └── Repository/                                                            │
│      └── EventRepository.php                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  FRONTEND (client/src/modules/events/)                                      │
│  ├── pages/                                                                 │
│  │   ├── EventsPage.tsx         # Seznam akcí                              │
│  │   ├── EventEditPage.tsx      # Editace akce (8 tabů)                    │
│  │   ├── EventDashboardPage.tsx # Manažerský dashboard                     │
│  │   └── WaiterViewPage.tsx     # Pohled pro číšníky                       │
│  ├── components/                                                            │
│  │   ├── dashboard/             # Dashboard komponenty                      │
│  │   └── tabs/                  # Komponenty pro jednotlivé taby            │
│  └── hooks/                                                                 │
│      └── useEventDashboard.ts   # Hook pro dashboard data                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Entity a vztahy

### Diagram vztahů

```
Event (1) ──┬──→ (M) EventGuest ──→ (0..1) EventTable
            │                   ──→ (0..1) Reservation
            │                   ──→ (0..1) EventMenu
            ├──→ (M) EventMenu ──→ (0..1) ReservationFoods
            ├──→ (M) EventBeverage
            ├──→ (M) EventStaffAssignment ──→ StaffMember (by ID)
            │                             ──→ StaffRole (by ID)
            ├──→ (M) EventSchedule
            ├──→ (M) EventTable
            ├──→ (M) EventSpace
            ├──→ (M) EventVoucher ──→ Voucher ──→ Partner
            ├──→ (M) EventInvoice ──→ Invoice
            └──→ (0..1) Reservation
```

### Event (Hlavní entita)

**Soubor:** `api/src/Entity/Event.php`

| Vlastnost | Typ | Popis |
|-----------|-----|-------|
| `name` | string | Název akce |
| `eventType` | string | Typ: FOLKLORE_SHOW, WEDDING, PRIVATE, CORPORATE |
| `eventDate` | DateTime | Datum konání |
| `eventTime` | DateTime | Čas začátku |
| `durationMinutes` | int | Délka v minutách |
| `status` | string | DRAFT, PLANNED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED |
| `guestsPaid` | int | Počet placených hostů |
| `guestsFree` | int | Počet neplacených hostů (děti, průvodci) |
| `guestsTotal` | int | Celkem hostů (computed) |
| `venue` | string | Místo konání |
| `spaces` | Collection | Prostory (roubenka, terasa, stodolka, cely_areal) |
| `organizerPerson` | string | Kontaktní osoba |
| `organizerEmail` | string | Email organizátora |
| `organizerPhone` | string | Telefon organizátora |
| `totalPrice` | decimal | Celková cena |
| `depositAmount` | decimal | Záloha |
| `depositPaid` | bool | Záloha zaplacena |
| `isAutoGenerated` | bool | Automaticky vytvořená z rezervací |
| `notesStaff` | text | Poznámky pro personál |
| `notesInternal` | text | Interní poznámky |
| `specialRequirements` | text | Speciální požadavky |

**Lifecycle hooks:**
- `onPrePersist()` / `onPreUpdate()`: Automaticky přepočítá `guestsTotal = guestsPaid + guestsFree`

### EventGuest (Host na akci)

**Soubor:** `api/src/Entity/EventGuest.php`

| Vlastnost | Typ | Popis |
|-----------|-----|-------|
| `event` | Event | FK na akci |
| `reservation` | Reservation | FK na zdrojovou rezervaci (optional) |
| `eventTable` | EventTable | FK na stůl (optional) |
| `menuItem` | EventMenu | FK na vybrané menu |
| `firstName` | string | Jméno |
| `lastName` | string | Příjmení |
| `type` | string | adult, child, infant |
| `nationality` | string | Národnost |
| `isPaid` | bool | Platící host |
| `isPresent` | bool | Přítomen na akci |
| `personIndex` | int | Index v původní rezervaci |
| `notes` | text | Poznámky |

### EventMenu (Agregované menu)

**Soubor:** `api/src/Entity/EventMenu.php`

| Vlastnost | Typ | Popis |
|-----------|-----|-------|
| `event` | Event | FK na akci |
| `reservationFood` | ReservationFoods | FK na katalog menu (optional) |
| `menuName` | string | Název jídla |
| `quantity` | int | Počet porcí |
| `pricePerUnit` | decimal | Cena za porci |
| `totalPrice` | decimal | Celková cena (quantity × price) |
| `servingTime` | Time | Čas servírování |

### EventStaffAssignment (Přiřazení personálu)

**Soubor:** `api/src/Entity/EventStaffAssignment.php`

| Vlastnost | Typ | Popis |
|-----------|-----|-------|
| `event` | Event | FK na akci |
| `staffMemberId` | int | ID zaměstnance |
| `staffRoleId` | int | ID role (optional) |
| `assignmentStatus` | string | ASSIGNED, CONFIRMED, DECLINED, COMPLETED |
| `attendanceStatus` | string | PENDING, PRESENT, ABSENT, LATE |
| `hoursWorked` | decimal | Odpracované hodiny |
| `paymentAmount` | decimal | Vyplacená částka |
| `paymentStatus` | string | PENDING, PAID |
| `notes` | text | Poznámky |

### EventTable (Stůl / Floor plan)

**Soubor:** `api/src/Entity/EventTable.php`

| Vlastnost | Typ | Popis |
|-----------|-----|-------|
| `event` | Event | FK na akci |
| `tableName` | string | Název stolu (Table 1, VIP) |
| `room` | string | Prostor: roubenka, terasa, stodolka, cely_areal |
| `capacity` | int | Kapacita (default 4) |
| `positionX` | int | X pozice pro floor plan |
| `positionY` | int | Y pozice pro floor plan |

### EventSchedule (Harmonogram)

**Soubor:** `api/src/Entity/EventSchedule.php`

| Vlastnost | Typ | Popis |
|-----------|-----|-------|
| `event` | Event | FK na akci |
| `timeSlot` | Time | Čas |
| `durationMinutes` | int | Délka aktivity |
| `activity` | string | ARRIVAL, WELCOME_DRINK, DINNER, SHOW, DANCE, CLOSING |
| `description` | text | Popis |
| `responsibleStaffId` | int | Zodpovědná osoba |

### EventVoucher (Voucher na akci)

**Soubor:** `api/src/Entity/EventVoucher.php`

| Vlastnost | Typ | Popis |
|-----------|-----|-------|
| `event` | Event | FK na akci |
| `voucherId` | int | FK na voucher |
| `quantity` | int | Počet hostů s voucherem |
| `validated` | bool | Ověřeno/uplatněno |
| `validatedAt` | DateTime | Čas ověření |
| `validatedBy` | User | Kdo ověřil |

---

## API Endpointy

### Správa akcí

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/api/events` | Seznam všech akcí |
| GET | `/api/events/{id}` | Detail akce (spouští sync hostů) |
| POST | `/api/events` | Vytvoření akce |
| PUT | `/api/events/{id}` | Aktualizace akce |
| DELETE | `/api/events/{id}` | Smazání akce |
| GET | `/api/events/{id}/manager-dashboard` | Data pro dashboard |
| POST | `/api/events/from-reservation/{id}` | Vytvoření z rezervace |

### Správa hostů

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/api/events/{id}/guests` | Seznam hostů |
| POST | `/api/events/{id}/guests` | Přidání hosta |
| POST | `/api/events/{id}/guests/bulk` | Hromadné přidání |
| PUT | `/api/events/{id}/guests/{guestId}` | Aktualizace hosta |
| DELETE | `/api/events/{id}/guests/{guestId}` | Smazání hosta |
| POST | `/api/events/{id}/guests/from-reservations` | Sync z rezervací |
| POST | `/api/events/{id}/guests/mark-all-present` | Označit všechny přítomné |
| GET | `/api/events/{id}/guests/by-reservation` | Hosté podle rezervace |
| PUT | `/api/events/{id}/guests/reservation/{resId}/presence` | Toggle přítomnosti skupiny |

### Správa personálu

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/api/events/{id}/staff-assignments` | Seznam přiřazení |
| POST | `/api/events/{id}/staff-assignments` | Přiřadit personál |
| PUT | `/api/events/{id}/staff-assignments/{aid}` | Aktualizovat přiřazení |
| DELETE | `/api/events/{id}/staff-assignments/{aid}` | Odebrat přiřazení |
| POST | `/api/events/{id}/staff-assignments/{aid}/pay` | Zaznamenat výplatu |
| POST | `/api/events/{id}/staff-assignments/mark-all-present` | Všichni přítomni |
| PUT | `/api/events/{id}/staff-assignments/{aid}/attendance` | Aktualizovat docházku |

### Správa menu a nápojů

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/api/events/{id}/menu` | Seznam menu |
| POST | `/api/events/{id}/menu` | Přidat menu položku |
| PUT | `/api/events/{id}/menu/{menuId}` | Aktualizovat menu |
| DELETE | `/api/events/{id}/menu/{menuId}` | Smazat menu |
| GET | `/api/events/{id}/beverages` | Seznam nápojů |
| POST | `/api/events/{id}/beverages` | Přidat nápoj |
| PUT | `/api/events/{id}/beverages/{id}` | Aktualizovat nápoj |
| DELETE | `/api/events/{id}/beverages/{id}` | Smazat nápoj |

### Správa stolů a harmonogramu

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/api/events/{id}/tables` | Seznam stolů |
| POST | `/api/events/{id}/tables` | Přidat stůl |
| PUT | `/api/events/{id}/tables/{tableId}` | Aktualizovat stůl |
| DELETE | `/api/events/{id}/tables/{tableId}` | Smazat stůl |
| GET | `/api/events/{id}/schedule` | Harmonogram |
| POST | `/api/events/{id}/schedule` | Přidat položku |
| PUT | `/api/events/{id}/schedule/{id}` | Aktualizovat |
| DELETE | `/api/events/{id}/schedule/{id}` | Smazat |

### Vouchery

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/api/events/{id}/vouchers` | Seznam voucherů |
| POST | `/api/events/{id}/vouchers` | Přidat voucher |
| POST | `/api/events/{id}/vouchers/scan` | Skenovat QR kód |
| POST | `/api/events/{id}/vouchers/{vid}/validate` | Validovat voucher |

### Finance a platby

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| POST | `/api/events/{id}/expenses` | Přidat výdaj (cashbox) |
| POST | `/api/events/{id}/income` | Přidat příjem (cashbox) |
| GET | `/api/events/{id}/payments` | Přehled plateb z rezervací |
| PUT | `/api/events/{id}/reservations/{resId}/payment-note` | Aktualizovat poznámku k platbě |
| POST | `/api/events/{id}/reservations/{resId}/record-payment` | Zaznamenat platbu rezervace |

### Usazení hostů

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| POST | `/api/events/{id}/seating-suggestion` | Návrh usazení |
| PUT | `/api/events/{id}/seating-apply` | Aplikovat usazení |
| DELETE | `/api/events/{id}/seating-clear` | Vyčistit usazení |
| GET | `/api/events/{id}/seating-stats` | Statistiky usazení |

### Speciální pohledy

| Metoda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/api/events/{id}/waiter-view` | Pohled pro číšníky |

---

## Služby (Services)

### EventGuestSyncService

**Soubor:** `api/src/Service/EventGuestSyncService.php`

**Účel:** Synchronizuje hosty z rezervací do akce na základě shodného data.

**Hlavní metoda:** `syncForEvent(Event $event)`

**Algoritmus:**
```
1. Smaž všechny EventGuest a EventMenu pro danou akci
2. Najdi rezervace kde Reservation.date == Event.eventDate
3. Pro každou rezervaci:
   - Pro každou ReservationPerson:
     a) Vytvoř EventGuest
     b) Najdi/vytvoř EventMenu (cache pro deduplikaci)
     c) Propoj hosta s menu
     d) Akumuluj quantity a totalPrice
4. Ulož změny
```

**Kdy se volá:**
- `GET /api/events/{id}` - při načtení detailu
- `GET /api/events/{id}/manager-dashboard` - při načtení dashboardu
- `POST /api/events` - při vytvoření akce
- `PUT /api/events/{id}` - při změně data akce

### EventDashboardService

**Soubor:** `api/src/Service/EventDashboardService.php`

**Účel:** Generuje kompletní data pro manažerský dashboard.

**Hlavní metoda:** `getDashboardData(Event $event): array`

**Vrací:**
```php
[
    'event' => [...],           // Základní info o akci
    'guestsBySpace' => [...],   // Hosté podle prostoru
    'staffing' => [...],        // Personální přehled
    'transport' => [...],       // Taxi/transfer
    'vouchers' => [...],        // Stav voucherů
    'financials' => [...],      // Výdaje/příjmy
    'stats' => [...]            // Quick statistiky
]
```

**Dílčí metody:**

| Metoda | Popis |
|--------|-------|
| `getGuestsBySpace()` | Statistiky hostů podle prostoru (roubenka, terasa...) |
| `getStaffingOverview()` | Porovnání požadovaného vs přiřazeného personálu |
| `getTransportSummary()` | Seznam rezervací s taxi/transferem |
| `getVoucherSummary()` | Přehled validovaných/čekajících voucherů |
| `getFinancials()` | Cashbox, výdaje, příjmy, bilance |
| `getQuickStats()` | Obsazenost, progress harmonogramu |

### AutoEventService

**Soubor:** `api/src/Service/AutoEventService.php`

**Účel:** Automaticky vytváří/spravuje akce na základě rezervací.

**Metody:**

| Metoda | Popis |
|--------|-------|
| `ensureEventForDate(DateTime)` | Najde nebo vytvoří akci pro datum |
| `syncReservationToEvent(Reservation)` | Sync rezervace do akce |
| `handleReservationDeleted(DateTime)` | Přesync po smazání rezervace |

**Kdy se volá:**
- Při změně data rezervace (nově přidáno)
- Při smazání rezervace
- Při vytvoření nové rezervace (volitelně)

### SeatingAlgorithmService

**Soubor:** `api/src/Service/SeatingAlgorithmService.php`

**Účel:** Navrhuje optimální usazení hostů ke stolům.

**Logika:**
- Seskupuje hosty podle národnosti
- Respektuje kapacitu stolů
- Optimalizuje využití prostoru

---

## Frontend komponenty

### Stránky

#### EventsPage (`pages/EventsPage.tsx`)
- Seznam všech akcí
- Filtry: status, typ, období
- Vyhledávání
- CRUD operace

#### EventEditPage (`pages/EventEditPage.tsx`)
- 8 tabů pro editaci:
  1. **Základní** - info, datum, kontakt
  2. **Hosté** - CRUD, bulk operace, sync
  3. **Menu** - správa jídel
  4. **Nápoje** - správa nápojů
  5. **Harmonogram** - timeline
  6. **Stoly** - floor plan
  7. **Personál** - přiřazení, docházka
  8. **Vouchery** - správa voucherů

#### EventDashboardPage (`pages/EventDashboardPage.tsx`)
- Real-time dashboard pro tablet
- Auto-refresh každých 30 sekund
- Optimalizováno pro dotykové ovládání

#### WaiterViewPage (`pages/WaiterViewPage.tsx`)
- Zjednodušený pohled pro číšníky
- Stoly, hosté, menu, harmonogram

### Dashboard komponenty

```
client/src/modules/events/components/dashboard/
├── DashboardHeader.tsx      # Hlavička s názvem a stats
├── GroupCheckInCard.tsx     # Check-in hostů podle skupin
├── GuestOverviewCard.tsx    # Přehled hostů podle prostoru
├── StaffPlanningCard.tsx    # Personální plánování
├── TransportCard.tsx        # Taxi/transfer přehled
├── VoucherCard.tsx          # Vouchery a QR scanner
├── ExpenseTrackerCard.tsx   # Výdaje a příjmy
├── SettlementCard.tsx       # Vyúčtování/bilance
└── QuickActionsBar.tsx      # Rychlé akce
```

### Hooks

#### `useEventDashboard(eventId)`
```typescript
// Načítá data z /api/events/{id}/manager-dashboard
// Auto-refetch: 30 sekund
// Stale time: 10 sekund
```

---

## Datové toky

### 1. Vytvoření akce

```
[Frontend]                          [Backend]
    │                                   │
    ├─ POST /api/events ───────────────→│
    │   { name, eventDate, ... }        │
    │                                   ├─ Vytvoř Event
    │                                   ├─ Vytvoř EventSpace[]
    │                                   ├─ EventGuestSyncService.syncForEvent()
    │                                   │   ├─ Najdi Reservation kde date == eventDate
    │                                   │   └─ Vytvoř EventGuest + EventMenu
    │←─ { status: 'created', id } ─────┤
    │                                   │
```

### 2. Načtení dashboardu

```
[Frontend]                          [Backend]
    │                                   │
    ├─ GET /events/{id}/manager-dashboard ─→│
    │                                   ├─ EventGuestSyncService.syncForEvent()
    │                                   ├─ EventDashboardService.getDashboardData()
    │                                   │   ├─ getGuestsBySpace()
    │                                   │   ├─ getStaffingOverview()
    │                                   │   ├─ getTransportSummary()
    │                                   │   ├─ getVoucherSummary()
    │                                   │   ├─ getFinancials()
    │                                   │   └─ getQuickStats()
    │←─ { event, guestsBySpace, ... } ─┤
    │                                   │
    │   [30s later - auto-refetch]      │
    ├─ GET /events/{id}/manager-dashboard ─→│
    │   ...                             │
```

### 3. Změna data rezervace → Aktualizace akce

```
[Frontend]                          [Backend]
    │                                   │
    ├─ PUT /api/reservations/{id} ─────→│
    │   { date: "2024-06-20" }          │
    │                                   ├─ Uložit nové datum
    │                                   ├─ autoEventService.handleReservationDeleted(oldDate)
    │                                   │   └─ Přesync akce na starém datu
    │                                   ├─ autoEventService.syncReservationToEvent(reservation)
    │                                   │   └─ Přesync akce na novém datu
    │←─ { message: 'updated' } ────────┤
    │                                   │
```

### 4. Check-in hosta

```
[Frontend - Dashboard]              [Backend]
    │                                   │
    ├─ PUT /events/{id}/guests/{gid} ──→│
    │   { isPresent: true }             │
    │                                   ├─ Update EventGuest.isPresent
    │←─ { success } ───────────────────┤
    │                                   │
    ├─ [invalidate query] ─────────────→│
    │                                   │
    ├─ GET /events/{id}/manager-dashboard ─→│
    │   (auto-refetch)                  │
```

---

## Klíčová business logika

### Počítání hostů

```php
Event.guestsTotal = Event.guestsPaid + Event.guestsFree

// Automaticky při uložení (onPrePersist, onPreUpdate)
```

### Personální formule

```php
// Příklad: Akce typu FOLKLORE_SHOW, 20 hostů
// Formula: waiter_FOLKLORE_SHOW s ratio = 4

$requiredWaiters = ceil(20 / 4); // = 5 číšníků

// Dashboard zobrazí:
// - Required: 5
// - Assigned: 3
// - Shortfall: 2
```

### Agregace menu

```php
// EventMenu agreguje všechny hosty se stejným jídlem
EventMenu {
    menuName: "Kuřecí steak",
    quantity: 15,              // 15 hostů
    pricePerUnit: 450,         // 450 Kč/porce
    totalPrice: 6750           // 15 × 450
}
```

### Finanční tracking (Cashbox)

```php
// Při přidání výdaje/příjmu:
1. Najdi/vytvoř Cashbox pro datum akce
2. Vytvoř CashMovement
3. Aktualizuj Cashbox.currentBalance:
   - Výdaj: balance -= amount
   - Příjem: balance += amount
```

### Platby z rezervací (Payment Overview)

Dashboard zobrazuje přehled plateb ze všech rezervací propojených s akcí:

```typescript
EventPaymentOverview {
  reservations: [
    {
      reservationId: 123,
      contactName: "Karel Novák",
      guestCount: 4,
      totalPrice: 4800,
      paidAmount: 2400,
      remainingAmount: 2400,
      paymentStatus: "PARTIAL",  // UNPAID | PARTIAL | PAID
      paymentMethod: "DEPOSIT",
      paymentNote: "Doplatek při příjezdu",
      invoices: [
        { invoiceNumber: "2024-0001", invoiceType: "DEPOSIT", status: "PAID", total: 2400 }
      ]
    }
  ],
  totals: {
    totalExpected: 48000,
    totalPaid: 32000,
    totalRemaining: 16000,
    reservationCount: 10,
    paidCount: 6,
    partialCount: 2,
    unpaidCount: 2
  },
  invoices: [...]  // Všechny faktury propojené s akcí přes EventInvoice
}
```

**Klíčové funkce:**
- Zobrazení "kdo ještě nezaplatil" na dashboardu
- Možnost přidat poznámku k platbě (např. "zaplatí při příjezdu")
- Zaznamenání platby přímo z kontextu akce
- Propojení s Invoice modulem (zálohové/finální faktury)

**Datový tok plateb:**
```
Reservation.totalPrice      → Celková cena rezervace
Reservation.paidAmount      → Již zaplaceno
Reservation.paymentStatus   → UNPAID | PARTIAL | PAID
Reservation.paymentNote     → Historie plateb a poznámky
         ↓
EventDashboardService.getReservationPayments()
         ↓
financials.payments v dashboard response
```

### Propojení s fakturačním modulem

Event může být propojen s fakturami dvěma způsoby:

1. **Přes rezervace** - Každá rezervace může mít faktury (Invoice)
2. **Přes EventInvoice** - Přímé propojení akce s fakturami

```
Event
  ├── eventInvoices[] ──→ EventInvoice ──→ Invoice
  │                           ├── invoiceType: 'deposit' | 'final' | 'other'
  │                           └── orderNumber: 1, 2, 3... (pořadí faktur)
  │
  └── guests[] ──→ EventGuest ──→ Reservation ──→ invoices[]
                                      ├── Invoice (DEPOSIT)
                                      └── Invoice (FINAL)
```

**Typy faktur:**
- `DEPOSIT` - Zálohová faktura (typicky 25% z ceny)
- `FINAL` - Finální faktura (doplatek)
- `PARTIAL` - Dílčí faktura

**Stavy faktur:**
- `DRAFT` - Vytvořena, neodeslána
- `SENT` - Odeslána zákazníkovi
- `PAID` - Zaplacena
- `CANCELLED` - Stornována

### Sync logika (rezervace → akce)

```php
// Rezervace se synchronizují do akce na základě shody data
Reservation.date == Event.eventDate

// Sync vytvoří:
// - EventGuest pro každou ReservationPerson
// - EventMenu agregát pro každé unikátní jídlo

// Sync je idempotentní (full rebuild)
```

---

## Oprávnění

| Akce | Permission |
|------|------------|
| Zobrazit akce | `events.read` |
| Vytvořit akci | `events.create` |
| Upravit akci | `events.update` |
| Smazat akci | `events.delete` |

---

## Časté workflow

### 1. Denní správa akce (tablet)

1. Otevřít `/events/{id}/dashboard`
2. Check-in hostů pomocí GroupCheckInCard
3. Sledovat obsazenost v reálném čase
4. Zaznamenávat výdaje (personál, catering)
5. Skenovat/validovat vouchery
6. Kontrolovat vyúčtování

### 2. Vytvoření akce z rezervace

1. V seznamu rezervací kliknout "Vytvořit akci"
2. `POST /api/events/from-reservation/{reservationId}`
3. Automaticky se vyplní: jméno, datum, kontakt
4. Hosté se synchronizují z rezervace
5. Dokončit editaci v EventEditPage

### 3. Plánování personálu

1. Otevřít tab "Personál" v EventEditPage
2. Systém zobrazí doporučený počet podle formule
3. Přidat personál z databáze StaffMember
4. Nastavit role a hodinové sazby
5. V den akce označovat přítomnost
6. Po akci zaznamenat odpracované hodiny a výplatu

---

## Soubory modulu

### Backend

```
api/src/
├── Controller/
│   └── EventController.php          # 2200+ řádků, 40+ endpointů
├── Entity/
│   ├── Event.php
│   ├── EventGuest.php
│   ├── EventMenu.php
│   ├── EventStaffAssignment.php
│   ├── EventTable.php
│   ├── EventSchedule.php
│   ├── EventVoucher.php
│   ├── EventSpace.php
│   ├── EventBeverage.php
│   └── EventInvoice.php
├── Service/
│   ├── EventGuestSyncService.php
│   ├── EventDashboardService.php
│   ├── AutoEventService.php
│   └── SeatingAlgorithmService.php
└── Repository/
    └── EventRepository.php
```

### Frontend

```
client/src/modules/events/
├── pages/
│   ├── EventsPage.tsx
│   ├── EventEditPage.tsx
│   ├── EventDashboardPage.tsx
│   └── WaiterViewPage.tsx
├── components/
│   ├── dashboard/
│   │   ├── DashboardHeader.tsx
│   │   ├── GroupCheckInCard.tsx
│   │   ├── GuestOverviewCard.tsx
│   │   ├── StaffPlanningCard.tsx
│   │   ├── TransportCard.tsx
│   │   ├── VoucherCard.tsx
│   │   ├── ExpenseTrackerCard.tsx
│   │   ├── SettlementCard.tsx
│   │   └── index.ts
│   └── tabs/
│       ├── GuestsTab.tsx
│       ├── MenuTab.tsx
│       ├── StaffTab.tsx
│       ├── TablesTab.tsx
│       ├── ScheduleTab.tsx
│       └── VouchersTab.tsx
└── hooks/
    └── useEventDashboard.ts
```

### Shared typy

```
shared/types.ts
├── Event
├── EventGuest
├── EventMenu
├── EventStaffAssignment
├── EventTable
├── EventScheduleItem
├── EventVoucher
├── ManagerDashboardData
├── SpaceGuestStats
├── StaffingOverview
├── TransportSummary
├── EventFinancials
├── EventPaymentOverview          # NEW: Přehled plateb z rezervací
├── ReservationPaymentSummary     # NEW: Souhrn platby rezervace
├── ReservationInvoiceSummary     # NEW: Souhrn faktury rezervace
├── PaymentTotals                 # NEW: Celkové součty plateb
├── EventInvoiceSummary           # NEW: Souhrn faktury akce
└── ...
```

---

## Changelog

| Datum | Změna |
|-------|-------|
| 2026-01-12 | Přidán přehled plateb z rezervací (EventPaymentOverview) |
| 2026-01-12 | Přidány endpointy pro správu plateb z kontextu akce |
| 2026-01-12 | Integrace s fakturačním modulem (Invoice) |
| 2026-01-12 | Přidána synchronizace akcí při změně data rezervace |
| 2026-01-12 | Oprava paymentAmount v createStaffAssignment |
