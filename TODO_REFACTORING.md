# Frontend Refactoring TODO

## KRITICKY VELKE KOMPONENTY (>300 radku)

### CRITICAL (>1000 radku)
| # | Soubor | Radku | Akce |
|---|--------|-------|------|
| 1 | `client/src/modules/reservations/pages/ReservationEditPage.tsx` | **2362** | Rozdelit na 5-6 sub-komponent + hook |
| 2 | `client/src/modules/events/components/tabs/StaffTab.tsx` | **1011** | Rozdelit na StaffList, StaffDialog, StaffPayment |
| 3 | `client/src/modules/invoices/pages/InvoiceEditPage.tsx` | **945** | Rozdelit na InvoiceForm, InvoiceItems, InvoicePreview |
| 4 | `client/src/modules/events/components/GuestsTab.tsx` | **920** | Rozdelit na GuestGroupSection, AddGuestDialog, BulkActions |
| 5 | `client/src/modules/events/components/BasicInfoTab.tsx` | **728** | Rozdelit na BasicInfoForm, LocationSection, TimingSection |
| 6 | `client/src/modules/events/components/FloorPlanManager.tsx` | **680** | Rozdelit na FloorPlanCanvas, TableEditor, FloorPlanToolbar |
| 7 | `client/src/modules/events/components/dashboard/guest-command/SpaceView.tsx` | **660** | Rozdelit na mensi sub-komponenty |
| 8 | `client/src/modules/admin/pages/PricingPage.tsx` | **637** | Rozdelit na DefaultPricingForm, DateOverrideForm |
| 9 | `client/src/modules/events/components/dashboard/guest-command/ReservationView.tsx` | **580** | Rozdelit na mensi sub-komponenty |

### HIGH (500-700 radku)
| # | Soubor | Radku | Akce |
|---|--------|-------|------|
| 10 | `client/src/shared/components/AppSidebar.tsx` | **554** | Extrahovat nav-sekce do sub-komponent |
| 11 | `client/src/modules/events/components/tabs/FinanceTab.tsx` | **551** | Rozdelit na InvoiceSection, PaymentSection |
| 12 | `client/src/modules/reservations/components/ReservationTable.tsx` | **557** | Extrahovat ReservationRow, TableFilters |
| 13 | `client/src/modules/admin/pages/SettingsPage.tsx` | **558** | Rozdelit po tabech |
| 14 | `client/src/modules/admin/pages/RolesPage.tsx` | **542** | Rozdelit na RoleForm, PermissionMatrix |
| 15 | `client/src/modules/events/pages/EventCreatePage.tsx` | **535** | Extrahovat form sekce |
| 16 | `client/src/modules/reservations/pages/ReservationsPage.tsx` | **521** | Extrahovat CreateReservationDialog |
| 17 | `client/src/modules/admin/pages/DisabledDatesPage.tsx` | **519** | Extrahovat HolidayHelper, DateForm |
| 18 | `client/src/modules/reservations/components/ReservationDetailDialog.tsx` | **504** | Extrahovat InvoiceActions, DetailTabs |
| 19 | `client/src/modules/staff/pages/StaffingFormulasPage.tsx` | **495** | Extrahovat FormulaTable (aktivni/neaktivni jsou ~95% stejne) |
| 20 | `client/src/modules/events/pages/EventsPage.tsx` | **488** | Extrahovat EventFilters, EventCard |
| 21 | `client/src/modules/admin/pages/UsersPage.tsx` | **474** | Extrahovat UserForm, UserTable |

### MEDIUM (300-500 radku)
| # | Soubor | Radku | Akce |
|---|--------|-------|------|
| 22 | `client/src/modules/events/components/dashboard/ExpenseTrackerCard.tsx` | **457** | Rozdelit |
| 23 | `client/src/modules/contacts/components/ContactTable.tsx` | **444** | Extrahovat ContactRow |
| 24 | `client/src/modules/events/components/dashboard/guests/MoveGuestsDialog.tsx` | **421** | Rozdelit |
| 25 | `client/src/modules/staff/pages/StaffAttendancePage.tsx` | **421** | Extrahovat AttendanceTable, AttendanceStats |
| 26 | `client/src/modules/events/components/dashboard/QuickAddGuestDialog.tsx` | **380** | Zjednodusit |
| 27 | `client/src/modules/events/components/dashboard/SpaceGuestsCard.tsx` | **373** | Rozdelit |
| 28 | `client/src/modules/events/components/dashboard/GroupCheckInCard.tsx` | **362** | Rozdelit |
| 29 | `client/src/modules/events/components/tabs/BeveragesTab.tsx` | **358** | Pouzit genericke CRUD komponenty |
| 30 | `client/src/modules/reservations/components/InvoiceCreateDialog.tsx` | **353** | Rozdelit na InvoiceItemsEditor, InvoicePreview |
| 31 | `client/src/modules/events/components/tabs/TablesTab.tsx` | **350** | Pouzit genericke CRUD komponenty |
| 32 | `client/src/modules/events/components/dashboard/guests/MarkPresentDialog.tsx` | **349** | Zjednodusit |
| 33 | `client/src/modules/events/components/dashboard/ReservationCheckInCard.tsx` | **336** | Rozdelit |
| 34 | `client/src/modules/events/components/tabs/VouchersTab.tsx` | **332** | Pouzit genericke CRUD komponenty |
| 35 | `client/src/modules/events/components/tabs/ScheduleTab.tsx` | **326** | Pouzit genericke CRUD komponenty |
| 36 | `client/src/modules/events/components/dashboard/staff/StaffDialog.tsx` | **316** | Rozdelit |
| 37 | `client/src/modules/staff/components/StaffFormDialog.tsx` | **312** | Rozdelit form sekce |
| 38 | `client/src/modules/events/components/SeatingWizard.tsx` | **310** | Rozdelit |
| 39 | `client/src/modules/events/components/dashboard/guests/SpaceSection.tsx` | **308** | Rozdelit |

---

## DUPLIKOVANE FUNKCE - SJEDNOTIT

### 1. `formatCurrency` - 6 ruznych implementaci!
| Soubor | Implementace |
|--------|-------------|
| `events/components/tabs/FinanceTab.tsx:34` | `Intl.NumberFormat("cs-CZ", {style:"currency"})` |
| `events/components/dashboard/ExpenseTrackerCard.tsx:68` | `toLocaleString("cs-CZ", {minimumFractionDigits:2})` |
| `events/components/dashboard/SettlementCard.tsx:12` | `amount.toFixed(2) + " Kc"` |
| `events/components/dashboard/guest-command/ReservationView.tsx:359` | `amount.toFixed(2)` |
| `events/components/dashboard/GuestStatsCard.tsx:143` | `amount.toFixed(2)` |
| `reservations/components/ReservationDetailDialog.tsx:164` | `toLocaleString("cs-CZ")` |

**Reseni:** Vytvorit `client/src/shared/lib/formatting.ts`:
```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency", currency: "CZK", maximumFractionDigits: 0,
  }).format(amount);
}
```

### 2. Status badge funkce - 12+ ruznych implementaci
| Soubor | Funkce |
|--------|--------|
| `events/pages/EventsPage.tsx:150` | `getStatusBadgeVariant` |
| `events/components/tabs/FinanceTab.tsx:43-78` | `getPaymentStatusBadge`, `getInvoiceStatusBadge`, `getInvoiceTypeBadge` |
| `events/components/dashboard/ReservationCheckInCard.tsx` | `getPaymentBadge` |
| `events/components/dashboard/DashboardHeader.tsx` | status badge logika |
| `events/components/dashboard/GuestStatsCard.tsx` | status badge logika |
| `stock/pages/StockMovementsPage.tsx:117` | `getMovementBadgeVariant` |
| `staff/pages/StaffAttendancePage.tsx` | attendance badge logika |
| `partners/pages/VouchersPage.tsx` | voucher badge logika |
| `dashboard/pages/DashboardPage.tsx` | dashboard badge logika |
| `payments/pages/PaymentsPage.tsx` | payment badge logika |
| `cashbox/pages/CommissionLogsPage.tsx` | commission badge logika |

**Reseni:** Vytvorit `client/src/shared/lib/badges.ts` s centralizovanymi mapovacimi funkcemi.

### 3. NATIONALITY_COLORS - 3 ruzne verze
| Soubor | Stav |
|--------|------|
| `shared/lib/constants.ts:68` | Zakladni verze |
| `events/components/dashboard/GroupCheckInCard.tsx:47` | Neuplna verze |
| `events/components/waiter/NationalityBadge.tsx:5` | Nejuplnejsi verze s text+bg+name |

**Reseni:** Sjednotit do `shared/lib/constants.ts`, pouzit nejuplnejsi verzi.

### 4. Toggle/expand pattern - 4+ kopie
| Soubor | Funkce |
|--------|--------|
| `events/components/tabs/StaffTab.tsx:105` | `toggleCategory` |
| `events/components/GuestsTab.tsx:152` | `toggleSection` |
| `events/components/dashboard/ExpenseTrackerCard.tsx:58` | `toggleCategory` |
| `events/components/dashboard/StaffPlanningCard.tsx` | toggle pattern |

**Reseni:** Vytvorit hook `useToggleSet()` v `shared/hooks/`.

### 5. Debounce pattern - 2 kopie v ReservationEditPage
| Radek | Ucel | Delay |
|-------|------|-------|
| `ReservationEditPage.tsx:324` | Company search | 300ms |
| `ReservationEditPage.tsx:347` | Address search | 400ms |

**Reseni:** Vytvorit `useDebounce` hook.

### 6. Person type "free" check - 3 kopie
| Soubor | Pattern |
|--------|---------|
| `ReservationEditPage.tsx:520` | `newType === "driver" \|\| newType === "guide" \|\| newType === "infant"` |
| `reservations/components/form/PersonsTab.tsx:66` | stejna logika |
| `reservations/components/form/PersonsTab.tsx:110` | stejna logika |

**Reseni:** Vytvorit konstantu `FREE_PERSON_TYPES` a helper `isFreePerson(type)`.

---

## DUPLIKOVANE MUTATION PATTERNY

### 7. CRUD mutation pattern - 35+ vyskytu
Kazda stranka s formularem definuje identicky:
```typescript
const createMutation = useMutation({
  mutationFn: (data) => api.post(`/api/...`, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [...] });
    toast({ title: "Uspech", description: "..." });
    setDialogOpen(false);
    form.reset();
  },
  onError: (error) => {
    toast({ title: "Chyba", description: error.message, variant: "destructive" });
  },
});
```

**Soubory:** StaffMembersPage, StaffAttendancePage, StaffingFormulasPage, BeveragesTab, TablesTab, VouchersTab, ScheduleTab, MenuTab, StockItemsPage, StockMovementsPage, PartnersPage, VouchersPage, CashboxPage, PricingPage, UsersPage, RolesPage, DisabledDatesPage + dalsi

**Reseni:** Vytvorit `useCrudMutations<T>(endpoint, queryKeys)` hook.

### 8. Invoice mutations - 2x identicka definice
| Soubor | Mutace |
|--------|--------|
| `ReservationDetailDialog.tsx:50-131` | createDeposit, createFinal, markPaid, markInvoicePaid |
| `ReservationEditPage.tsx:239-299` | IDENTICKY createDeposit, createFinal, markPaid, markInvoicePaid |

**Reseni:** Vytvorit `useInvoiceMutations(reservationId)` hook.

### 9. Query invalidation pattern - 72+ vyskytu
Stejna sekvence invalidaci se opakuje vsude:
```typescript
queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
queryClient.invalidateQueries({ queryKey: ["/api/invoices/reservation", id] });
queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
queryClient.invalidateQueries({ queryKey: ["/api/reservations", id, "payment-summary"] });
```

**Reseni:** Vytvorit helper funkce `invalidateReservationQueries(id)`, `invalidateEventQueries(id)`, atd.

### 10. Dialog state management - 35+ vyskytu
Kazdy formular ma:
```typescript
const [isCreateOpen, setIsCreateOpen] = useState(false);
const [isEditOpen, setIsEditOpen] = useState(false);
const [editingItem, setEditingItem] = useState<T | null>(null);
```

**Reseni:** Vytvorit `useFormDialog<T>()` hook.

---

## TYPY - PRESUNOUT DO VLASTNICH SOUBORU

### 11. Typy v ReservationEditPage.tsx
| Typ | Radek | Presunout do |
|-----|-------|-------------|
| `PersonEntry` | 58-63 | `modules/reservations/types.ts` |
| `TransferEntry` | 65-68 | `modules/reservations/types.ts` |
| `ReservationEntry` | 70-76 | `modules/reservations/types.ts` |
| `SharedContact` | 78-91 | `modules/reservations/types.ts` |

### 12. Typy v InvoiceCreateDialog.tsx
| Typ | Radek | Presunout do |
|-----|-------|-------------|
| `InvoiceItem` | 28-31 | `modules/invoices/types.ts` |
| `InvoicePreview` | 35-44 | `modules/invoices/types.ts` |

### 13. Typy v InvoiceEditPage.tsx
| Typ | Radek | Presunout do |
|-----|-------|-------------|
| `InvoiceFormData` | 56-78 | `modules/invoices/types.ts` |

### 14. Typy v events komponentach
| Typ | Soubor | Presunout do |
|-----|--------|-------------|
| `DashboardData` | StaffTab.tsx:62 | `modules/events/types/index.ts` |
| `GuestGroup` | GuestsTab.tsx:52 | `modules/events/types/index.ts` |
| `ReservationInfo` | MenuTab.tsx:21 | `modules/events/types/index.ts` |
| `MenuGroup` | MenuTab.tsx:29 | `modules/events/types/index.ts` |
| Props interfaces | Kazdy tab | `modules/events/types/index.ts` |

### 15. Typy v staff modulu
| Typ | Soubor | Presunout do |
|-----|--------|-------------|
| `Option` | StaffFormDialog.tsx:31 | Pouzit `SelectOption` ze staffRoles.ts |
| `StaffForm` | StaffMembersPage.tsx:32 | `modules/staff/types.ts` |
| `AttendanceForm` | StaffAttendancePage.tsx:62 | `modules/staff/types.ts` |
| `StaffingFormulaForm` | StaffingFormulasPage.tsx:39 | `modules/staff/types.ts` |

### 16. Typy v ReservationTable
| Typ | Radek | Presunout do |
|-----|-------|-------------|
| `SortColumn` | 40 | `modules/reservations/types.ts` |
| `SortDirection` | 41 | `modules/reservations/types.ts` |

---

## KONSTANTY - PRESUNOUT DO VLASTNICH SOUBORU

### 17. Hardcoded status stringy (30+ vyskytu)
Stringy jako `"PAID"`, `"PARTIAL"`, `"UNPAID"`, `"PRESENT"`, `"ABSENT"` jsou vsude primo v kodu.

**Reseni:** Vytvorit `shared/lib/constants.ts` enumy:
```typescript
export const PAYMENT_STATUS = { PAID: "PAID", PARTIAL: "PARTIAL", UNPAID: "UNPAID" } as const;
export const ATTENDANCE_STATUS = { PRESENT: "PRESENT", ABSENT: "ABSENT", UNKNOWN: "UNKNOWN" } as const;
```

### 18. PAGE_SIZE_OPTIONS - 4 kopie
| Soubor |
|--------|
| `payments/pages/PaymentsPage.tsx:22` |
| `invoices/pages/InvoicesPage.tsx:58` |
| `reservations/components/ReservationTable.tsx:28` |
| `contacts/components/ContactTable.tsx:21` |

**Reseni:** Exportovat z `shared/lib/constants.ts`.

### 19. GUEST_TYPE_LABELS duplikace
| Soubor | Nazev |
|--------|-------|
| `shared/types.ts:195` | `PERSON_TYPE_LABELS` |
| `events/components/GuestsTab.tsx:37` | `GUEST_TYPE_LABELS` (jiny format!) |

**Reseni:** Sjednotit do `shared/types.ts`.

### 20. Hardcoded default nationality
| Soubor | Hodnota |
|--------|---------|
| `ReservationEditPage.tsx:97` | `"Ceska republika"` |
| `ReservationsPage.tsx:110` | `"Ceska republika"` |

**Reseni:** Konstanta `DEFAULT_NATIONALITY` v `shared/lib/constants.ts`.

### 21. Hardcoded default ceny
| Soubor | Radek |
|--------|-------|
| `ReservationsPage.tsx:235-241` | `adultPrice \|\| 1250`, `childPrice \|\| 800` |
| `ReservationEditPage.tsx:532-534` | stejna logika |
| `ReservationEditPage.tsx:592-594` | stejna logika |

**Reseni:** Konstanta `DEFAULT_PRICES` v `shared/lib/constants.ts`.

### 22. Toast zpravy "Uspech"/"Chyba" - 50+ vyskytu
Vsude hardcoded ceske stringy pro toast notifikace.

**Reseni:** Centralizovat do `shared/lib/messages.ts` nebo `shared/lib/toast-helpers.ts`:
```typescript
export const successToast = (description: string) => toast({ title: "Uspech", description });
export const errorToast = (error: Error) => toast({ title: "Chyba", description: error.message, variant: "destructive" });
```

### 23. Locale string "cs-CZ" - 15+ vyskytu
Hardcoded vsude misto centralizovane konstanty.

**Reseni:** `export const LOCALE = "cs-CZ"` v `shared/lib/constants.ts`.

### 24. Hardcoded Czech holiday dates
| Soubor | Radek |
|--------|-------|
| `admin/pages/DisabledDatesPage.tsx:20-50` | Easter dates, state holidays hardcoded |

**Reseni:** Presunout do `shared/lib/holidays.ts`.

### 25. Default form values - duplikovane
| Soubor | Issue |
|--------|-------|
| `StaffingFormulasPage.tsx:54-58` | Default values v handleCreate |
| `StaffingFormulasPage.tsx:114-119` | Stejne default values v form init |

**Reseni:** Konstanty `DEFAULT_FORMULA_VALUES` v modulu.

---

## ZOD SCHEMY - PRESUNOUT DO VLASTNICH SOUBORU

### 26. Zod schemy definovane uvnitr komponent (35+ souboru)
| Modul | Soubory |
|-------|---------|
| Reservations | `ReservationsPage.tsx:27-66`, `ReservationEditPage.tsx` |
| Events | `StaffTab.tsx:46-53`, `BasicInfoTab.tsx:29-71`, `GuestsTab.tsx:23-33`, vsechny taby |
| Staff | `StaffMembersPage.tsx:17-30`, `StaffAttendancePage.tsx:55-62`, `StaffingFormulasPage.tsx:23-39` |
| Admin | `PricingPage.tsx:21-38`, `UsersPage.tsx`, `RolesPage.tsx` |
| Stock | `StockItemsPage.tsx:54-64`, `StockMovementsPage.tsx:56-63` |
| Cashbox | `CashboxPage.tsx:56-62` |
| Partners | `VouchersPage.tsx:56-66` |

**Reseni:** Kazdemu modulu vytvorit `schemas.ts`:
- `modules/reservations/schemas.ts`
- `modules/events/schemas.ts`
- `modules/staff/schemas.ts`
- `modules/admin/schemas.ts`
- atd.

---

## PAGINATION A FILTROVANI - SJEDNOTIT

### 27. Pagination logika - 4+ kopie
| Soubor |
|--------|
| `payments/pages/PaymentsPage.tsx:107-112` |
| `invoices/pages/InvoicesPage.tsx` |
| `reservations/components/ReservationTable.tsx:139-157` |
| `contacts/components/ContactTable.tsx` |

**Reseni:** Vytvorit `usePagination(data, pageSize)` hook v `shared/hooks/`.

### 28. Filter logika - 10+ kopii
Vsechny list stranky maji identicky `useMemo` filter pattern.

**Reseni:** Vytvorit `useFilteredData(data, filters)` hook.

---

## CHYBEJICI SDILENE HOOKS

### 29. Nove hooks k vytvoreni
| Hook | Ucel | Nahrazuje |
|------|------|-----------|
| `useFormDialog<T>()` | Dialog state + form reset | 35+ vyskytu useState patternu |
| `useCrudMutations<T>(endpoint)` | Create/Update/Delete mutace | 35+ vyskytu mutation patternu |
| `useInvoiceMutations(reservationId)` | Invoice-specificke mutace | 2 identicke kopie |
| `useToggleSet()` | Expand/collapse state | 4+ vyskytu toggle patternu |
| `usePagination(data, pageSize)` | Pagination logika | 4+ vyskytu |
| `useFilteredData(data, filters)` | Filter logika | 10+ vyskytu |
| `useDebounce(value, delay)` | Debounced hodnoty | 2 kopie v ReservationEditPage |

---

## CHYBEJICI SDILENE UTILITY SOUBORY

### 30. Nove soubory k vytvoreni
| Soubor | Obsah |
|--------|-------|
| `shared/lib/formatting.ts` | `formatCurrency`, `formatDate`, `formatTime` |
| `shared/lib/badges.ts` | Centralizovane badge variant funkce |
| `shared/lib/toast-helpers.ts` | `successToast`, `errorToast` wrappery |
| `shared/lib/query-helpers.ts` | `invalidateReservationQueries`, `invalidateEventQueries` |
| `shared/lib/holidays.ts` | Czech holidays, Easter date calculation |
| `shared/hooks/useFormDialog.ts` | Generic form dialog hook |
| `shared/hooks/useCrudMutations.ts` | Generic CRUD mutation hook |
| `shared/hooks/useToggleSet.ts` | Toggle set hook |
| `shared/hooks/usePagination.ts` | Pagination hook |
| `shared/hooks/useDebounce.ts` | Debounce hook |

---

## TYPE-SAFETY PROBLEMY

### 31. `as any` casts
| Soubor | Radek | Issue |
|--------|-------|-------|
| `staff/pages/StaffMembersPage.tsx:160` | `(member as any)` | Chybejici typy |
| `staff/pages/StaffMembersPage.tsx:214` | `(createForm as any)` | Chybejici typy |

---

## PRIORITNI PORADEK REFACTORINGU

### Faze 1 - Sdilene utility (nejvyssi dopad, nejnizsi riziko)
1. [ ] Vytvorit `shared/lib/formatting.ts` (formatCurrency, formatDate)
2. [ ] Vytvorit `shared/lib/badges.ts` (centralizovane badge funkce)
3. [ ] Vytvorit `shared/lib/toast-helpers.ts`
4. [ ] Sjednotit NATIONALITY_COLORS do `shared/lib/constants.ts`
5. [ ] Pridat konstanty PAGE_SIZE_OPTIONS, DEFAULT_NATIONALITY, DEFAULT_PRICES, LOCALE
6. [ ] Sjednotit GUEST_TYPE_LABELS s PERSON_TYPE_LABELS

### Faze 2 - Sdilene hooks
7. [ ] Vytvorit `useFormDialog` hook
8. [ ] Vytvorit `useCrudMutations` hook
9. [ ] Vytvorit `useInvoiceMutations` hook
10. [ ] Vytvorit `useToggleSet` hook
11. [ ] Vytvorit `usePagination` hook
12. [ ] Vytvorit `useDebounce` hook
13. [ ] Vytvorit `shared/lib/query-helpers.ts`

### Faze 3 - Typy a schemy do vlastnich souboru
14. [ ] Vytvorit `modules/reservations/types.ts`
15. [ ] Vytvorit `modules/reservations/schemas.ts`
16. [ ] Vytvorit `modules/invoices/types.ts`
17. [ ] Vytvorit `modules/events/types/index.ts`
18. [ ] Vytvorit `modules/events/schemas.ts`
19. [ ] Vytvorit `modules/staff/types.ts`
20. [ ] Vytvorit `modules/staff/schemas.ts`
21. [ ] Presunout vsechny inline typy a schemy

### Faze 4 - Rozdeleni CRITICAL komponent (>700 radku)
22. [ ] Rozdelit ReservationEditPage.tsx (2362 -> 5-6 souboru po <300)
23. [ ] Rozdelit StaffTab.tsx (1011 -> 3-4 soubory)
24. [ ] Rozdelit InvoiceEditPage.tsx (945 -> 3 soubory)
25. [ ] Rozdelit GuestsTab.tsx (920 -> 4 soubory)
26. [ ] Rozdelit BasicInfoTab.tsx (728 -> 3 soubory)
27. [ ] Rozdelit FloorPlanManager.tsx (680 -> 3 soubory)

### Faze 5 - Rozdeleni HIGH komponent (500-700 radku)
28. [ ] Rozdelit AppSidebar.tsx
29. [ ] Rozdelit FinanceTab.tsx
30. [ ] Rozdelit ReservationTable.tsx
31. [ ] Rozdelit SettingsPage.tsx
32. [ ] Rozdelit RolesPage.tsx
33. [ ] Rozdelit EventCreatePage.tsx
34. [ ] Rozdelit ReservationsPage.tsx
35. [ ] Rozdelit DisabledDatesPage.tsx

### Faze 6 - Rozdeleni MEDIUM komponent (300-500 radku)
36. [ ] Refaktorovat vsech 17 komponent mezi 300-500 radky

### Faze 7 - Aplikace sdilenych hooku
37. [ ] Nahradit vsechny CRUD mutation patterny `useCrudMutations`
38. [ ] Nahradit dialog state patterny `useFormDialog`
39. [ ] Nahradit toggle patterny `useToggleSet`
40. [ ] Nahradit pagination patterny `usePagination`

---

## STATISTIKY

- **Komponent nad 300 radku:** 39
- **Duplikovanych formatCurrency:** 6 ruznych implementaci
- **Duplikovanych badge funkci:** 12+
- **Duplikovanych mutation patternu:** 35+
- **Inline type definici:** 25+
- **Inline Zod schemat:** 35+
- **Hardcoded konstant:** 50+
- **Celkem TODO polozek:** 40 hlavnich tasku
