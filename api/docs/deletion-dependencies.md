# Mazání entit - závislosti a pravidla

## Event (Akce)

### Automaticky kaskádované (Doctrine cascade: remove)
Tyto entity se smažou automaticky s eventem:
- `EventGuest` - hosté akce
- `EventMenu` - menu akce
- `EventBeverage` - nápoje
- `EventStaffAssignment` - přiřazení personálu
- `EventSchedule` - harmonogram
- `EventVoucher` - vouchery
- `EventTable` - stoly (floor plan)
- `EventSpace` - prostory (roubenka, terasa...)
- `EventInvoice` - faktury akce

### SET NULL při smazání (FK onDelete: SET NULL)
Tyto entity zůstanou, ale ztratí odkaz na event:
- `Cashbox.event_id` - pokladna se odpojí od akce
- `Event.reservation_id` - odkaz z eventu na rezervaci

### Blokující závislosti (RESTRICT)
Tyto entity **zabrání smazání** eventu:
- `CashboxTransfer.target_event_id` - převody z pokladny do eventu

### Kontroly před smazáním eventu

| Kontrola | Typ | Popis |
|----------|-----|-------|
| CashboxTransfer | BLOCKER | Existují převody z/do pokladny eventu |
| Cashbox s nenulový zůstatkem | BLOCKER | Pokladna má peníze - převeďte do hlavní kasy |
| Cashbox aktivní | BLOCKER | Pokladna je otevřená - uzavřete ji |
| Nezaplacený personál | BLOCKER | Personál nebyl zaplacen |

### Bezpečné vyčištění před smazáním
Po vyřešení blockerů se provede:
1. Smazání `EventStaffRequirement` (nemá cascade v entitě)
2. Odpojení `Cashbox` od eventu (UPDATE SET NULL)
3. Smazání eventu (cascade se postará o zbytek)

---

## Reservation (Rezervace)

### Automaticky kaskádované (Doctrine cascade: remove)
- `ReservationPerson` - osoby v rezervaci
- `Payment` - platby (POZOR: finanční data se smažou!)
- `ReservationTransfer` - transfery

### SET NULL při smazání
- `EventGuest.reservation_id` - hosté v akci ztratí odkaz na rezervaci
- `EventMenu.reservation_id` - menu položky ztratí odkaz
- `Invoice.reservation_id` - faktury zůstanou, odpojí se
- `CashMovement.reservation_id` - pohyby v kase zůstanou
- `Cashbox.reservation_id` - pokladna se odpojí
- `StockMovement.reservation_id` - skladové pohyby zůstanou
- `VoucherRedemption.reservation_id` - vouchery zůstanou
- `CommissionLog.reservation_id` - provize zůstanou
- `StaffAttendance.reservation_id` - docházka zůstane
- `Event.reservation_id` - event ztratí odkaz na rezervaci

### Kaskádované mazání (FK onDelete: CASCADE)
- `StaffReservationAssignment` - přiřazení personálu k rezervaci

### Varování před smazáním rezervace

| Kontrola | Typ | Popis |
|----------|-----|-------|
| Propojený event | WARNING | Rezervace je v akci - hosté budou odpojeni |
| Platby | WARNING | Rezervace má platby - smažou se |
| Faktury | WARNING | Faktury zůstanou v systému bez odkazu |

---

## Diagram závislostí

```
Event
├── EventGuest ──────────── CASCADE
├── EventMenu ───────────── CASCADE
├── EventBeverage ────────── CASCADE
├── EventStaffAssignment ── CASCADE
├── EventSchedule ────────── CASCADE
├── EventVoucher ─────────── CASCADE
├── EventTable ──────────── CASCADE
├── EventSpace ──────────── CASCADE
├── EventInvoice ─────────── CASCADE
├── EventStaffRequirement ── CASCADE (DB) / manual cleanup
├── Cashbox ──────────────── SET NULL (vyčistit před smazáním)
└── CashboxTransfer ──────── RESTRICT (!! BLOCKER !!)

Reservation
├── ReservationPerson ────── CASCADE
├── Payment ──────────────── CASCADE (!! finanční data !!)
├── ReservationTransfer ──── CASCADE
├── StaffReservationAssign ─ CASCADE
├── EventGuest ──────────── SET NULL
├── EventMenu ───────────── SET NULL
├── Invoice ──────────────── SET NULL
├── CashMovement ─────────── SET NULL
├── Cashbox ──────────────── SET NULL
├── StockMovement ────────── SET NULL
├── VoucherRedemption ────── SET NULL
├── CommissionLog ────────── SET NULL
├── StaffAttendance ──────── SET NULL
└── Event.reservation_id ── SET NULL
```

## API Endpointy

### Hromadné akce (pouze SUPER_ADMIN)

| Endpoint | Metoda | Popis |
|----------|--------|-------|
| `/api/events/bulk-update` | PUT | Hromadná změna statusu/typu akcí |
| `/api/events/bulk-delete` | DELETE | Hromadné mazání akcí (s kontrolou blockerů) |
| `/api/reservations/bulk-update` | PUT | Hromadná změna statusu/typu rezervací |
| `/api/reservations/bulk-delete` | DELETE | Hromadné mazání rezervací |
| `/api/reservations/bulk-check` | POST | Kontrola varování před smazáním |

### Chybové odpovědi

**409 Conflict** - Akci/rezervaci nelze smazat:
```json
{
  "error": "Akci nelze smazat",
  "blockers": [
    {
      "type": "cashbox_balance",
      "message": "Akce má pokladnu se zůstatkem 5 000,00 Kč..."
    }
  ]
}
```

**Typy blockerů pro Event:**
- `cashbox_transfer` - existují převody z pokladny
- `cashbox_balance` - pokladna má nenulový zůstatek
- `cashbox_active` - pokladna je aktivní
- `unpaid_staff` - nezaplacený personál

**Typy varování pro Reservation:**
- `linked_event` - propojená akce
- `has_payments` - existující platby
- `has_invoices` - existující faktury

---

## Kasa (Cashbox)

### Reset hlavní kasy

Kompletní smazání hlavní kasy včetně všech pohybů, uzávěrek, audit logů a převodů. Po resetu se zobrazí inicializační formulář.

**Vyžaduje**: SUPER_ADMIN

```bash
curl -X POST http://localhost:8000/api/cashbox/main/reset \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VÁŠ_TOKEN" \
  -d '{"confirm": "RESET"}'
```

Parametr `"confirm": "RESET"` je povinná pojistka proti nechtěnému smazání.

**Co se smaže:**
- Všechny pohyby (`cash_movement`)
- Všechny uzávěrky (`cashbox_closure`)
- Všechny audit logy (`cashbox_audit_log`)
- Všechny převody z hlavní kasy (`cashbox_transfer`)
- Samotná kasa (`cashbox`)

### Správa kasy - API přehled

| Endpoint | Metoda | Popis | Oprávnění |
|----------|--------|-------|-----------|
| `/api/cashbox/main` | GET | Detail hlavní kasy | cashbox.read |
| `/api/cashbox/main` | POST | Inicializace hlavní kasy | cashbox.create |
| `/api/cashbox/main/reset` | POST | Kompletní reset kasy | SUPER_ADMIN |
| `/api/cashbox/main/movement` | POST | Přidat pohyb | cashbox.update |
| `/api/cashbox/main/movement/{id}` | PUT | Upravit pohyb | cashbox.update |
| `/api/cashbox/main/movement/{id}` | DELETE | Smazat pohyb | cashbox.update |
| `/api/cashbox/main/adjust-balance` | POST | Korekce zůstatku | SUPER_ADMIN |
| `/api/cashbox/main/info` | PUT | Upravit poznámky kasy | cashbox.update |
| `/api/cashbox/main/close` | POST | Denní uzávěrka | cashbox.close |
| `/api/cashbox/main/lock` | POST | Zamknout kasu | cashbox.update |
| `/api/cashbox/main/reopen` | POST | Odemknout kasu | cashbox.reopen |
| `/api/cashbox/main/report` | GET | Report za období | cashbox.read |
| `/api/cashbox/main/export` | GET | CSV export pohybů | cashbox.read |
| `/api/cashbox/main/audit-log` | GET | Audit log | cashbox.read |
| `/api/cashbox/main/transfer-to-event` | POST | Převod na event | cashbox.update |
| `/api/cashbox/transfers/{id}/cancel` | POST | Zrušení převodu | cashbox.update |
| `/api/cashbox/transfers/{id}/confirm` | POST | Potvrzení převodu | cashbox.update |
| `/api/cashbox/transfers/{id}/reject` | POST | Odmítnutí převodu | cashbox.update |
