# Backend API Requirements pro Event Management

## Overview
EventEdit.tsx vyžaduje kompletní API pro správu events včetně všech souvisejících dat (guests, menu, beverages, schedule, tables, staff, vouchers).

## 📋 Požadované API Endpointy

### 1. GET /api/events/:id
**Účel:** Načíst kompletní event včetně všech nested entit

**Response Structure:**
```json
{
  "id": 1,
  "name": "Folklor Show",
  "eventType": "folklorni_show",
  "reservationId": null,
  "eventDate": "2025-11-12",
  "eventTime": "18:00:00",
  "durationMinutes": 120,
  
  "guestsPaid": 50,
  "guestsFree": 10,
  "guestsTotal": 60,
  
  "spaces": ["roubenka", "terasa"],
  
  "organizerCompany": "Folklor s.r.o.",
  "organizerPerson": "Jan Novák",
  "organizerEmail": "jan@folklor.cz",
  "organizerPhone": "+420123456789",
  
  "language": "CZ",
  
  "invoiceCompany": "Folklor s.r.o.",
  "invoiceIc": "12345678",
  "invoiceDic": "CZ12345678",
  "invoiceAddress": "Praha 1",
  
  "totalPrice": 15000.00,
  "depositAmount": 5000.00,
  "depositPaid": true,
  "paymentMethod": "BANK_TRANSFER",
  
  "status": "PLANNED",
  
  "notesStaff": "Poznámka pro personál",
  "notesInternal": "Interní poznámka",
  "specialRequirements": "Bezlepková strava",
  
  "coordinatorId": 5,
  "createdBy": 1,
  "createdAt": "2025-11-11T14:08:33+00:00",
  "updatedAt": "2025-11-11T14:08:33+00:00",
  
  "guests": [
    {
      "id": 1,
      "eventId": 1,
      "eventTableId": 3,
      "reservationId": 15,
      "personIndex": 0,
      "firstName": "Petr",
      "lastName": "Dvořák",
      "nationality": "CZ",
      "type": "adult",
      "isPaid": true,
      "isPresent": false,
      "menuItemId": 2,
      "notes": "Alergie na ořechy"
    }
  ],
  
  "menu": [
    {
      "id": 1,
      "eventId": 1,
      "reservationFoodId": 5,
      "menuName": "Guláš",
      "quantity": 50,
      "pricePerUnit": 150.00,
      "totalPrice": 7500.00,
      "servingTime": "19:00:00",
      "notes": "Podávat horké"
    }
  ],
  
  "beverages": [
    {
      "id": 1,
      "eventId": 1,
      "beverageName": "Pivo",
      "quantity": 100,
      "unit": "bottle",
      "pricePerUnit": 30.00,
      "totalPrice": 3000.00,
      "notes": ""
    }
  ],
  
  "staffAssignments": [
    {
      "id": 1,
      "eventId": 1,
      "staffMemberId": 3,
      "staffRoleId": null,
      "assignmentStatus": "CONFIRMED",
      "attendanceStatus": "PENDING",
      "hoursWorked": 0,
      "paymentAmount": 1500.00,
      "paymentStatus": "PENDING",
      "notes": "",
      "assignedAt": "2025-11-10T10:00:00+00:00",
      "staffMember": {
        "id": 3,
        "firstName": "Marie",
        "lastName": "Nová",
        "email": "marie@example.com",
        "role": "waiter"
      }
    }
  ],
  
  "schedule": [
    {
      "id": 1,
      "eventId": 1,
      "timeSlot": "18:00:00",
      "durationMinutes": 30,
      "activity": "ARRIVAL",
      "description": "Příchod hostů",
      "responsibleStaffId": 3,
      "notes": ""
    }
  ],
  
  "tables": [
    {
      "id": 1,
      "eventId": 1,
      "tableName": "Stůl 1",
      "room": "roubenka",
      "capacity": 10,
      "positionX": 100,
      "positionY": 150
    }
  ],
  
  "vouchers": [
    {
      "id": 1,
      "eventId": 1,
      "voucherId": 5,
      "quantity": 1,
      "validated": false,
      "validatedAt": null,
      "validatedBy": null,
      "notes": "",
      "voucher": {
        "id": 5,
        "code": "SLEVA20",
        "discountPercent": 20
      }
    }
  ]
}
```

### 2. PUT /api/events/:id
**Účel:** Aktualizovat základní údaje eventu (bez nested entit)

**Request Body:**
```json
{
  "name": "Updated Name",
  "eventType": "svatba",
  "eventDate": "2025-12-25",
  "eventTime": "20:00:00",
  "durationMinutes": 180,
  "guestsPaid": 60,
  "guestsFree": 15,
  "organizerPerson": "Nové jméno",
  "status": "CONFIRMED",
  ...
}
```

**Response:** Aktualizovaný Event object (stejná struktura jako GET)

**DŮLEŽITÉ:** 
- `guestsTotal` je computed field - NEPOSÍLAT v requestu!
- Backend musí automaticky přepočítat: `guestsTotal = guestsPaid + guestsFree`

### 3. Guests Endpoints

#### GET /api/events/:eventId/guests
Načíst všechny hosty pro event

#### POST /api/events/:eventId/guests
Přidat nového hosta
```json
{
  "firstName": "Jan",
  "lastName": "Novák",
  "nationality": "CZ",
  "type": "adult",
  "isPaid": true,
  "isPresent": false,
  "eventTableId": 3,
  "menuItemId": 2,
  "notes": "VIP host"
}
```

#### PUT /api/events/:eventId/guests/:id
Aktualizovat hosta

#### DELETE /api/events/:eventId/guests/:id
Smazat hosta

### 4. Menu Endpoints

#### GET /api/events/:eventId/menu
Načíst všechna jídla pro event

#### POST /api/events/:eventId/menu
Přidat jídlo
```json
{
  "menuName": "Svíčková",
  "quantity": 30,
  "pricePerUnit": 200.00,
  "servingTime": "19:30:00",
  "notes": ""
}
```

#### PUT /api/events/:eventId/menu/:id
Aktualizovat jídlo

#### DELETE /api/events/:eventId/menu/:id
Smazat jídlo

### 5. Beverages Endpoints

#### GET /api/events/:eventId/beverages
#### POST /api/events/:eventId/beverages
```json
{
  "beverageName": "Víno bílé",
  "quantity": 20,
  "unit": "bottle",
  "pricePerUnit": 150.00,
  "notes": ""
}
```
#### PUT /api/events/:eventId/beverages/:id
#### DELETE /api/events/:eventId/beverages/:id

### 6. Schedule Endpoints

#### GET /api/events/:eventId/schedule
#### POST /api/events/:eventId/schedule
```json
{
  "timeSlot": "20:00:00",
  "durationMinutes": 60,
  "activity": "SHOW",
  "description": "Folklórní vystoupení",
  "responsibleStaffId": 5,
  "notes": ""
}
```
#### PUT /api/events/:eventId/schedule/:id
#### DELETE /api/events/:eventId/schedule/:id

### 7. Tables Endpoints

#### GET /api/events/:eventId/tables
#### POST /api/events/:eventId/tables
```json
{
  "tableName": "Stůl 5",
  "room": "terasa",
  "capacity": 8,
  "positionX": 200,
  "positionY": 300
}
```
#### PUT /api/events/:eventId/tables/:id
#### DELETE /api/events/:eventId/tables/:id

### 8. Staff Assignments Endpoints

#### GET /api/events/:eventId/staff-assignments
#### POST /api/events/:eventId/staff-assignments
```json
{
  "staffMemberId": 7,
  "assignmentStatus": "ASSIGNED",
  "attendanceStatus": "PENDING",
  "hoursWorked": 0,
  "paymentAmount": 2000.00,
  "paymentStatus": "PENDING",
  "notes": "Hlavní koordinátor"
}
```
#### PUT /api/events/:eventId/staff-assignments/:id
#### DELETE /api/events/:eventId/staff-assignments/:id

### 9. Vouchers Endpoints

#### GET /api/events/:eventId/vouchers
#### POST /api/events/:eventId/vouchers
```json
{
  "voucherId": 10,
  "quantity": 2,
  "validated": false,
  "notes": ""
}
```
#### PUT /api/events/:eventId/vouchers/:id
#### DELETE /api/events/:eventId/vouchers/:id

## 🔄 Auto-kalkulace Guests Count

### Backend logika:
1. **guestsTotal** je vypočítané pole v DB: `GENERATED ALWAYS AS (guests_paid + guests_free) STORED`
2. Když frontend pošle PUT na `/api/events/:id` s `guestsPaid` a `guestsFree`, backend:
   - Uloží tyto hodnoty
   - DB automaticky přepočítá `guestsTotal`
   - Vrátí aktualizovaný objekt s novým `guestsTotal`

### Načítání hostů z rezervací:
**ENDPOINT:** `GET /api/events/:eventId/guests/from-reservations?date=2025-11-12`

Tento endpoint vrátí seznam všech osob (persons) z rezervací, které mají `date = eventDate`:
```json
[
  {
    "reservationId": 15,
    "personIndex": 0,
    "firstName": "z rezervace",
    "lastName": "neznámé v reservation_person",
    "type": "adult",
    "nationality": "CZ",
    "isPaid": true,
    "menuName": "Guláš"
  }
]
```

**Logika:**
- Pokud `reservation.status IN ('PAID', 'CONFIRMED')` → `isPaid = true`
- Jinak → `isPaid = false`

## 📊 Discrepancy Notes

Když uživatel manuálně změní `guestsPaid` nebo `guestsFree`, frontend musí:
1. Načíst skutečný počet z rezervací pomocí `/api/events/:eventId/guests/from-reservations`
2. Spočítat:
   - `reservationPaidCount` = počet osob s `isPaid=true` z rezervací
   - `reservationFreeCount` = počet osob s `isPaid=false` z rezervací
3. Pokud `event.guestsPaid !== reservationPaidCount`:
   - Zobrazit poznámku: **"Počet platících dle rezervací je {reservationPaidCount}"**
4. Pokud `event.guestsFree !== reservationFreeCount`:
   - Zobrazit poznámku: **"Počet zdarma dle rezervací je {reservationFreeCount}"**

## 🔒 Validace

Backend musí validovat:
- ✅ `guestsPaid >= 0`
- ✅ `guestsFree >= 0`
- ✅ `eventDate` nesmí být v minulosti (optional)
- ✅ `spaces` array nesmí být prázdný
- ✅ Foreign keys (staffMemberId, voucherId, atd.) musí existovat

## 📝 Poznámky k implementaci

1. **Transakce:** Vložení/aktualizace eventu + related entities by mělo být v jedné transakci
2. **Cascade delete:** Při smazání eventu se automaticky smažou všechny related entities (ON DELETE CASCADE)
3. **Updated_at:** Automaticky se aktualizuje při každé změně (trigger)
4. **Spaces:** Event může mít více prostor - ukládají se do samostatné tabulky `event_space`

## ✅ Checklist pro backend vývojáře

- [ ] GET /api/events/:id vrací kompletní aggregate (všechny nested entity)
- [ ] PUT /api/events/:id aktualizuje základní údaje (ne nested)
- [ ] Všechny CRUD endpointy pro: guests, menu, beverages, schedule, tables, staff-assignments, vouchers
- [ ] GET /api/events/:eventId/guests/from-reservations?date=YYYY-MM-DD
- [ ] guestsTotal je computed field - neposílat v request, automaticky počítá DB
- [ ] Validace dat (foreign keys, ranges, required fields)
- [ ] Cascade delete při smazání eventu
- [ ] Správné HTTP status codes (200, 201, 404, 400, 500)
- [ ] Error messages v českém jazyce
