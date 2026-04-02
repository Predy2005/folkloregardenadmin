# TODO: Stoly a Floor Plan - kde jsme skoncili (2026-03-25)

## Co je hotove

- Building/Room CRUD (backend + frontend)
- Floor plan editor s Konva canvasem (drag-drop, zoom/pan)
- Tvary stolu: kulaty, obdelnikovy, ovalny, ctverec
- Floor elementy: stage, tanecni parket, bar, bufet, vchod, zed, dekorace, custom
- Template system (ukladani, duplikovani, aplikace na event)
- Kopirovani floor planu z jineho eventu
- Guest assignment pres drag-drop v sidebaru
- Polygon drawing pro custom tvary elementu
- Lock/unlock objektu
- Klavesove zkratky (Delete/Backspace)
- POS system pro naklady stolu (TableDetailPopover)
- List view stolu s edit/delete
- Venue modul (BuildingsPage, FloorPlanTemplatesPage)

## Co je potreba doresit

### Vysoka priorita (blokujici)

1. **~~Opravit Room FK handling~~** ✅ HOTOVO
   - saveFloorPlan() nyni cte `roomId` z kazdeho stolu/elementu individualne
   - Frontend posila `roomId` per-table/element misto jednoho sdileneho
   - Odstranen neplatny top-level `roomId` ze save payloadu

2. **~~Chybejici typy v shared/types.ts~~** ✅ HOTOVO
   - `TableExpense` a `TableExpenseCategory` uz byly definovany (radky 691-708)
   - `FloorPlanTableData` doplnen o `id`, `room`, `roomId`, `isLocked`, `sortOrder`
   - `FloorPlanElementData` doplnen o `id`, `roomId`, `isLocked`, `sortOrder`

3. **~~Guest sync v sidebaru~~** ✅ HOTOVO
   - Bug: pri smazani stolu se hosté neodpojili (stale `eventTableId` v guests stavu)
   - Fix: `handleDeleteSelected` nyni unassignuje hosty ze smazaneho stolu

4. **~~Zdokumentovat migrace~~** ✅ HOTOVO
   - **Version20260325131904.php** - Hlavni migrace: vytvari tabulky `building`, `room`, `floor_plan_element`, `floor_plan_template`, `table_expense`. Modifikuje `event_table` (pridava room_id FK, shape, width/height_px, rotation, table_number, color, sort_order, meni position na DOUBLE). Pridava room_id FK do `event_guest` a `event_space`.
   - **Version20260325133728.php** - Pridava `is_locked` (BOOLEAN, default false) do `event_table` a `floor_plan_element`.
   - **Version20260325133741.php** - Prazdna migrace (zadne operace).

### Stredni priorita (chybejici features)

5. **~~Room polygon editor~~** ✅ HOTOVO
   - Pridana sekce "Tvar mistnosti" do RoomFormDialog s PolygonDrawerem
   - Podporuje kresleni, editaci bodu (drag), mazani bodu (dblclick), vkladani bodu (klik na hranu)

6. **~~Template designer~~** ✅ HOTOVO
   - Nova stranka `/venue/templates/:id/designer` s vizualnim editorem
   - Plna podpora: stoly, elementy, polygony, lock/unlock, room selector
   - Tlacitko "Designer" na kartach sablon v FloorPlanTemplatesPage

7. **~~Validace kapacity~~** ✅ HOTOVO
   - handleAssignGuest nyni kontroluje kapacitu a zobrazi toast pri preplneni
   - Badge v sidebaru cervene zvyrazneni pri plnem stolu

8. **~~Seating diagram~~** ✅ HOTOVO
   - Vizualni sedadla kolem stolu (krouzky) - plne modre = obsazene, prazdne = volne
   - Podporuje kulaty, ovalny (radialni rozmisteni) i obdelnikovy stul (po obvodu)

### Nizka priorita (polish)

9. **~~Refaktor FloorPlanEditorManager~~** ✅ HOTOVO
   - Extrahovan `useFloorPlanState` hook (state + handlery, ~280 radku)
   - `FloorPlanEditorManager` je nyni jen UI vrstva (~250 radku)

10. **~~Grid snap~~** ✅ HOTOVO - snapToGrid() uz bylo implementovano v TableShape i ElementShape

11. **~~Collision detection~~** ✅ HOTOVO
    - AABB detekce prekryvu v FloorPlanEditor (tablesOverlap + collidingTableIds)
    - Cerveny obrys na kolidujicich stolech

12. **~~Unsaved changes warning~~** ✅ HOTOVO - beforeunload handler pridany pri isDirty

13. **~~Editace polygonu~~** ✅ HOTOVO
    - Drag bodů pro přesun, dblclick pro smazání, klik na hranu pro přidání nového bodu
    - Min. 3 body kontrola, grid snap na drag

14. **~~Hardcoded hodnoty~~** ✅ HOTOVO
    - Vytvoreny `constants.ts` s DEFAULT_CAPACITY, DEFAULT_TABLE_SIZE, DEFAULT_ELEMENT_SIZE
    - GRID_SIZE, MIN_ZOOM, MAX_ZOOM, CM_TO_PX_RATIO exportovany ze sdileneho souboru
    - FloorPlanEditor a FloorPlanEditorManager pouzivaji konstanty

## Klicove soubory

### Backend
- `api/src/Entity/EventTable.php` - Entita stolu
- `api/src/Entity/FloorPlanElement.php` - Entita elementu
- `api/src/Entity/FloorPlanTemplate.php` - Sablony
- `api/src/Entity/Building.php`, `Room.php` - Budovy a mistnosti
- `api/src/Controller/VenueController.php` - CRUD API
- `api/src/Controller/EventController.php` - Floor plan endpointy (radky ~3810-4200)

### Frontend - Editor
- `client/src/modules/events/components/floor-plan/FloorPlanEditorManager.tsx` - Hlavni manager
- `client/src/modules/events/components/floor-plan/canvas/FloorPlanEditor.tsx` - Konva Stage
- `client/src/modules/events/components/floor-plan/canvas/TableShape.tsx` - Tvary stolu
- `client/src/modules/events/components/floor-plan/canvas/ElementShape.tsx` - Tvary elementu
- `client/src/modules/events/components/floor-plan/canvas/FloorPlanSidebar.tsx` - Guest sidebar
- `client/src/modules/events/components/floor-plan/canvas/TableDetailPopover.tsx` - POS
- `client/src/modules/events/components/tabs/TablesTab.tsx` - Tab stolu v eventu

### Frontend - Venue
- `client/src/modules/venue/pages/BuildingsPage.tsx`
- `client/src/modules/venue/pages/FloorPlanTemplatesPage.tsx`

### Typy
- `shared/types.ts` (radky ~597-899)
