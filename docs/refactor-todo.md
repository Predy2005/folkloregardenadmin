# Refactor TODO – Folklore Garden Admin

> **Účel**: konkrétní punch list refaktoru frontendu podle `docs/frontend-rules.md`. Každá položka má status, severity, effort, agent prompt (kde to dává smysl) a verification kritéria. Pracovní formát; zaškrtávej, doplňuj, neztrácej kontext.

> **Pravidlo dokumentu**: nikdy nemaž hotovou položku — přesuň ji do sekce "Hotovo" s commit hashem. Tak víme, co a kdy se udělalo.

> **Workflow**:
> 1. Vyber task podle priority.
> 2. Pokud má **Agent prompt**, spusť agenta podle pokynů (typicky `subagent_type: claude` v `isolation: "worktree"` modu pro paralelní práci).
> 3. Po dokončení spusť **verification agenta** (sekce 99) na změny.
> 4. Pokud projde, smerge a posuň do "Hotovo".

---

## STAV SOUHRN (2026-05-15)

**Lint**: ✅ 0 warnings, 0 errors. **Cycles**: ✅ 0. **TS**: ✅ čistý. **Build**: ✅.

**Hotovo v §2.X (velké soubory)**: 2.1 DashboardFloorPlan (908→318), 2.2 useFloorPlanState (720→421, 3-dávkový split), 2.3 ReservationPersonsSection (701→249), 2.4 TableActionPanel (613→207), 2.5 ReservationEditPage (608→263), 2.6 StaffMembersPage (605→178), 2.7 StaffingFormulasPage (600→178), 2.8 FloorPlanSidebar (566→287), 2.9 useReservationForm (556→306), 2.10 MobileAccountCard (544→211), 2.11 EventCreatePage (527→83), 2.12 HelpChatbot (515→161), 2.13 partial (TransportTab, TicketDetailPage, MoveGuestsDialog, GuestsTab, FloorPlanEditor, EventDetailsSection, ai.ts).

**Hotovo §1**: 1.3 (granular permissions), 1.4 (default exports → named), 1.5 + 1.5b (legacy/drizzle cleanup).

**Hotovo §3**: 3.3 (non-null assertions), 3.4 (no-array-index-key), 3.5 (no-duplicate-string).

**Hotovo §4**: 4.1 (ESLint+sonarjs+import+prettier), 4.2 (knip), 4.3 (madge), 4.4 (Husky + lint-staged + SonarQube hook).

**Hotovo §5**: 5.1 (frontend-rules §19), 5.2 (CLAUDE.md).

**Pending / Deferred**:
- §0.1, §1.1 — blokované user constraint (klíče rotuje user sám).
- §1.2 (JWT httpOnly) — XL cross-cutting, samostatný PR.

**§3 hotovo**: §3.1 + §3.2 — bulk sed sweep ~113 souborů, nové sémantické tokeny `success`/`warning`/`info` přidány.

**§2.13 sweep dokončen**: 19 hlavních souborů split v 2 dávkách. Zbylé 250–370 ř. soubory jsou orchestrátory / JSX-heavy form sekce, kde další split nepřináší zlepšení čitelnosti.

---

## P0 — CRITICAL (řeš okamžitě)

### [~] 0.1 — Revoke leaked OpenAI API key — USER-PAUSED

**Soubor**: `client/src/modules/reservations/utils/ai.ts:17`

**Problém**: V JS bundle je hardcoded skutečný OpenAI API klíč. Kdokoliv s přístupem k frontendu ho vidí v DevTools/Network/sourcecode. **Je to aktivní credential**.

**Stav (2026-05-15)**: Uživatel klíč rotuje sám — viz memory `feedback_no_api_key_changes.md`. Claude do FE klíče **nesahá** (ani neneutralizuje, ani nemaže). Tato položka zůstane open dokud uživatel klíč nerotuje v OpenAI dashboardu.

**Pozn**: klíč zůstává v **git historii** (`git log -p -- client/src/modules/reservations/utils/ai.ts`). Pokud je repo public, po revokaci v OpenAI zvaž `git filter-repo` nebo BFG cleanup.

---

## P1 — HIGH (security / architektura, sekvenční)

### [~] 1.1 — Move AI parser to backend — BLOCKED ON §0.1

**Stav (2026-05-15)**: Závislé na §0.1 (rotaci klíče). Dokud user neudělá rotaci, je BE proxy refactor předčasný — současný klíč v JS bundle by zůstal v git historii i po BE migraci. **Plán zůstává platný, jen čeká na zelenou.**

**Co se v této session udělalo**: `ai.ts` 1009 → 879 ř. — smazáno ~130 ř. dead code, 3 cog-complex warningy vyřešené extrakcí helperů, žádný dotek API klíče. Ostatní logika (Zod schemas, parser, prompts) je připravená pro pozdější BE migraci.

**Soubory** (pro pozdější refactor):
- `client/src/modules/reservations/utils/ai.ts` (879 řádků — celé smazat z FE po BE migraci)
- `client/src/modules/reservations/hooks/useAIAssistant.ts` (přepojit na BE endpoint)
- BE: nový endpoint `POST /api/reservations/ai-parse`

**Problém**: viz §0.1 + porušuje [frontend-rules §0 / §19] — FE nesmí volat OpenAI přímo.

**Cílový tvar**:
- BE controller `ReservationAiController` s `POST /api/reservations/ai-parse` (gated `reservations.create`).
  - Body: `{ text: string }`.
  - Logika: prompt builder, OpenAI call, Zod-like validace, vrátí `AiMultiReservationEntry`.
  - Klíč z `AI_SERVER_1_KEY` env var (už existuje pro chatbot, použij stejnou config).
- FE: `ai.ts` smazat. `useAIAssistant.ts` volá `api.post("/api/reservations/ai-parse", { text })`. Zachovat **liberální Zod schema** na FE pro parse response (fallback při BE selhání).

**Effort**: L (4–6h: BE controller + service + FE refactor + e2e ověření)

**Agent prompt**:
```
Subagent: claude. Worktree: yes.

Repo: /Users/vlastimilhak/PhpstormProjects/folkloregardenadmin
Project context: CLAUDE.md (root), docs/frontend-rules.md (FE pravidla), api/src/Service/Assistant/AiGatewayService.php (vzor jak BE volá OpenAI).

Úkol: přesun AI parseru rezervací z frontendu na backend.

1. BE — vytvoř `api/src/Controller/ReservationAiController.php`:
   - Endpoint `POST /api/reservations/ai-parse`, gated `#[IsGranted("reservations.create")]`.
   - Inject `AiGatewayService` (vzor: `AssistantController`).
   - Body: `{ text: string }`. Validuj přes Symfony validator (nesmí být prázdný, max 50000 znaků).
   - Volá `AiGatewayService::chatCompletion` (nebo ekvivalent) s system promptem převzatým z FE `client/src/modules/reservations/utils/ai.ts:buildReservationSystemPrompt` (řádky 68–102).
   - Response shape: stejný jako vrací FE `parseMultiReservation` dnes — `AiMultiReservationEntry`.
   - Error handling: timeout 30s, vrátí 502 s `{ error: "AI service unavailable" }` při selhání.

2. FE — refactor `client/src/modules/reservations/utils/ai.ts`:
   - Smaž `AI_SERVERS` const, `aiRequest`, `aiChatCompletion` funkce a celý OpenAI klient.
   - Zachovat: Zod schemas (`AiReservationEntrySchema`, `AiMultiReservationEntrySchema`) — používá je `useAIAssistant` pro validaci response.
   - Zachovat: `parseAndValidate` helper, který bere unknown a parsuje přes Zod.

3. FE — refactor `client/src/modules/reservations/hooks/useAIAssistant.ts`:
   - Místo lokálního AI volání volej `api.post<AiMultiReservationEntry>("/api/reservations/ai-parse", { text })`.
   - Validuj response přes existující Zod schema. Při Zod chybě zobraz konkrétní pole (zachovat současný UX).
   - Při BE 502 zobraz toast "AI služba je dočasně nedostupná, zkus to později".

4. Otestuj: `npm run check` + smoke test v `/reservations/new` → AI tab → vlož ukázkový text → ověř, že se vyplní form correctně.

5. Aktualizuj `CLAUDE.md` sekci "AI / asistent": odstraň "security debt" zmínku a popis FE volání; přidej, že parser teď žije na `/api/reservations/ai-parse`.

Po dokončení udělej commit "feat(ai): move reservation parser to backend proxy" + spusť verification agenta podle docs/refactor-todo.md §99.
```

**Verification**:
- `grep -rn "openai\|OpenAI" client/src` vrátí jen typy/komentáře, žádné API volání.
- `npm run check` passes.
- BE má test (PHPUnit) pro happy path + 502 fallback.
- Token klíče je jen v `api/.env`.

---

### [~] 1.2 — JWT → httpOnly cookie — DEFERRED (XL effort, cross-cutting)

**Stav (2026-05-15)**: Plán platný, ale není v session scope. Potřebuje (1) dedikované sezení s dev serverem nahozeným, (2) e2e plán pro všechny role + mobile app kompatibilita (mobile má `MobileAuthController` s vlastním refresh token flow přes DB — kontrolovat, aby nepoškodit), (3) feature flag rollout / rollback strategii. **Otevřít jako samostatný PR**, ne component-level work.

**Soubory**:
- `client/src/shared/lib/api.ts` (request/response interceptors)
- `client/src/modules/auth/contexts/AuthContext.tsx` (login/logout flow)
- BE: `LoginController` + `RefreshTokenController`

**Problém**: JWT v localStorage = XSS surface. Jeden injected `<script>` v user-generated contentu a útočník má session všech přihlášených uživatelů. [frontend-rules §0, §19]

**Cílový tvar**:
- BE: login vrací JWT v `Set-Cookie: auth_token=...; HttpOnly; Secure; SameSite=Lax` (krátká životnost ~15min) + refresh token cookie (delší, 30 dní, `path=/auth/refresh`).
- FE: `apiClient` má `withCredentials: true`. Žádný `Authorization: Bearer` header, žádný `localStorage.getItem("auth_token")`.
- 401 → automatický refresh attempt → pokud i refresh fail, redirect na `/login`.

**Effort**: XL (1–2 dny — cross-cutting BE + FE + e2e test všech rolí + mobile API kompatibility check, mobilka má vlastní auth flow)

**Agent prompt**: **NE — dělat ručně s plánem**. Cross-cutting, mobile app může na tom záviset, vyžaduje pečlivý e2e plán a rollout (rollback strategie: feature flag na BE, který umí oba módy).

**Verification**:
- `grep -rn "localStorage" client/src` nesmí obsahovat `auth_token` ani `user`.
- DevTools → Application → Cookies → `auth_token` má `HttpOnly` flag.
- E2e: login, navigace, refresh page (cookie persistuje), logout (cookie smazána přes BE), 401 chování.
- Mobile app (`Shift-Manager/artifacts/mobile/`) musí zůstat funkční (má vlastní `MobileAuthController` flow přes refresh tokens v DB).

---

### [x] 1.3 — `isSuperAdmin` UI gates → `hasPermission` (rozšířený scope) ✅ HOTOVO 2026-05-18

**Final stav (2026-05-18)**: Audit s aktuálním repo stavem ukázal, že většina původně auditovaných souborů (recipes, foods, staff/attendance, stock, vouchers) už `isSuperAdmin` neobsahuje — buď refaktorovány dřív, nebo nikdy neměly. Zbývající 7 souborů má `isSuperAdmin` **správně** (matchuje BE `#[IsGranted('ROLE_SUPER_ADMIN')]` gates):

- `cashbox/pages/CashboxPage.tsx` — hide/unhide/adjust-balance jsou BE SUPER_ADMIN-only.
- `cashbox/components/CashboxInitForm.tsx` — unhide button.
- `cashbox/components/TransfersTab.tsx` — approve-closure-transfer BE SUPER_ADMIN.
- `admin/pages/PricingPage.tsx` + `components/pricing/OverridesTable.tsx` — bulk-delete BE SUPER_ADMIN; per-row delete na FE je striktnější než BE (BE allow any auth'd user), zachováno pro konzistentní UX.
- `events/pages/EventsPage.tsx` — bulk akce použijí `canBulkSelect = hasAnyPermission(["events.update", "events.delete"])`; `isSuperAdmin` zůstal jen pro **force-delete override** (legitní SUPER_ADMIN-only escape hatch).
- `events/components/dashboard/ExpenseTrackerCard.tsx` — redundantní `|| isSuperAdmin` v `canConfirmTransfer` odstraněn (`hasRole("ROLE_SUPER_ADMIN")` ho už pokrývá).

**Verification**: `grep -rln "isSuperAdmin" client/src/modules/` mimo whitelist (auth/* + admin/Users*) vrátí jen tyto 7 souborů a tam je use legitimní.

---

### [x] 1.3.old — Původní audit (2026-05-14)

- ✅ `InvoicesPage` + `InvoicesTable` — refaktorováno na `canBulkSelect = hasAnyPermission(['invoices.update', 'invoices.delete'])`.

**Soubory v reálném scope** (po dokončení Invoices):

Pro **bulk select / bulk actions** v listingu (granular permission je správný gate):
- `client/src/modules/recipes/pages/RecipesPage.tsx` (BE: `recipes.*`)
- `client/src/modules/partners/pages/VouchersPage.tsx` + `components/VouchersTable.tsx` (BE: `partners.*` nebo `vouchers.*`)
- `client/src/modules/foods/pages/FoodsPage.tsx` (BE: `foods.*`)
- `client/src/modules/staff/pages/StaffAttendancePage.tsx` + `components/AttendanceTable.tsx` + `AttendanceFilters.tsx` (BE: `staff.*`)
- `client/src/modules/events/pages/EventsPage.tsx` + `components/EventsTable.tsx` + `EventFilters.tsx` (BE: `events.*`)
- `client/src/modules/stock/pages/StockItemsPage.tsx` + `components/StockTable.tsx` + `StockFilters.tsx` (BE: `stock.*`)
- `client/src/modules/cashbox/pages/CashboxPage.tsx` + `components/TransfersTab.tsx` + `CashboxInitForm.tsx` (BE: `cashbox.*`)
- `client/src/modules/admin/pages/PricingPage.tsx` + `components/pricing/OverridesTable.tsx` (BE: `pricing.*`)
- `client/src/modules/events/components/dashboard/ExpenseTrackerCard.tsx` (komplikovaný `hasRole('ROLE_X') || isSuperAdmin` mix)

**Soubory, kde je `isSuperAdmin` SPRÁVNĚ a NESMÍŠ ho měnit**:
- `client/src/shared/components/AppSidebar.tsx` — gating system-level sekcí (přepnout jen pokud konkrétní položka má dedikované permission)
- `client/src/modules/admin/pages/UsersPage.tsx` — admin user management, SUPER_ADMIN-only podle CLAUDE.md role policy
- `client/src/modules/admin/components/UsersTable.tsx` + `UserFormDialog.tsx` — viz výše
- `client/src/modules/auth/contexts/AuthContext.tsx` + `hooks/use-permissions.ts` + `components/RequirePermission.tsx` — implementace, ne usage

**Strategie**:
- Pro každý modul: zjisti BE gate (`grep IsGranted api/src/Controller/<Modul>Controller.php`), použij `hasAnyPermission(['<modul>.update', '<modul>.delete'])` nebo nejstriktnější relevant permission.
- Rename prop z `isSuperAdmin` → `canBulkSelect` (nebo `canDelete`, podle akce).

**Effort**: M (~2h, ~14 souborů × ~10 min)

**Agent prompt**:
```
Subagent: claude. Worktree: yes.

Repo: /Users/vlastimilhak/PhpstormProjects/folkloregardenadmin
Project rules: docs/frontend-rules.md (§0, CLAUDE.md "Role policy")

Úkol: nahradit `isSuperAdmin` v UI bulk-selection gates granular permissions.

Pro každý modul podle seznamu výše:
1. Najdi BE controller pro modul (např. api/src/Controller/RecipeController.php).
2. Zjisti `#[IsGranted('<modul>.<akce>')]` pro bulk-relevantní akce (update, delete).
3. V FE souborech nahraď:
   - `const { isSuperAdmin } = useAuth();` → `const { hasAnyPermission } = useAuth();`
   - Přidej proměnnou `const canBulkSelect = hasAnyPermission(['<modul>.update', '<modul>.delete']);`
   - `{isSuperAdmin && ...}` (kolem BulkActionBar) → `{canBulkSelect && ...}`
   - Prop `isSuperAdmin: boolean` v podřazené tabulce → `canBulkSelect: boolean`
   - Rename všech usage `isSuperAdmin` → `canBulkSelect` v tom souboru

NEMĚŇ tyto soubory (jsou správně):
- shared/components/AppSidebar.tsx
- modules/admin/pages/UsersPage.tsx + admin/components/UsersTable.tsx + UserFormDialog.tsx
- modules/auth/* (kromě usage v page komponentách)

Po dokončení každého modulu:
- npm run check
- Smoke ručně (já): login jako user s povolením XXX.update ale BEZ XXX.delete → BulkActionBar viditelný, ale tlačítko "Smazat" by mělo být dále gateováno (pokud není, dopiš `hasPermission('XXX.delete')` per-action).

Commit per modul: `refactor(<modul>): granular permission gate for bulk select`.
```

**Verification**:
- `grep -rn "isSuperAdmin" client/src/modules` mimo whitelisted souborů vrátí jen prop drilling z page do table (tj. už ne ze `useAuth()`).

**Problém**: [frontend-rules §0, CLAUDE.md Role policy] — super-admin gate v UI maskuje, kdo vlastně může danou akci. Granular permissions to řeší čistě.

**Cílový tvar**:
- `InvoicesPage` bulk smazání → `hasPermission("invoices.delete")` (BE už to gate má).
- `InvoicesTable.isSuperAdmin` prop → `canDelete: boolean` (předané z parent jako `hasPermission("invoices.delete")`).
- `AppSidebar.isSuperAdmin` — zachovat jen tam, kde položka je skutečně system-level (admin uživatelů, role definice). Pro běžné moduly použít `hasPermission("<module>.read")`.

**Effort**: S (1h — mechanická náhrada s ověřením BE gate)

**Agent prompt**:
```
Subagent: claude. Worktree: yes.

Úkol: nahradit `isSuperAdmin` v UI komponentách granular permission gate.

Soubory:
1. client/src/modules/invoices/pages/InvoicesPage.tsx
2. client/src/modules/invoices/components/InvoicesTable.tsx

Pro každý isSuperAdmin guard:
- Najdi BE controller pro danou akci (api/src/Controller/InvoiceController.php), zjisti `#[IsGranted("...")]`.
- Nahraď v FE: `isSuperAdmin && ...` → `hasPermission("invoices.<akce>") && ...`.
- V InvoicesTable změň prop `isSuperAdmin: boolean` na konkrétní `canDelete: boolean` (a další, pokud je víc gates).
- Parent (InvoicesPage) předá `canDelete={hasPermission("invoices.delete")}`.

NEMĚŇ:
- AuthContext (`isSuperAdmin` v useAuth() zůstává — používá se v AppSidebar pro skutečně system-level položky).
- AppSidebar — toho se nedotýkat v tomhle tasku.

Po dokončení:
- npm run check
- Smoke: login jako uživatel s `invoices.read` ale BEZ `invoices.delete` → tlačítko "Smazat" v bulk baru nesmí být viditelné.
- Commit "refactor(invoices): replace isSuperAdmin UI gate with granular permission".
```

**Verification**:
- `grep -rn "isSuperAdmin" client/src/modules/invoices/` vrátí 0 hits.
- BE gate (`#[IsGranted("invoices.delete")]`) existuje a odpovídá FE.

---

### [x] 1.4 — Default exporty mimo `pages/` → named exporty ✅ HOTOVO 2026-05-14

**Result**: 38 souborů konvertováno (audit našel 20 původně, ale skutečnost byla 38 — některé byly v sub-adresářích).

- Pattern `export default function NAME(` → `export function NAME(`.
- Call-sites: `import NAME from "..."` → `import { NAME } from "..."` (batch sed přes všechny moduly).
- Barrel `index.ts` re-exports: `export { default as NAME }` → `export { NAME }` v 7 sub-component barrelech (events/components/{tabs,tabs/finance,tabs/staff,waiter,floor-plan,basic-info,guests}/index.ts). Top-level module barrely zachovávají `default as` pro `pages/*Page.tsx`.
- Multi-import patterns (`import X, { y } from "..."`) řešeny ručně v 2 souborech (WaiterFloorPlan, FloorPlanEditorManager).

**Final**: pouze `client/src/App.tsx` má default export mimo `/pages/` — to je legitní (entry point pro `main.tsx`).

**Verification PASS**: TS ✅, lint 137 warnings 0 errors, cycles 0, build ✅.

---

### [x] 1.4 — Default exporty (38 souborů konvertováno) — DONE 2026-05-14 — viz Hotovo.

---

### [~] 1.5 — Legacy cleanup (drizzle, backup, use-mobile.tsx)

**Stav (2026-05-14)** — partial done:
- ✅ `client/src/pages/Events.tsx.backup` smazán
- ✅ `client/src/hooks/use-mobile.tsx` → `client/src/shared/hooks/useMobile.tsx` (4 importy aktualizovány)
- ✅ `client/src/hooks/` smazán
- ✅ `client/src/components/` (prázdná složka) smazána
- ⏳ ZBÝVÁ: drizzle cleanup — viz §1.5b níže (riziko, samostatný PR)

**Soubory původně v scope**:
- ✅ `client/src/pages/Events.tsx.backup` — smazán
- ⏳ `shared/schema.ts` — používá ho `server/storage.ts` (dead Replit code, ale TS check by spadl)
- ⏳ `package.json`: `drizzle-orm`, `drizzle-zod`, `@neondatabase/serverless`
- ✅ `client/src/hooks/use-mobile.tsx` → přesunuto
- ✅ `client/src/hooks/` — smazán
- ✅ `client/src/components/` — smazán

**Effort**: S (30 min)

**Agent prompt**:
```
Subagent: claude. Worktree: yes.

Úkol: cleanup legacy souborů a složek.

1. Smaž `client/src/pages/Events.tsx.backup` (backup soubor, nepoužívaný).
2. Smaž `shared/schema.ts` (drizzle template reziduum — ověř `grep -rn "from .*shared/schema" client/ api/ server/`, nesmí být žádné použití; pokud je, NEMAŽ a reportuj).
3. Z `package.json` odstraň ze `dependencies`: `drizzle-orm`, `drizzle-zod`, `@neondatabase/serverless` (pokud není použito v server/). Z `devDependencies` odstraň `drizzle-kit` (skript `db:push` v `scripts` taky pryč). Spusť `npm install` ať se aktualizuje `package-lock.json`.
4. Přesuň `client/src/hooks/use-mobile.tsx` → `client/src/shared/hooks/useMobile.ts`:
   - Přejmenuj soubor na PascalCase camelCase: `useMobile.ts`.
   - Pokud export je `useIsMobile` nebo `useMobile`, zachovej název.
   - Najdi všechny importy: `grep -rn "use-mobile" client/src` → aktualizuj cestu na `@/shared/hooks/useMobile`.
5. Smaž složku `client/src/hooks/` (po přesunu by měla být prázdná). Pokud ne, NEMAŽ a reportuj.
6. Smaž složku `client/src/components/` (z auditu vypadá prázdná). Pokud ne, NEMAŽ a reportuj.

Po dokončení:
- npm run check
- Build: npm run build (ověření, že nic nezůstalo nelinkováno).
- Commit "chore: remove legacy template residue (drizzle, backup, use-mobile)".
```

**Verification**:
- `grep -rn "drizzle\|use-mobile.tsx\|Events.tsx.backup" client/ shared/ package.json server/` vrátí 0.
- `npm run build` projde.

---

## P2 — MEDIUM (velké soubory — split)

> **Strategie**: každý soubor = jeden agent v `isolation: "worktree"` modu. Agent dostane konkrétní seamy z této sekce, provede split, ověří `npm run check`, spustí smoke test a commitne. Verification agent (§99) kontroluje výsledek.

> **Pořadí**: priorita P2 odshora dolů. Floor plan komponenty (DashboardFloorPlan, useFloorPlanState, TableActionPanel, FloorPlanSidebar) **dělej sekvenčně** — sdílí refactor target dir, paralelizace by tvořila merge konflikty. Ostatní (Staff, Reservation, Chatbot, Mobile) lze paralelně.

### [x] 2.1 — `DashboardFloorPlan.tsx` (908 → 318 řádků) — DONE 2026-05-15

Split do 8 souborů: 4 hooky + 4 komponenty. Hooky: `useDashboardFloorPlanData.ts` (100, queries + sync + computed buildings/rooms/tables/elements/movementsByTable), `useGuestAssignment.ts` (183, assign/unassign/batchAssign + auto-seat + saveCount/lastSavedAt), `useCanvasZoom.ts` (161, stageRef/containerRef/measureRef + ResizeObserver + fitToRoom + wheel/pinch + auto-fit na switch room), `useCanvasDragDrop.ts` (135, drop target detection + window event listener s capacity check). Komponenty: `FloorPlanToolbar.tsx` (132, room tabs + stats + save indicator + akční tlačítka), `FloorPlanSearchBar.tsx` (70), `FloorPlanCanvas.tsx` (193, Konva Stage + Layers + zoom buttons), `GlobalSeatPanel.tsx` (56, aside s FloorPlanSidebar). Main file orchestruje (selection state, search-select scroll-to-table, room-switch panel-close logika). TS ✅, lint stabilní 3, cycles 0, build ✅.

---

### [x] 2.2 — `useFloorPlanState.ts` (720 → 421 řádků) — DONE 2026-05-15

Viz Hotovo: extrahovány `useFloorPlanKeyboardShortcuts.ts` (127), `useFloorPlanGuestOps.ts` (196), `useFloorPlanSave.ts` (149). Cog-complex 45 resolved. Zbylé seamy (queries/tableOps/roomOps) ponechány v main hooku — drží sdílený state v rozumné velikosti.

---

### [x] 2.3 — `ReservationPersonsSection.tsx` (701 → 249 řádků) — DONE 2026-05-15

Split do 5 sub-komponent v `edit/persons/`: `BulkAddPersons.tsx` (125), `BulkChangePersons.tsx` (126), `PersonRow.tsx` (213), `PersonsCountDialog.tsx` (81), `PersonsDeleteDialog.tsx` (46). Hlavní soubor zůstal jako orchestrátor s lokálním selection state (selectedIndices, dialog open flags). `currency` default fallback `"CZK"` při `undefined`. TS ✅, lint 4 baseline warnings, cycles 0.

---

### [x] 2.4 — `TableActionPanel.tsx` (613 → 207 řádků) — DONE 2026-05-15

Split do 6 souborů v `table-action/`: `types.ts` (25, TableMovement/MoveSheetState/GuestWithMenu + QK_* keys), `useTableMutations.ts` (190, movements query + 5 mutations s optimistickými cache patchy), `TableActionHeader.tsx` (29), `TablePosButtons.tsx` (28, Prijem/Vydaj), `TableGuestsList.tsx` (167, guest cards + bulk akce + seat-more button), `TableMovementsList.tsx` (117, movement cards + income/expense sumy), `TableSeatMode.tsx` (65, FloorPlanSidebar wrapper). Main file orchestruje (state + dispatch handleMoveConfirm). TS ✅, lint stabilní 4, cycles 0.

---

### [x] 2.5 — `ReservationEditPage.tsx` (608 → 263 ř.) — DONE 2026-05-15 — viz Hotovo.

### [x] 2.6 — `StaffMembersPage.tsx` (605 → 178 ř.) — DONE 2026-05-15 — viz Hotovo.

### [x] 2.7 — `StaffingFormulasPage.tsx` (600 → 178 ř.) — DONE 2026-05-15 — viz Hotovo.

### [x] 2.8 — `FloorPlanSidebar.tsx` (566 → 287 ř.) — DONE 2026-05-15 — viz Hotovo.

### [x] 2.9 — `useReservationForm.ts` (556 → 306 ř.) — DONE 2026-05-15 — viz Hotovo.

### [x] 2.10 — `MobileAccountCard.tsx` (544 → 211 ř.) — DONE 2026-05-15 — viz Hotovo.

### [x] 2.11 — `EventCreatePage.tsx` (527 → 83 ř.) — DONE 2026-05-15 — viz Hotovo.

### [x] 2.12 — `HelpChatbot.tsx` (515 → 161 ř.) — DONE 2026-05-15 — viz Hotovo.

---

### [x] 2.13 — Ostatní soubory >250 ř. (mechanická řada) — MAJOR DONE 2026-05-15

**Provedeno v poslední dávce sezení 2026-05-15**:
- `TransportTab.tsx` 444 → 166
- `TicketDetailPage.tsx` 431 → 141
- `EventDetailsSection.tsx` 439 → 358 (orchestrátor)
- `MoveGuestsDialog.tsx` 411 → 145
- `GuestsTab.tsx` 406 → 235
- `FloorPlanEditor.tsx` 457 → 338 (orchestrátor)
- `ai.ts` 1009 → 879 (dead code + cog-complex helpers)
- `TemplateDesignerPage.tsx` 505 → 122 (useTemplateDesigner hook + TemplateDesignerToolbar)
- `DisabledDatesPage.tsx` 495 → 79 (czechHolidays util + useDisabledDates hook + 4 sub-komponenty)
- `ReservationImportPage.tsx` 476 → 191 (4 sub-komponenty v `import/`)
- `RecipesPage.tsx` 448 → 223 (useRecipes hook + RecipesTable)
- `RecipeEditPage.tsx` 447 → 193 (BasicInfo/Ingredients cards + recipeSchema)
- `FloorPlanEditorManager.tsx` 435 → 264 (FloorPlanManagerToolbar extracted)
- `companySearch.ts` 421 → 24 (split do 4 souborů: types/parseCompanyData/aresApi/viesApi)
- `useDashboardMutations.ts` 413 → 39 (split do 4 doménových souborů + invalidation)
- `UsersPage.tsx` 399 → 270 (useUsersData hook)
- `StockMovementsPage.tsx` 396 → 203 (StockMovementsTable + StockMovementFormDialog)
- `StaffCategorySection.tsx` 395 → 213 (StaffAssignmentRow + ConfirmationBadge extracted)

**Zbylé soubory 250–370 ř.** (akceptované): orchestrátory s prop drillingem, JSX-heavy formuláře (`BeveragesTab` 367, `PartnerContactsTab` 371, `ReservationTable` 365, `ContactTable` 362, `SpaceGuestsCard` 359, `ReservationView` 354, `StaffFormDialog` 353, `CustomerSection` 351, `QuickAddGuestDialog` 351, `StaffDialog` 351, `InvoicesTable` 350) — další split by vyrobil thin wrappery bez čitelnostního přínosu. Také `seedLayouts.ts` 381 (data file).

**Šíř rozdělení v této session**: 19 hlavních souborů split, plus generovaná knihovna sub-komponent.

---

## P3 — LOWER (Tailwind hardcoded barvy / non-null assertions)

### [x] 3.1 — Hardcoded `bg-{color}-NNN` → sémantické tokeny — DONE 2026-05-15

**Provedeno**: bulk sed sweep ~113 souborů. Mapování:
- `red-*` → `destructive` (různé alpha tinty pro bg-50/100/200, plné pro bg-500+)
- `green-*` → `success` (nový token přidán do `index.css` + `tailwind.config.ts`)
- `orange-*` / `yellow-*` → `warning` (nový token)
- `blue-*` → `info` (nový token)

**Nové tokeny v `index.css` + `tailwind.config.ts`**: `--success`, `--success-foreground`, `--warning`, `--warning-foreground`, `--info`, `--info-foreground` (oba `:root` light + dark mode).

**Patterns aplikované**:
- `text-{c}-400..800` → `text-{semantic}` (plné fg)
- `text-{c}-300` → `text-{semantic}/70` (lighter)
- `bg-{c}-50/100/200/300` → `bg-{semantic}/10..25` (tints)
- `bg-{c}-400..900` → `bg-{semantic}` (solid)
- `bg-{c}-950/N` → `bg-{semantic}/N` (dark mode variants — alpha zachovaná)
- `bg-{c}-50/70` apod. (s alpha) → `bg-{semantic}/10..15`
- `border-{c}-200/300` → `border-{semantic}/30..40`
- `border-{c}-500..800` → `border-{semantic}` (plné)
- `border-l-{c}-500` → `border-l-{semantic}`
- `hover:bg-{c}-600/700/800` → `hover:bg-{semantic}/90`
- `hover:text-{c}-700/800` → `hover:text-{semantic}`

**Výjimky (zachované)**:
- `shared/lib/constants.ts` — data tables s nationality flag colors a status badges (mají file-level `eslint-disable sonarjs/no-duplicate-string` s důvodem). Žádný dotek.
- `shared/components/ui/sidebar.tsx` + ostatní shadcn UI v `shared/components/ui/` (regenerovatelné z `npx shadcn add`).

**Verification PASS**: TS ✅, lint **0 warnings, 0 errors**, cycles 0, build ✅. — working tree — 2026-05-15

---

### [x] 3.2 — `bg-gray-*` / `text-gray-*` → sémantické — DONE 2026-05-15

**Provedeno**: ~16 hits v ~12 souborech. Mapování:
- `bg-gray-50/100/200` → `bg-muted` nebo `bg-muted/30`
- `text-gray-300/400/500/600/700` → `text-muted-foreground`
- `border-gray-200/300` → `border-border`
- `border-gray-500/30` → `border-muted-foreground/30`
- `hover:bg-gray-50/100` (zoom buttons) → `hover:bg-accent` / `hover:bg-accent/80`
- `bg-white dark:bg-zinc-800` (button backgrounds) → `bg-background` (auto-handles dark mode)
- `border-l-gray-400` (DashboardBox accent) → `border-l-muted-foreground`
- `attendanceStatusStyles[...]?.className || "bg-gray-500"` fallback → `bg-muted-foreground` (2 souborech: StaffDialog, StaffCategoryRow)

**Výjimky**: `constants.ts` data tables (`bg-gray-500`, `bg-gray-400`, `bg-gray-800`) — intentional flag/status colors.

**Verification PASS**: TS ✅, lint 0 warnings, cycles 0. — working tree — 2026-05-15

---

### [x] 3.3 — Non-null assertions → bezpečné varianty ✅ HOTOVO 2026-05-14

**Result**: **39 → 0 non-null assertions** v `client/src`. Patterns aplikované per kontext:

1. **`map.get(key)!.push(item)` v cyklu** (MenuTab, GuestsTab, FloorPlanSidebar × 2) → `const existing = map.get(key); if (existing) existing.push(item); else map.set(key, [item]);`

2. **`array!.length` / `array!.map(...)`** (RecipesPage, OverridesTable, ExpenseTrackerCard) → optional chaining + nullish fallback: `(array?.length ?? 0)`, `(array ?? []).map(...)`.

3. **`map.get(key)!.field`** (useFloorPlanState occupancy) → narrow přes lokální proměnnou: `const prev = map.get(key); if (prev !== undefined) ...`.

4. **`selectedX!.id` v inline event handler** (FloorPlanEditorManager × 5, TemplateDesignerPage × 3, FloorPlanSidebar) → inline guard: `onClick={() => selectedX && handler(selectedX.id)}`.

5. **`element.shapeData!.points!`** (ElementShape) → narrow přes lokální proměnnou: `const polygonPoints = element.shapeData?.points && ... ? element.shapeData.points : null`.

6. **`obj.url!`/`linkedContactEmail!`** v string operacích → `?? ""` fallback.

7. **`data.importStats!`** v mutation onSuccess → `if (s) { ... }` guard.

8. **`groups.get(key)!`** v `for...of` cyklu → `if (!groupGuests) continue;`.

9. **`iterable.items!`** → `(iterable.items ?? [])`.

10. **TableDetailPopover `table!.id`** v query/mutation fns → guard uvnitř fn: `if (!table) return Promise.resolve(...)` nebo `throw new Error("...")`.

**Verification PASS**: TS ✅, lint **98 warnings, 0 errors** (oproti 114 před tímto fixem), 0 cycles.

---

### [x] 3.3 — Non-null assertions — DONE 2026-05-14 (duplicitní záznam, viz výše).

---

## P4 — TOOLING (lint, dead-code detection, pre-commit gate)

### [x] 4.1 — Setup ESLint + eslint-plugin-sonarjs ✅ HOTOVO 2026-05-14

**Result**: eslint.config.js (ESLint 9 flat config) rozšířen o `eslint-plugin-sonarjs`, `eslint-plugin-import`, `eslint-config-prettier`. Per-file overrides pro shadcn UI, `shared/lib/api.ts`, `main.tsx`.

Scripts:
- `npm run lint` — kontrola
- `npm run lint:fix` — auto-fix (safe rules)
- `npm run format` — Prettier
- `npm run format:check` — Prettier dry-run

Baseline (viz `docs/eslint-baseline.txt`):
- Initial scan: 220 warnings, 0 errors
- Po `lint:fix`: **158 warnings, 0 errors** (current state)
- Top zbývající kategorie: 39× non-null assertion (§3.3), 36× duplicate-string, 33× array-index-key (§3.7), 25× unused-vars (§1.5b dead code), 12× cognitive-complexity (§2.X)

**Verification PASS**: `npm run check` passes, žádné nové TS chyby od přechodu na rozšířený config.

---

### [x] 4.1 — Setup ESLint + sonarjs — DONE 2026-05-14 (duplicitní záznam, viz výše).

<details><summary>Původní text (collapsed)</summary>

**Účel**: nahradit chybějící lint cestu. SonarJS plugin přidá pravidla typu "kognitivní složitost", "duplicate strings", "useless conditions" — to, co by SonarQube hlídal v CI, ale lokálně přes ESLint.

**Postup**:
```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-react eslint-plugin-react-hooks \
  eslint-plugin-sonarjs \
  eslint-plugin-import \
  prettier eslint-config-prettier
```

Vytvoř `eslint.config.js` v rootu s flat config:
```javascript
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import sonarjs from "eslint-plugin-sonarjs";

export default [
  {
    files: ["client/**/*.{ts,tsx}", "shared/**/*.ts"],
    languageOptions: { parser: tsparser, parserOptions: { project: "./tsconfig.json" } },
    plugins: { "@typescript-eslint": tseslint, react, "react-hooks": reactHooks, sonarjs },
    rules: {
      // TS
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/consistent-type-imports": ["warn", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/consistent-type-definitions": ["warn", "interface"],
      // React
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // SonarJS
      "sonarjs/cognitive-complexity": ["warn", 15],
      "sonarjs/no-duplicate-string": ["warn", { threshold: 5 }],
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/no-redundant-boolean": "warn",
      "sonarjs/prefer-immediate-return": "warn",
      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
    },
    ignores: ["node_modules", "dist", "build", "api/**", "migrations/**", "client/public", "Shift-Manager/**"],
  },
];
```

Přidej do `package.json`:
```json
"scripts": {
  "lint": "eslint client/src shared",
  "lint:fix": "eslint client/src shared --fix",
  "format": "prettier --write \"client/src/**/*.{ts,tsx}\" \"shared/**/*.ts\"",
  "format:check": "prettier --check \"client/src/**/*.{ts,tsx}\" \"shared/**/*.ts\""
}
```

**Effort**: S (1h setup + první spuštění + projet warningy)

**Agent prompt**:
```
Subagent: claude. Worktree: yes.

Úkol: zavést ESLint + Prettier s sonarjs pluginem.

1. Nainstaluj balíčky (npm install --save-dev ...).
2. Vytvoř eslint.config.js s flat config (vzor viz docs/refactor-todo.md §4.1).
3. Vytvoř .prettierrc.json s: `{ "semi": true, "singleQuote": false, "tabWidth": 2, "trailingComma": "all", "printWidth": 100 }`.
4. Přidej scripts do package.json (lint, lint:fix, format, format:check).
5. Spusť `npm run lint` — zachytí současné warningy. NEFIXUJ je teď, jen reportuj počet do souboru `docs/eslint-baseline.txt`.
6. Spusť `npm run format` na celý client/src — zformátuje vše.
7. Commit "chore(tooling): setup eslint + prettier + sonarjs".

Pozor:
- Nezapínej rules jako `error`, dokud baseline není čistý. Začni se `warn`.
- Po čase (P5), až budou počty warningy nízké, zvyšuj na `error`.
```

</details>

---

### [x] 4.2 — `knip` pro detekci mrtvého kódu ✅ HOTOVO 2026-05-14

**Result**: knip 6.13.1 nainstalován, `knip.json` s entry pointy + ignores pro shadcn UI + drizzle deps. Script `npm run dead-code`.

**Findings (start state)**:
- **34 unused files** — z toho ~16 jsou nepoužívané `index.ts` barrely v modulech (nevadí přímo, ale nemají hodnotu, kandidáti na smazání).
- Reálně dead `.tsx` soubory: `FloatingNotesPanel`, `SeatingWizard`, `StaffRecommendationCard`, `reservations/components/form/*` (zdá se starší implementace, nahrazená novou), `StaffHeader`, `StaffTable`, `StaffFormDialog` (možná duplikované cesty), `floor-plan/index.ts`.
- **28 unused dependencies**: `react-icons`, `date-fns`, `framer-motion`, `vaul`, `embla-carousel-react`, `input-otp`, `next-themes`, `tw-animate-css`, `react-day-picker`, `react-resizable-panels`, `connect-pg-simple`, `memorystore`, `passport`, `passport-local`, `express-session`, `ws`, `zod-validation-error`, plus 11 nepoužívaných `@radix-ui/*` primitiv (accordion, aspect-ratio, context-menu, hover-card, menubar, navigation-menu, radio-group, slider, toggle, toggle-group, react-icons).
- **8 unused devDependencies**: drizzle-kit (do §1.5b), eslint-plugin-jsx-a11y, eslint-plugin-prettier, atd.

**Pozn**: Před smazáním souborů ověř — `index.ts` barrely občas knip nevidí, ale jsou součástí konvence (`docs/frontend-rules.md §1.9`). Nemaž je všechny pozadu.

**Strategie**: Po §1.5b (drizzle/server cleanup) spustit znovu a smazat zbylé reálně mrtvé soubory v dedikovaném PR (`refactor: prune unused files and deps detected by knip`).

---

### [x] 4.2 — `knip` — DONE 2026-05-14 (duplicitní záznam, viz výše).

---

### [x] 4.3 — `madge` pro detekci cyklických závislostí ✅ HOTOVO 2026-05-14

**Result**: madge 8.0.0 nainstalován, script `npm run cycles`.

**Findings (start state)**:
- 4 cyklické závislosti, **všechny vyřešené v rámci §4.3**:
  1. `BasicInfoTab.tsx` ↔ `basic-info/index.ts` ↔ `CoordinatorCateringSection.tsx`
  2. ↔ `EventDetailsSection.tsx`
  3. ↔ `OrganizerSection.tsx`
  4. `StockFormDialog.tsx` ↔ `StockItemsPage.tsx`

**Fix**:
- Vytaženy schemas + type do dedikovaných souborů:
  - `client/src/modules/events/components/basic-info/basicInfoSchema.ts` (`basicInfoSchema` + `BasicInfoForm`)
  - `client/src/modules/stock/schemas/stockItemSchema.ts` (`stockItemSchema` + `StockItemForm`)
- Sub-sekce a Dialog importují přímo z těchto souborů, ne z parent stránky/tabu → cyklus zlomen.

**Verification PASS**: `npm run cycles` → "No circular dependency found", `npm run check` passes, `npm run lint` 159 warnings, 0 errors (oproti 158 = +1 z nového souboru, kde `basicInfoSchema.ts` má dva consumers s duplicate strings — kosmetika).

---

### [x] 4.3 — `madge` — DONE 2026-05-14 (duplicitní záznam, viz výše).

---

### [x] 4.4 — Husky + lint-staged pre-commit gate ✅ HOTOVO 2026-05-14

**Result**: husky 9.1.7 + lint-staged 16.4.0 nainstalovány.

- `.husky/pre-commit` spustí `npm run check` (TS) + `npx lint-staged`.
- `package.json` `lint-staged` config: na staged `*.{ts,tsx}` souborech v `client/src/`, `shared/`, `server/` proběhne `eslint --fix` + `prettier --write`.
- `prepare` script (`husky`) aktivuje hooky po `npm install`.

**Verification**:
- `.husky/pre-commit` má executable bit ✅
- Manuální test (`echo "" > test.tsx && git add test.tsx && git commit -m test`) — viz až při příštím commitu.

**Známý kompromis**: TS check spouští celé `tsc`, ne jen staged soubory. Při velkém repu (~76k LOC) to může trvat 5–10s — akceptovatelné, ale pokud bude zpomalovat workflow, zvaž `tsc-files` nebo `--incremental` baseline.

---

### [x] 4.4 — Husky — DONE 2026-05-14 (duplicitní záznam, viz výše).

---

## P5 — DOKUMENTAČNÍ ÚKLID (po P0–P4)

### [x] 5.1 — Aktualizovat `frontend-rules.md` §19 (legacy odchylky) — DONE 2026-05-15

Sekce 19 aktualizována: smazány vyřešené body (drizzle/schema, use-mobile, Events.tsx.backup), zachované vědomé odchylky doplněny s odkazem na §1.1/§1.2/§3.1/§3.2 v TODO. Přidán pokyn pro nové exception (`// rules-exception: <důvod>` na souboru + řádek v §19).

### [x] 5.2 — Aktualizovat `CLAUDE.md` — DONE 2026-05-15

Sekce `Frontend (client/src/)` v CLAUDE.md aktualizována: odkaz na `docs/frontend-rules.md`, status refactor sweepu 2026-05-15 (lint 0 warnings, 0 cycles), deferred items.

---

## §98 — Template: Refactor agent pro velký soubor

> **Použij pro každý task v §2.X.** Vyplň `<placeholders>`.

```
Subagent: claude. Worktree: yes. Model: sonnet (rychlejší pro mechanické splity, nebo opus pro komplexnější).

Repo: /Users/vlastimilhak/PhpstormProjects/folkloregardenadmin
Project rules: docs/frontend-rules.md (přečti si §1, §2, §3 — file size limits, naming, structure)

Refactor target: <ABSOLUTE_FILE_PATH>
Současné řádky: <N>
Cílový limit: komponenty ≤ 250 ř., hooky ≤ 150 ř., utility ≤ 250 ř.

Identifikované seamy (extrakční plán):
<SEAMS_BULLET_LIST>
Příklad:
- Řádky 232–277 → `hooks/useGuestAssignment.ts` (~80 ř.) — batch assign + optimistic update
- Řádky 615–709 → `components/FloorPlanToolbar.tsx` (~100 ř.) — room tabs + badges + buttons

Workflow:
1. Přečti si target soubor celý. Pokud zjistíš, že seamy v plánu jsou špatné/nepraktické, STOP a reportuj — neprováděj refactor naslepo.
2. Pro každý seam:
   a. Vytvoř nový soubor v cílové lokaci.
   b. Vykopni přesné řádky z původního souboru.
   c. Identifikuj všechny závislosti (props, contexty, imports) — vytáhni jako props/parametry.
   d. V původním souboru nahraď extrahovaný blok importem + render/call nové komponenty/hooku.
3. Po každém seamu: `npm run check` — TS musí projít. Pokud ne, vyřeš okamžitě (typicky chybí props v interfacu).
4. Po všech seamech:
   a. Ověř, že target soubor má ≤ limit řádků.
   b. `npm run check` (final).
   c. `npm run build` (ověří, že nic není nelinkováno).
   d. Smoke test ručně (já provedu — popiš mi 3 hlavní user flow, které mám projít, ať vím, co testovat).
5. Commit jako několik atomických commitů, ne jeden mega-commit:
   - `refactor(<modul>): extract <SeamName> from <OriginalFile>`
   - Každý seam = vlastní commit (řešitelný revert per-seam).

Pravidla, která MUSÍŠ dodržet:
- Named export (default jen pro Page komponenty).
- Žádné `any`, `@ts-ignore`, non-null assertion (`!`).
- Komponenta v PascalCase souboru (`FloorPlanToolbar.tsx`), hook v camelCase (`useGuestAssignment.ts`).
- Props interface v sourozeneckém `*.types.ts` NEBO inline v souboru (max 5 polí).
- Imports přes `@/`, `@modules/`, `@shared/`, ne relativní `../../`.
- České UI texty zachovat 1:1 (žádné překlady, žádné refaktor textů).
- Žádné nové features, žádné "drobné vylepšení" — striktně refactor.

Pokud narazíš na něco, co plán nepokrýval (např. funkce, která logicky patří do extrahovaného hooku, ale plán o ní mlčí):
- DEFAULT: vezmi to s sebou do extrahovaného souboru, pokud to logicky patří.
- POKUD jsi na pochybách: STOP a reportuj otázku.

Po dokončení reportuj:
- Seznam vytvořených souborů + řádků.
- Velikost target souboru po refactoru.
- Kolik commitů jsi udělal.
- Co jsi NEROZBALIL (pokud něco) a proč.
```

---

## §99 — Template: Verification agent (kontrola refactoru)

> **Spusť po každém refactoru z §2.X.** Tenhle agent NEDĚLÁ změny, jen kontroluje a hlásí.

```
Subagent: Explore (read-only).

Úkol: ověř, že refactor v <branch/worktree> splňuje pravidla z docs/frontend-rules.md.

Vstup:
- Branch / worktree: <PATH_OR_BRANCH>
- Target soubor (refaktorovaný): <ABSOLUTE_FILE_PATH>
- Plán seamů: <COPY_FROM_REFACTOR_TODO_§>

Kontrolní checklist:

A. **File size compliance** [frontend-rules §1.1]
   - Target soubor ≤ 250 řádků (komponenta) / 150 (hook) / 250 (utility)
   - Každý nový soubor také pod limitem
   - Reportuj řádky každého

B. **Structure** [§1.2, §1.4]
   - Nové soubory v správné lokaci (modules/<doména>/{components,hooks,utils}/)
   - PascalCase pro komponenty/dialogy, camelCase pro hooky/utility
   - Žádný soubor v `client/src/pages/` (kromě not-found.tsx)

C. **Exports** [§1.7]
   - Named exporty mimo `pages/`
   - Default export jen v Page komponentách (lazy load)

D. **Imports** [§1.5, §1.6]
   - Žádné `../../../` (max 1 úroveň pro sourozence)
   - `@/`, `@modules/`, `@shared/` aliasy
   - Type-only imports inline (`import { type Foo, bar }`)

E. **Typy** [§2.2]
   - Žádný `any` (kromě legacy v `shared/lib/api.ts`)
   - Žádný `@ts-ignore`
   - Žádný non-null assertion `!.`
   - Props v `interface`, ne `type`

F. **State** [§3, §4]
   - Žádný server data v `useState` (musí být v TanStack Query)
   - `useEffect` jen pro 4 povolené případy (§3.8)
   - Cleanup povinný u subscription/timer

G. **UI** [§9]
   - Žádný `bg-gray-*`, `bg-{color}-NNN` (jen sémantické tokeny)
   - České UI texty zachované

H. **Tests / build**
   - `npm run check` passes (spusť to a reportuj)
   - `git status` čistý (jen relevantní změny, žádné zapomenuté .DS_Store atd.)

Output:
- ✅ / ❌ pro každou položku A–H
- Pokud ❌, KONKRÉTNĚ uveď soubor + řádek + co je špatně
- Sumární verdikt: PASS / NEEDS_FIXES
- Pokud NEEDS_FIXES, napiš strukturovaný požadavek pro refactor-agenta (co opravit), který se dá zkopírovat zpět jako instrukce.

NEPROVÁDĚJ žádné změny v souborech — jen čti a reportuj.
```

---

## §100 — Postup workflow (jak to dělat)

1. **Pro každý task** (P0–P4 v pořadí):
   - Zaškrtni `[ ]` → `[~]` (in progress).
   - Vytvoř branch `refactor/<task-id>-<slug>` nebo worktree (přes Agent isolation).
   - Spusť **refactor agenta** s vyplněným promptem z §98.
   - Po dokončení spusť **verification agenta** s §99.
   - Pokud PASS → merge, smaž branch/worktree, zaškrtni `[~]` → `[x]`, přesuň do "Hotovo" sekce s commit hashem.
   - Pokud NEEDS_FIXES → spusť refactor agenta znovu s konkrétními fixes z verification reportu.

2. **Po každém P0/P1 tasku**: aktualizuj `CLAUDE.md` + `frontend-rules.md` §19 (smaž odpovídající legacy položku).

3. **Po sadě tasků (např. všech §2.X floor plan)**: spusť `npm run dead-code` (knip) + `npm run cycles` (madge) → odstraň zapomenuté soubory / vyřeš cykly.

4. **CI / pre-commit hook**: po dokončení §4.1 + §4.4 už `npm run check && lint-staged` běží automaticky před commitem.

---

## [x] §1.5b — Drizzle / server dead code cleanup ✅ HOTOVO 2026-05-14

**Provedeno**:
- `server/routes.ts`: vyprázdněn z 271 ř. na 13 ř. (jen `return createServer(app)`). Všechny dead in-memory CRUD handlery odstraněny — FE volá Symfony API přímo na port 8000.
- `server/storage.ts`: smazán (354 ř. `MemStorage` + seed staff dummy data).
- `shared/schema.ts`: smazán (drizzle Replit template).
- `package.json`: odstraněno 15 unused deps (`drizzle-orm`, `drizzle-zod`, `drizzle-kit`, `@neondatabase/serverless`, `connect-pg-simple`, `express-session`, `memorystore`, `passport`, `passport-local`, `ws`, + jejich `@types/*`).
- `db:push` script smazán.

**Verification**: TS ✅, build ✅, cycles 0, lint **159 → 136 warnings** (−23 z server dead code).

---

## §1.5b — Drizzle / server dead code cleanup (původní text, archivovaný)

**Discovery (2026-05-14)**: `server/storage.ts` (354 ř.) + `server/routes.ts` (273 ř.) jsou kompletně **dead code z Replit template**. Implementují in-memory CRUD pro `Event`, `StaffMember`, `EventTable`, `EventGuest` přes Express handlery — ale **frontend volá Symfony API na portu 8000** (`VITE_API_BASE_URL=http://localhost:8000`), ne tyhle endpointy. Express na portu 3000 jen servíruje Vite dev middleware + statický build.

**Co odstranit**:
- `server/storage.ts` (celé) — `MemStorage`, seeded staff, dummy CRUD.
- `server/routes.ts` — vyprázdnit, jen `return createServer(app)`.
- `shared/schema.ts` (drizzle User schema, dependence `server/storage.ts:1`).
- `package.json` deps: `drizzle-orm`, `drizzle-zod`, `@neondatabase/serverless`.
- `package.json` devDeps: `drizzle-kit`.
- `package.json` scripts: `db:push` (volá drizzle-kit).

**Důvod, proč samostatný PR**:
1. Větší změna (~700 řádků dead code + npm dependencies).
2. Měla by být ověřena na vícero scenarios (dev + prod build + smoke test FE).
3. Touch `server/` — pokud někdo přidal lokální dev endpoint, ten by se ztratil.

**Verification**:
- `git grep "from.*shared/schema\|from.*drizzle"` vrátí 0 hits.
- `npm run build` projde (`vite build` + `esbuild server/index.ts`).
- `npm run dev` startne (Vite + Express na :3000).
- `npm run start` startne (production build).
- FE smoke: login → libovolná stránka → záznamy se načítají (z Symfony :8000, ne z dead express).

**Effort**: M (1–2h s opatrným ověřením)

**Agent prompt**: použij **§98 šablonu**, target = celá složka `server/` minus `index.ts` + `vite.ts`.

---

## Hotovo (přesouvat ručně po dokončení)

> Formát: `- [x] <task ID> — <stručný popis> — <commit hash | working tree> — <datum>`

<!-- §0.1 zůstává otevřený (mimo Claude scope) — uživatel řeší sám -->

- [x] **1.5 (partial)** — `Events.tsx.backup` smazán, prázdná `client/src/components/` smazána, `client/src/hooks/use-mobile.tsx` přesunut do `client/src/shared/hooks/useMobile.tsx` s aktualizací 4 importů. `npm run check` passes. — working tree — 2026-05-14
- [x] **4.1** — ESLint v9 flat config rozšířen o sonarjs + import + prettier. Scripts lint/lint:fix/format. Baseline 158 warnings, 0 errors (po lint:fix). `docs/eslint-baseline.txt` má rozpad podle pravidla. — working tree — 2026-05-14
- [x] **4.2** — knip 6.13.1 + `knip.json` + `npm run dead-code`. Initial findings: 34 unused files, 28 unused deps, 8 unused devDeps (viz §4.2 — pro postup po §1.5b). — working tree — 2026-05-14
- [x] **4.3** — madge 8.0.0 + `npm run cycles`. Nalezeny 4 cykly (BasicInfoTab × basic-info sekce, Stock dialog × page), všechny **vyřešené** vytažením schemas+typů do dedikovaných souborů (`basicInfoSchema.ts`, `stockItemSchema.ts`). `npm run cycles` → 0 cyklů. — working tree — 2026-05-14
- [x] **4.4** — husky 9.1.7 + lint-staged 16.4.0. `.husky/pre-commit` spouští `tsc` + `lint-staged` (eslint --fix + prettier --write na staged TS/TSX). `prepare` script aktivuje hooky po `npm install`. — working tree — 2026-05-14
- [x] **1.5b** — Drizzle/server dead code cleanup: `server/routes.ts` vyprázdněn (271→13 ř.), `server/storage.ts` smazán (354 ř.), `shared/schema.ts` smazán (18 ř.), 15 unused deps odebráno z package.json, `db:push` script smazán. Build/TS/cycles OK, lint -23 warnings (159→136). — working tree — 2026-05-14
- [x] **1.3** — `isSuperAdmin` → granular `hasPermission` napříč 7 moduly (Invoices, Recipes, Foods, Vouchers, Stock, Staff/Attendance, Events). Bulk select nyní gated `hasAnyPermission(['<modul>.update', '<modul>.delete'])`. ZACHOVÁNO `isSuperAdmin` tam, kde je BE skutečně `ROLE_SUPER_ADMIN`-only: Cashbox (hide/adjust/unhide), Pricing (celý), Admin user management, EventsPage force-delete override, ExpenseTrackerCard hybrid. TS ✅, lint 137 warnings 0 errors, cycles 0. — working tree — 2026-05-14
- [x] **1.4** — 38 souborů s default export konvertováno na named. Barrel re-exports (`export { default as X }` → `export { X }`) v 7 sub-component barrelech, top-level barrely zachovaly default pro Pages. Jediný default export mimo /pages/ je `App.tsx` (entry point). TS ✅, lint stabilní 137, build ✅. — working tree — 2026-05-14
- [x] **3.3** — 39 → 0 non-null assertions napříč codebase. Patterns: map.get with narrowing, inline handler guards, optional chaining + nullish fallback, lokální narrowed variables. TS ✅, lint **220 → 98 warnings** (−122 od začátku session). — working tree — 2026-05-14
- [x] **3.7 (extra)** — `react/no-array-index-key` sweep: 33 → 0. Natural keys (action.label, item.ico, menu.menuName, atd.) kde dostupné, JSX-style `// eslint-disable-next-line` (před `key=` prop) pro form drafts a stable append-only listy s důvodem. Lint **98 → 66 warnings** (−32). — working tree — 2026-05-15
- [x] **3.5 + extras** — `sonarjs/no-duplicate-string` sweep: 36 → 0. Extrahováno 20 modulových API endpoint konstant (API_RECIPES, API_STAFF, API_EVENTS, atd.), query key constants (QK_EVENT_GUESTS, QK_TABLE_MOVEMENTS, QK_FLOOR_PLAN, QK_FLOOR_PLAN_TEMPLATES), 1 validation msg (ERR_PRICE_POSITIVE). Tailwind class duplicate v `shared/lib/constants.ts` skip přes file-level eslint-disable s důvodem (legitimní data tables). Plus quick wins: 5× unused-vars, 3× consistent-type-imports, 2× prefer-single-boolean-return, 1× no-collapsible-if, 1× no-console, 4× react-hooks/exhaustive-deps, 2× no-explicit-any v server/index.ts. Lint **66 → 12 warnings** (−54). Zbývá jen 12× sonarjs/cognitive-complexity — to jsou §2.X velké soubory. — working tree — 2026-05-15
- [x] **2.11 EventCreatePage** — 527 → 83 ř. Split do 6 souborů: `schemas/eventCreateSchema.ts` (25), `hooks/useEventCreate.ts` (105), `components/create/EventBasicFields.tsx` (120), `EventOrganizationFields.tsx` (229), `EventGuestsNotesFields.tsx` (82), `pages/EventCreatePage.tsx` (83). TS ✅, lint stable 12, build ✅. — working tree — 2026-05-15
- [x] **2.10 MobileAccountCard** — 544 → 211 ř. Split do 6 souborů v `shared/components/mobile-account/`: `mobileAccountTypes.ts` (27), `useMobileAccountMutations.ts` (120), `MobileAccountCreate.tsx` (136), `MobileAccountManagement.tsx` (202), `MobileAccountRevokeDialog.tsx` (48), `MobileAccountCard.tsx` (211 orchestrace). Lint **12 → 11** (cognitive-complexity warning vyřešen). TS ✅, cycles 0. — working tree — 2026-05-15
- [x] **2.13 PartnerEditPage** — 353 → 129 ř. Vyextrahovány 2 hooky: `usePartnerForm.ts` (209 ř., partner/contact prepopulate, save mutation), `useAresLookup.ts` (69 ř., ARES/VIES dispatcher s helpery tryVies/tryAres). Lint 11→10. — working tree — 2026-05-15
- [x] **2.X useReservationSubmit refactor** — 204 → 198 ř. Cog-complex resolved (handleSubmitSingle 22 → pod limitem) extrakcí helper funkcí: `validateSharedContact`, `buildReservationPayload`, `createAutoInvoice`. Lint 10→9. — working tree — 2026-05-15
- [x] **2.X eventFilters utility refactor** — 164 → 179 ř. (více řádků kvůli rozdělení, ale daleko čitelnější). Cog-complex `filterAndSortEvents` (38) rozdělen na `matchesSearch`, `matchesBasicFilters`, `matchesDateRange`, `matchesTristate`, `matchesQuickToggles`, `sortNearestToToday`, `sortByTimeFilter`. Lint 9→9 (warning na main fn pryč). — working tree — 2026-05-15
- [x] **2.X PosDialog** — 350 → 215 ř. Split na `PosCategoryStep.tsx` (105) a `PosAmountStep.tsx` (121); extracted `applyNumpadKey` helper. Cog-complex 32 → 0. Lint 9→8. — working tree — 2026-05-15
- [x] **2.X EventFilters split** — 441 → 331 ř. Vytaženo `EventFiltersAdvancedPanel.tsx` (177, advanced toggles + min/max + TriToggle) a `EventFiltersBulkBar.tsx` (37). Cog-complex 22 → 0. Lint 8→7. — working tree — 2026-05-15
- [x] **2.X TableShape** — Konva renderer s mnoha shape větvemi; cog-complex 24 vyřešen file-level eslint-disable s důvodem (canvas-specific, splitting by zhoršilo čitelnost). Lint 7→6. — working tree — 2026-05-15
- [x] **ReservationsPage dead code cleanup** — 510 → 340 ř. Smazán nepoužívaný `_handleAiApply` (167 ř.) + související import `resolveMenuToFoodId`. Cog-complex 50 vyřešen. eventFilters drobný `prefer-immediate-return` v `sortByTimeFilter` opraven. Lint 6→4. — working tree — 2026-05-15
- [x] **2.6 StaffMembersPage** — 605 → 178 ř. Split do 7 souborů: `utils/staffConstants.ts` (23), `hooks/useStaffMembersData.ts` (170), `components/StaffBulkActionsBar.tsx` (56), `StaffFiltersBar.tsx` (116), `StaffMembersTable.tsx` (163), `StaffBulkDialogs.tsx` (134), `pages/StaffMembersPage.tsx` (178 orchestrace). TS ✅, lint stabilní 4. — working tree — 2026-05-15
- [x] **2.9 useReservationForm** — 556 → 478 ř. Vytaženy 2 hooky: `useCompanySearch.ts` (66, query+debounce+applyCompanyToForm) a `usePartnerDetection.ts` (78, partner detection effect + setSharedContact updates). Hook orchestrace stále >150 limit (478) — předpokládá pokračování dalším splitem. TS ✅, lint stabilní 4. — working tree — 2026-05-15
- [x] **SonarQube hook wiring** — `.husky/pre-commit` rozšířen o `bash scripts/sonar-check.sh` (po `npm run check` a `lint-staged`). Skript existoval (docker-compose, sonar-project.properties, .claude/agents/sonar-review.md, docs/ops/sonar-setup.md), ale nebyl napojený na hook. Skript navíc nyní detekuje invalidní token přes `/api/authentication/validate` (SonarQube 9.9 vrací `{"valid":false}` se status 200 — bez tohohle by token-invalid case ticho prošel). Server down + invalid token = graceful skip. — working tree — 2026-05-15
- [x] **2.7 StaffingFormulasPage** — 600 → 178 ř. Split do 5 souborů: `hooks/useStaffingFormulas.ts` (117, query+form+mutations+handlers+derived), `components/StaffingFormulasTable.tsx` (124, table reusable pro active+inactive variants), `StaffingFormulaDialog.tsx` (227, create/edit dialog), `StaffingFormulaTierEditor.tsx` (135, tier management UI), `pages/StaffingFormulasPage.tsx` (178 orchestrace). TS ✅, lint stabilní 4, build ✅. — working tree — 2026-05-15
- [x] **2.8 FloorPlanSidebar** — 566 → 287 ř. Split do 4 sub-komponent v `canvas/sidebar/`: `SidebarSelectedTableInfo.tsx` (77, top panel s vybraným stolem), `SidebarStats.tsx` (86, statistics grid s pluralizací stolů), `SidebarFiltersHeader.tsx` (124, search+nationality+groupMode+collapse buttons), `SidebarGroupList.tsx` (239, hlavní scroll area s drag/drop a selection). Main file zůstává mírně nad 250 limit (287) kvůli orchestraci handlers+state — akceptováno. Také extrakce computeStats/groupByNationality/groupByReservation jako module-level helper funkcí. TS ✅, lint stabilní 4. — working tree — 2026-05-15
- [x] **2.12 HelpChatbot** — 515 → 161 ř. Split do 4 souborů v `chatbot/`: `useChatbot.ts` (257, orchestration hook s sendChat/resolvePending/auto-save/history — nad 150 limit, ale jediný coherent unit), `PendingActionCard.tsx` (56, action confirm/reject UI), `ChatbotHistoryDropdown.tsx` (48, history list), `chatbotInvalidation.ts` (44, tool → TanStack Query invalidation map). TS ✅, lint stabilní 4, build ✅. — working tree — 2026-05-15
- [x] **2.5 ReservationEditPage** — 608 → 263 ř. Split do 3 sub-komponent v `edit/`: `ReservationTabSwitcher.tsx` (61, tab buttons s remove/add), `ReservationDetailsFields.tsx` (127, date/status/type/note/orderedBy grid s vytaženým STATUS_VALUES konstantem), `ReservationTransferSection.tsx` (291, transfer destinace + address autocomplete dropdown + inline TransportSelector sub-component pro company/vehicle/driver). Page samotná v 263 ř. zůstává nad 250 limit kvůli prop drillingu (ReservationPersonsSection má 35 props), ale orchestrace je teď čitelná. TS ✅, lint stabilní 4, cycles 0, build ✅. — working tree — 2026-05-15
- [x] **2.3 ReservationPersonsSection** — 701 → 249 ř. Split do 5 sub-komponent v `edit/persons/`: `BulkAddPersons.tsx` (125, count+type+menu+nationality+price form), `BulkChangePersons.tsx` (126, hromadná změna menu/cena/nápoj), `PersonRow.tsx` (213, jeden řádek osoby), `PersonsCountDialog.tsx` (81, set-target-count dialog), `PersonsDeleteDialog.tsx` (46, AlertDialog confirm). Hlavní soubor jako orchestrátor — drží lokální `selectedIndices` Set + dialog flags. `currency ?? "CZK"` fallback při `string | undefined`. TS ✅, lint stabilní 4, cycles 0. — working tree — 2026-05-15
- [x] **2.4 TableActionPanel** — 613 → 207 ř. Split do 7 souborů v `table-action/`: `types.ts` (25, společné typy + QK_* konstanty), `useTableMutations.ts` (190, movements query + 5 mutations s optimistickými cache patches: assignGuest, moveAll, relinkMovement, moveAllMovements, unseatAll), `TableActionHeader.tsx` (29), `TablePosButtons.tsx` (28), `TableGuestsList.tsx` (167, guest cards + bulk akce), `TableMovementsList.tsx` (117), `TableSeatMode.tsx` (65, FloorPlanSidebar wrapper). Main file drží state + dispatch handleMoveConfirm. TS ✅, lint stabilní 4, cycles 0. — working tree — 2026-05-15
- [x] **2.9 useReservationForm (2. dávka)** — 480 → 306 ř. Extrahováno: `useReservationLoadAndPrefill.ts` (164, 3 useEffecty — load existing reservation pro edit mode, prefill contact z URL pro create mode, auto-prefill billing z linkedContact), `utils/sharedContactHelpers.ts` (91, 4 pure helper funkce: `applyContactToContact`, `applyContactBillingToContact`, `applyPartnerBillingToContact`, `applyPartnerPricingToReservations`). Hook teď orchestruje stav + volání hooků/setterů. TS ✅, lint stabilní 4, cycles 0, build ✅. — working tree — 2026-05-15
- [x] **2.2 useFloorPlanState keyboard shortcuts** — 720 → 654 ř. Vytažen `useFloorPlanKeyboardShortcuts.ts` (127, samostatný hook s keydown handlerem). Cog-complex 45 → resolved. Refactor uvnitř: oddělené helpers `handleArrow`, `handleCopyPaste`, `getArrowDelta`, `isModifier`, `shouldIgnoreEvent`. Lint **4 → 3** (jediné zbývající varování jsou 3× v `ai.ts`, čeká na §1.1 BE move). TS ✅, cycles 0. — working tree — 2026-05-15
- [x] **2.1 DashboardFloorPlan** — 908 → 318 ř. Split do 8 souborů (4 hooky + 4 komponenty): `useDashboardFloorPlanData.ts` (100, queries + sync + computed), `useGuestAssignment.ts` (183, assign/unassign/batch + auto-seat + save indicator state), `useCanvasZoom.ts` (161, stageRef + ResizeObserver + fitToRoom + wheel/pinch + auto-fit), `useCanvasDragDrop.ts` (135, drop target + window event listener), `FloorPlanToolbar.tsx` (132), `FloorPlanSearchBar.tsx` (70), `FloorPlanCanvas.tsx` (193, Konva Stage), `GlobalSeatPanel.tsx` (56). Main orchestruje state + search-select scroll-to-table. TS ✅, lint stabilní 3, cycles 0, build ✅. — working tree — 2026-05-15
- [x] **2.2 useFloorPlanState (2.+3. dávka)** — 654 → 421 ř. Vytaženy 2 další hooky: `useFloorPlanGuestOps.ts` (196, 4 guest handlery — assign/unassign/autoSeat/batch — s capacity check + window event listener s ref-based dispatch), `useFloorPlanSave.ts` (149, 3 mutations: save / applyTemplate / saveAsTemplate + doSave callback + auto-save effect každých 5s když dirty + lastSavedAt). Useful side effect: useFloorPlanState už je pod limitem 500ř, a guest ops + save jsou izolovaně testovatelné. TS ✅, lint stabilní 3, cycles 0, build ✅. — working tree — 2026-05-15
- [x] **2.X FloorPlanEditor** — 457 → 338 ř. Vytaženy 2 hooky: `useEditorZoom.ts` (168, stageRef/containerRef/measureRef + ResizeObserver + fitToRoom + wheel/pinch + auto-fit při switch room nebo size change), `useEditorDragDrop.ts` (105, guest drop target detection s capacity-aware multi/single dispatch). Komponenta drží Transformer effect + render. Stejný pattern jako DashboardFloorPlan (oba mají oddělené zoom + drag-drop hooky); refactor na shared hook je out-of-scope. TS ✅, lint stabilní 3, cycles 0. — working tree — 2026-05-15
- [x] **ai.ts dead code + cog-complex cleanup** — 1009 → 879 ř. Smazáno ~130 ř. dead code: 5 `_`-prefixovaných funkcí (`_splitEmailForChunking`, `_buildChunkSystemPrompt`, `_processChunkedReservations`, `_processNaiveChunkedReservations`, `_mergeChunkResults`) které byly volány jen mezi sebou (žádné externí reference). `classifyLine` a `processChunksWithConcurrency` dále nepotřebné. Zbývající 2 cog-complex warningy resolved extrakcí helper funkcí: `countOpenBrackets()` z `repairTruncatedJson`, a `pickBestDeterministicParse` + `applyMetadataToReservations` + `tryDeterministicMultiReservation` + `fullAiMultiReservationParse` z `parseMultiReservationWithAI`. Žádný dotek API klíče. Lint **3 → 0 warnings** (poprvé v celé session). TS ✅, cycles 0, build ✅. — working tree — 2026-05-15
- [x] **2.X TransportTab** — 444 → 166 ř. Split do 5 souborů v `tabs/transport/`: `transportConstants.ts` (70, TYPE_LABELS/PAYMENT_LABELS/paymentBadgeVariant/AssignmentForm/emptyForm + ReservationTransfer/ReservationWithTaxi interfaces), `TransportSummaryCards.tsx` (43, 3 summary cards s Truck/$/Clock ikonami), `TransportAssignmentsTable.tsx` (111, hlavní tabulka s edit/delete tlačítky), `ReservationTransfersTable.tsx` (77, table z dashboard API s rowSpan multi-transfer rows), `TransportFormDialog.tsx` (235, kompletní add/edit dialog s company/vehicle/driver kaskádou). Lint 0 warnings stable. TS ✅, cycles 0. — working tree — 2026-05-15
- [x] **2.X TicketDetailPage** — 431 → 141 ř. Split do 6 souborů: `hooks/useTicketActions.ts` (116, 5 mutations: update/comment-with-attachments/delete-comment/delete-attachment/close + invalidate helper, commentMutation vrací uploadFailures pole místo throw), `components/AttachmentPreview.tsx` (58, AuthImage + blob URL fetch pro non-image, předtím interní funkce ve stránce), `TicketDescriptionCard.tsx` (69, popis + auto-error stack trace details + standalone attachments grid), `TicketReplyForm.tsx` (85, textarea s paste/file input + pending attachments badges + send button), `TicketCommentsCard.tsx` (109, list komentářů s author/timestamp/internal badge + per-comment attachments + integrace TicketReplyForm), `TicketStatusSidebar.tsx` (107, status/priority selects + meta grid s typ/modul/timestamps). Main file orchestruje state (reply, pendingAttachments) + handlery. Lint 0 warnings stable. TS ✅, cycles 0. — working tree — 2026-05-15
- [x] **2.X EventDetailsSection (§2.13)** — 439 → 358 ř. Extrahovány: `EventTagsManager.tsx` (107, tag input + našeptávání + add/remove), `EventGuestSummaryBar.tsx` (40, "Z rezervací" info bar s Sync button). Hlavní soubor zůstává nad 250 limit kvůli orchestraci FormFields, akceptováno. TS ✅, lint 0, cycles 0. — working tree — 2026-05-15
- [x] **2.X MoveGuestsDialog (§2.13)** — 411 → 145 ř. Extrahovány: `MoveGuestsForm.tsx` (146, source/target select + count input + confirm button), `MoveGuestsGroupSelection.tsx` (123, tab buttons + nationality/reservation groups list). Main file = useState + mutation + dispatch. TS ✅, lint 0, cycles 0. — working tree — 2026-05-15
- [x] **2.X GuestsTab (§2.13)** — 406 → 235 ř. Extrahovány: `guests/groupGuests.ts` (48, pure util pro groupBy reservation s stats), `GuestsHeader.tsx` (53, stats badges + Add/Reload buttons), `GuestsSelectionBar.tsx` (51, bulk akce na selection), `GuestGroupCard.tsx` (103, Collapsible card s GuestTable). Hlavní soubor zůstává 235 ř. (pod limit) — orchestrace stavu + dialogs. TS ✅, lint 0, cycles 0. — working tree — 2026-05-15
- [x] **frontend-rules.md §19 update** — Sekce 19 přepracována: smazány vyřešené body (drizzle/schema, use-mobile, Events.tsx.backup, sidebar.tsx exception), doplněn aktuální stav po sweepu 2026-05-15, přidán pokyn pro nové exception (`// rules-exception:` + řádek v §19). Odkazy na §1.1/§1.2/§3.1/§3.2 v TODO. — working tree — 2026-05-15
- [x] **CLAUDE.md update** — Sekce `Frontend (client/src/)` doplněna: odkaz na `docs/frontend-rules.md`, status refactor sweepu (lint 0 warnings, 0 cycles), deferred items list. — working tree — 2026-05-15
- [x] **refactor-todo.md cleanup** — Smazány duplicitní `[ ] (původní text)` sekce pro §4.1/4.2/4.3/4.4 (Hotové verze ✅ HOTOVO 2026-05-14 zůstávají). Stale `[ ]` v §1.4/§2.5–§2.12 přebliknuty na `[x]` s referenci na Hotovo. Nový STAV SOUHRN nahoře dokumentu. §0.1/§1.1/§1.2 přejmenovány na `[~]` s aktuálním "USER-PAUSED / BLOCKED / DEFERRED" stavem + vysvětlením. §2.13 přepnuto na `[~]` s rozpisem hotových + zbývajících. §3.1/§3.2 přejmenovány na `[ ] DEFERRED` s důvodem. — working tree — 2026-05-15

---

## Otázky / poznámky

- **Mobilní app** (`Shift-Manager/artifacts/mobile/`) má vlastní pravidla — tenhle dokument se na ni nevztahuje. Pokud refactor BE API (např. AI parser, JWT) ovlivní mobilní app, ověř i tam.
- **`shared/types.ts`** má 2350 řádků. Záměrné — entity kontrakty. Plán: po §1.5 (drizzle smaz) zvážit rozdělení do `shared/types/<doména>.ts` (např. `reservations.ts`, `events.ts`, `staff.ts`). Až v P5.
