# Folklore Garden Admin - Kompletní dokumentace systému

Tato dokumentace slouží jako znalostní báze pro AI chatbota, který pomáhá uživatelům s orientací v administračním systému Folklore Garden.

---

## Obsah

1. [Přehled systému](#1-přehled-systému)
2. [Přihlášení a uživatelský účet](#2-přihlášení-a-uživatelský-účet)
3. [Dashboard (Přehled)](#3-dashboard-přehled)
4. [Rezervace](#4-rezervace)
5. [Akce (Events)](#5-akce-events)
6. [Platby](#6-platby)
7. [Faktury](#7-faktury)
8. [Adresář (Kontakty)](#8-adresář-kontakty)
9. [Jídla (Menu)](#9-jídla-menu)
10. [Nápoje (Drinks)](#10-nápoje-drinks)
11. [Cenník](#11-cenník)
12. [Sklad](#12-sklad)
13. [Receptury](#13-receptury)
14. [Partneři](#14-partneři)
15. [Vouchery](#15-vouchery)
16. [Provize](#16-provize)
17. [Personál](#17-personál)
18. [Docházka personálu](#18-docházka-personálu)
19. [Vzorce pro personál](#19-vzorce-pro-personál)
20. [Pokladna](#20-pokladna)
21. [Doprava](#21-doprava)
22. [Areál (Venue)](#22-areál-venue)
23. [Správa systému (Admin)](#23-správa-systému-admin)
24. [Číselníky a nastavení](#24-číselníky-a-nastavení)
25. [Oprávnění a role](#25-oprávnění-a-role)

---

## 1. Přehled systému

Folklore Garden Admin je komplexní administrační systém pro správu folklórní zahrady. Systém pokrývá:

- **Rezervace** - správa zákaznických rezervací na kulturní programy
- **Akce** - plánování a řízení eventů (folklorní show, svatby, firemní akce, soukromé akce)
- **Finance** - platby, faktury, pokladna, provize
- **Personál** - evidence zaměstnanců, docházka, výplaty
- **Sklad** - skladové hospodářství, receptury, požadavky na zásoby
- **Catering** - jídelní menu, nápoje, cenové politiky
- **Areál** - budovy, místnosti, rozložení stolů (floor plany)
- **Partneři** - hotelové recepce, distributoři, provizní systém
- **Doprava** - přepravní společnosti, vozidla, řidiči

Systém je dostupný přes webový prohlížeč. Po přihlášení se zobrazí boční navigační panel (sidebar) s přístupem ke všem modulům podle oprávnění uživatele.

---

## 2. Přihlášení a uživatelský účet

### Přihlášení
- **Kde:** Na přihlašovací stránce `/login`
- **Co potřebuji:** E-mail a heslo
- **Postup:** Zadejte e-mail a heslo, klikněte na "Přihlásit se"
- Po úspěšném přihlášení jste přesměrováni na Dashboard

### Zapomenuté heslo
- **Kde:** Odkaz "Zapomněli jste heslo?" na přihlašovací stránce (`/forgot-password`)
- **Postup:** Zadejte svůj e-mail, systém vám pošle odkaz pro reset hesla
- Odkaz je platný 1 hodinu
- Po kliknutí na odkaz v e-mailu nastavíte nové heslo na stránce `/reset-password`

### Profil uživatele
- **Kde:** Klikněte na své jméno v pravém horním rohu → "Profil" (`/profile`)
- **Co můžete změnit:** E-mail, heslo
- Pro změnu hesla je nutné zadat aktuální heslo

### Registrace
- **Kde:** `/register` - pouze pokud je registrace povolena
- Nové uživatele obvykle zakládá administrátor (viz sekce Správa systému)

---

## 3. Dashboard (Přehled)

- **Kde:** Hlavní stránka po přihlášení (`/`)
- **K čemu slouží:** Rychlý přehled o stavu podnikání

### Co na Dashboardu najdete:

**Statistické karty (nahoře):**
- **Celkový počet rezervací** - rozděleno na budoucí a minulé
- **Celkové tržby** - součet zaplacených rezervací
- **Složení hostů** - počty dospělých, dětí (3-12 let) a kojenců (0-2 roky)
- **Nejpopulárnější data** - nejžádanější termíny

**Grafy a analýzy (záložky):**
1. **Měsíční trendy** - sloupcový graf počtu rezervací a čárový graf tržeb po měsících
2. **Složení hostů** - koláčový graf rozložení podle věkových kategorií
3. **Stav rezervací** - přehled podle statusů (potvrzené, zaplacené, čekající atd.)
4. **Analýza po dnech** - detailní pohled na jednotlivé dny

**Další informace:**
- Seznam 5 nejnovějších rezervací
- Top dny podle počtu budoucích rezervací

---

## 4. Rezervace

- **Kde:** Boční menu → "Rezervace" (`/reservations`)
- **K čemu slouží:** Kompletní správa zákaznických rezervací

### Seznam rezervací

**Co vidíte v tabulce:**
- Jméno kontaktní osoby
- E-mail a telefon
- Datum a čas rezervace
- Počet osob
- Status rezervace (barevný štítek)

**Statusy rezervací:**
- **RECEIVED** (Přijato) - nová rezervace
- **WAITING_PAYMENT** (Čeká na platbu) - odeslaná platební výzva
- **PAID** (Zaplaceno) - platba přijata
- **CONFIRMED** (Potvrzeno) - rezervace potvrzena
- **CANCELLED** (Zrušeno) - stornovaná rezervace

**Dostupné akce:**
- **Vyhledávání** - fulltextové hledání v seznamu
- **Filtrování** - podle statusu, data apod.
- **Nová rezervace** - tlačítko "Nová rezervace" → formulář `/reservations/new`
- **Zobrazit detail** - kliknutí na řádek otevře dialog s detaily
- **Upravit** - tlačítko tužky → editační formulář `/reservations/:id/edit`
- **Smazat** - tlačítko koše (s potvrzením)
- **Odeslat platební e-mail** - odešle zákazníkovi výzvu k platbě

### Vytvoření / Úprava rezervace

**Formulář obsahuje sekce:**

1. **Kontaktní údaje**
   - Jméno, e-mail, telefon, národnost
   - Odkud zákazník přišel (client come from)
   - Poznámka

2. **Fakturační údaje** (volitelné)
   - Lze nastavit "Stejné jako kontakt" nebo zadat zvlášť
   - Firma, IČ, DIČ, fakturační e-mail, telefon
   - Fakturační adresa (ulice, město, PSČ, země)

3. **Transfer/Doprava**
   - Možnost přidat přepravu pro hosty
   - Počet osob k přepravě, adresa vyzvednutí

4. **Seznam osob**
   - Pro každou osobu: typ (dospělý/dítě/kojenec), menu, cena
   - Automatický výběr menu s cenou
   - Možnost přidat/odebrat osoby
   - Volba nápojového balíčku (žádný, uvítací drink, all-inclusive)

5. **Cenové údaje**
   - Celková cena (automaticky počítaná)
   - Záloha (procento a částka)
   - Platební metoda
   - Status platby

6. **Status a typ**
   - Status rezervace
   - Typ rezervace (dle číselníku)

**AI asistent:** Systém nabízí možnost vložit text rezervace a automaticky ho zpracovat pomocí AI do strukturovaného formuláře.

---

## 5. Akce (Events)

- **Kde:** Boční menu → "Akce" (`/events`)
- **K čemu slouží:** Plánování, organizace a řízení všech typů akcí

### Seznam akcí

**Co vidíte v tabulce:**
- Název akce
- Typ akce (barevný štítek)
- Datum konání
- Přiřazené prostory/místnosti
- Organizátor
- Počet hostů (placení / zdarma)
- Status

**Typy akcí:**
- **Folklorní show** - pravidelné kulturní programy
- **Svatba** - svatební akce
- **Event** - obecný event
- **Soukromá akce (Privát)** - soukromé akce na objednávku

**Statusy akcí:**
- **DRAFT** (Návrh) - rozpracovaná akce
- **PLANNED** (Naplánováno) - schválený plán
- **CONFIRMED** (Potvrzeno) - potvrzená akce
- **IN_PROGRESS** (Probíhá) - aktuálně probíhající
- **COMPLETED** (Dokončeno) - ukončená akce
- **CANCELLED** (Zrušeno) - stornovaná

**Filtrování a řazení:**
- Vyhledávání podle názvu
- Filtr podle statusu
- Filtr podle typu akce
- Časové filtry: Nejbližší, Nadcházející, Minulé, Všechny
- Hromadné akce (pouze pro adminy): změna statusu, typu, smazání

### Vytvoření / Úprava akce

Editační formulář má **9 záložek (tabů)**:

#### Záložka 1: Základní info
- Název akce
- Datum a čas konání
- Délka trvání (v minutách, výchozí 120)
- Typ akce
- Status
- Přiřazené prostory (výběr z místností areálu)
- Jazyk akce
- Organizátor (firma, kontaktní osoba, e-mail, telefon)
- Fakturační údaje organizátora
- Interní poznámky, poznámky pro personál, speciální požadavky

#### Záložka 2: Hosté
- Seznam hostů s údaji: jméno, příjmení, národnost, typ (dospělý/dítě)
- Rozlišení placených a neplacených hostů
- Přiřazení hostů ke stolům a prostorům
- Příchod/prezence (check-in)
- Výběr menu pro každého hosta

#### Záložka 3: Menu (Jídlo)
- Seznam jídel pro akci
- Pro každé jídlo: název, počet porcí, cena za porci, celková cena
- Čas servírování
- Poznámky k jídlu
- Propojení s recepturami a skladem

#### Záložka 4: Nápoje
- Seznam nápojů pro akci
- Pro každý nápoj: název, množství, jednotka, cena za jednotku
- Celková cena nápojů
- Poznámky

#### Záložka 5: Harmonogram (Schedule)
- Časový program akce
- Pro každou položku: čas, trvání, aktivita, popis, zodpovědná osoba
- Poznámky k jednotlivým bodům programu

#### Záložka 6: Stoly a zasedací pořádek
- Vizuální rozmístění stolů na plánku místnosti
- Drag-and-drop přesun stolů
- Pro každý stůl: název, kapacita, tvar (kulatý, obdélníkový, oválný, čtvercový)
- Přiřazení hostů ke stolům
- Barvy stolů, čísla stolů
- Uzamčení pozice stolu
- Možnost načíst šablonu rozložení

#### Záložka 7: Personál
- Přiřazení zaměstnanců k akci
- Pro každého: role, status přiřazení, odpracované hodiny
- Status docházky (PENDING, CONFIRMED, ATTENDED)
- Platební status (PENDING, PAID)
- Doporučení počtu personálu podle vzorců

#### Záložka 8: Finance
- Celkový příjem z akce
- Výdaje (catering, personál, další náklady)
- Provize za catering (procento i částka)
- Záloha a stav její úhrady
- Způsob platby
- Vyúčtování akce

#### Záložka 9: Doprava
- Přepravní přiřazení pro akci
- Přepravní společnost, vozidlo, řidič
- Čas, místo vyzvednutí a doručení
- Počet cestujících
- Cena a stav platby
- Číslo faktury

**Plovoucí panel poznámek:** K akci lze zapisovat interní poznámky a poznámky pro personál, které jsou přístupné z jakékoliv záložky.

### Event Dashboard

- **Kde:** Na detailu akce tlačítko "Dashboard" (`/events/:id/dashboard`)
- **K čemu slouží:** Operativní řízení probíhající akce

**Obsahuje karty (drag-and-drop přesouvatelné):**
- **Guest Command Center** - check-in hostů, statistiky prezence, rozložení podle národností
- **Staff Planning** - přehled potřebného a přiřazeného personálu
- **Transport** - přehled přepravy
- **Stock Requirements** - potřebné zásoby ze skladu
- **Expense Tracker** - sledování nákladů
- **Settlement Card** - finanční vyúčtování
- **Quick Actions** - rychlé akce (změna statusu, odeslání notifikací)

### Waiter View (Pohled číšníka)

- **Kde:** `/events/:id/waiter`
- **K čemu slouží:** Zjednodušený pohled pro obsluhující personál během akce

**Režimy zobrazení:**
1. **Floor plan** - vizuální pohled na rozložení stolů s přiřazením hostů
2. **Seznam stolů** - scrollovatelný seznam všech stolů
3. **Timeline** - harmonogram akce se shrnutím menu

**Funkce:**
- Automatické obnovování dat každých 30 sekund
- Celkové počty hostů a rozložení podle národností
- Přehled nepřiřazených hostů

---

## 6. Platby

- **Kde:** Boční menu → "Platby" (`/payments`)
- **K čemu slouží:** Sledování plateb přes platební bránu Comgate

### Co vidíte na stránce:

**Statistické karty:**
- Celkový počet plateb
- Počet zaplacených
- Celková částka

**Tabulka plateb:**
- ID platby
- ID transakce (z Comgate)
- Částka
- Status platby
- Propojená rezervace a kontaktní jméno
- Datum vytvoření

**Statusy plateb:**
- **CREATED** - platba vytvořena
- **PENDING** - čeká na zpracování
- **PAID** - zaplaceno
- **CANCELLED** - zrušeno
- **AUTHORIZED** - autorizováno

**Filtry:**
- Vyhledávání podle ID transakce nebo reference rezervace
- Filtr podle statusu
- Filtr podle datového rozsahu (od-do)
- Stránkování s nastavitelným počtem položek na stránku

**Detail platby (dialog):**
- Informace o platbě (transakce, status, částka, data)
- Propojená rezervace (kontakt, osoby, celková cena)
- Odkaz na rezervaci

### Jak platba funguje:
1. V systému se k rezervaci vytvoří platba přes Comgate (tlačítko v rezervaci)
2. Zákazník je přesměrován na platební bránu
3. Po zaplacení systém automaticky obdrží notifikaci (webhook)
4. Status platby se aktualizuje a projeví se i na rezervaci

---

## 7. Faktury

- **Kde:** Boční menu → "Faktury" (`/invoices`)
- **K čemu slouží:** Vytváření a správa faktur

### Seznam faktur

**Co vidíte:**
- Číslo faktury (automaticky generované)
- Datum vystavení a splatnosti
- Status faktury
- Celková částka
- Propojená rezervace/akce

**Statusy faktur:**
- **DRAFT** (Návrh) - rozpracovaná, lze editovat
- **SENT** (Odeslaná) - odeslaná zákazníkovi
- **PAID** (Zaplacená) - uhrazená
- **CANCELLED** (Stornovaná) - zrušená

**Typy faktur:**
- **DEPOSIT** - zálohová faktura
- **FINAL** - konečná faktura
- **PARTIAL** - dílčí faktura

### Vytvoření / Úprava faktury (`/invoices/new`, `/invoices/:id/edit`)

**Faktura obsahuje:**
- **Dodavatel** (automaticky z nastavení firmy): název, adresa, IČ, DIČ, bankovní spojení
- **Odběratel:** jméno/firma, adresa, IČ, DIČ, e-mail, telefon
- **Položky faktury:** řádky s popisem, množstvím, cenou za jednotku, celkovou cenou
- **Finanční údaje:** mezisoučet, DPH (sazba a částka), celkem, měna (CZK)
- **Datum vystavení, zdanitelné plnění, splatnost**
- **Variabilní symbol**
- **QR kód pro platbu** (automaticky generovaný)

**Akce:**
- Vytvořit novou fakturu
- Upravit fakturu (pouze ve stavu DRAFT)
- Smazat fakturu (pouze DRAFT a CANCELLED)
- Hromadná změna statusu
- Hromadné smazání

**Číslování faktur:**
- Systém automaticky generuje čísla ve formátu: prefix + pořadové číslo (např. FG2024001)
- Zálohové faktury mají vlastní prefix (např. ZF2024001)
- Nastavení prefixů a počátečních čísel v nastavení firmy

---

## 8. Adresář (Kontakty)

- **Kde:** Boční menu → "Adresář" (`/contacts`)
- **K čemu slouží:** Databáze zákazníků a kontaktů (CRM)

### Co vidíte v seznamu:
- Jméno kontaktu
- E-mail a telefon
- Firma
- Fakturační údaje (pokud se liší od kontaktu)

### Dostupné akce:

**Přidat kontakt:**
- Klikněte na "Nový kontakt" - otevře se dialog s formulářem
- Pole: Jméno, e-mail, telefon, firma, poznámka
- Volitelné fakturační údaje: firma, IČ, DIČ, e-mail, telefon
- Odkud klient přišel (zdroj)
- Fakturační adresa (ulice, město, PSČ, země)

**Importovat z rezervací:**
- Tlačítko "Načíst z rezervací" - automaticky vytvoří kontakty ze stávajících rezervací
- Systém deduplikuje podle e-mailu, telefonu a kombinace jméno+firma
- Vrátí počet vytvořených a aktualizovaných kontaktů

**Další akce:**
- Upravit kontakt
- Smazat kontakt
- Vytvořit novou rezervaci pro daný kontakt (přesměrování s předvyplněnými údaji)
- Vyhledávání v kontaktech
- Zobrazení rezervací kontaktu

---

## 9. Jídla (Menu)

- **Kde:** Boční menu → "Jídla" (`/foods`)
- **K čemu slouží:** Správa nabídky jídel pro rezervace a akce

### Seznam jídel

**Co vidíte:**
- Název jídla
- Popis
- Základní cena
- Příplatek (surcharge)
- Označení dětského menu
- Externí ID (pro propojení s externími systémy)

### Vytvoření / Úprava jídla (`/foods/new`, `/foods/:id/edit`)

**Formulář:**
- Název jídla
- Popis
- Základní cena (v CZK)
- Příplatek - dodatečná cena nad základní
- Dětské menu - zaškrtávací políčko (ano/ne)
- Externí ID - identifikátor pro propojení s jinými systémy

**Akce:**
- Přidat nové jídlo
- Upravit jídlo
- Smazat jídlo
- Hromadné smazání (pouze super admin)
- Vyhledávání a filtrování

### Předdefinované menu (FoodMenu enum):
Systém obsahuje předdefinované varianty menu s cenami:
- **Standardní (0 Kč příplatek):** Tradiční, Kuřecí, Vegetariánské
- **Speciální (75 Kč příplatek):** Semi-košer, Vepřové koleno, Kachna, Kuřecí halal, Losos, Pstruh

### Cenové přepisování jídel
- Systém umožňuje nastavit cenové přepisy pro konkrétní data (např. sezónní ceny)
- Lze nastavit dostupnost jídel podle datového rozsahu (např. sezónní nabídka)
- Viz API endpointy `/api/food-pricing/overrides` a `/api/food-pricing/availability`

### Párování jídel s nápoji
- Ke každému jídlu lze přiřadit doporučené nápoje
- Párování může být: výchozí, v ceně, s příplatkem
- Správa přes sekci Nápoje

---

## 10. Nápoje (Drinks)

- **Kde:** Boční menu → "Nápoje" (`/drinks`)
- **K čemu slouží:** Správa nápojového lístku

### Seznam nápojů

**Co vidíte:**
- Název nápoje
- Kategorie
- Cena
- Alkoholický/nealkoholický
- Popis
- Pořadí zobrazení
- Aktivní/neaktivní

### Vytvoření / Úprava nápoje

**Formulář:**
- Název (povinné)
- Kategorie (např. víno, pivo, nealko, destiláty)
- Cena
- Alkoholický (ano/ne)
- Popis
- Pořadí zobrazení

**Hromadné akce:**
- Aktivovat / Deaktivovat vybrané nápoje
- Smazat vybrané

### Párování nápojů s jídly
- Ke každému jídlu lze přiřadit nápoje
- Nastavení: výchozí párování, zahrnutí v ceně, příplatek
- Endpoint: `/api/drinks/pairings`
- Zobrazení doporučených nápojů k jídlu: `/api/drinks/for-food/{foodId}`

---

## 11. Cenník

- **Kde:** Boční menu → "Cenník" (`/pricing`)
- **K čemu slouží:** Nastavení výchozích cen a cenových přepisů

### Výchozí ceny

**Nastavitelné položky:**
- **Cena pro dospělé** - výchozí cena za dospělou osobu
- **Cena pro děti (3-12 let)** - výchozí cena za dítě
- **Cena pro kojence (0-2 roky)** - výchozí cena za kojence
- **Včetně jídla** - zda je jídlo zahrnuto v ceně

### Datové přepisy cen

- Možnost nastavit odlišné ceny pro konkrétní data
- Použití: sezónní ceny, speciální akce, svátky
- Pro každý přepis: datum, ceny (dospělý/dítě/kojenec), důvod

**Jak cenový systém funguje:**
1. Systém nejprve zkontroluje, zda existuje cenový přepis pro dané datum
2. Pokud ano, použije přepis
3. Pokud ne, použije výchozí ceny
4. Partnerské ceny mohou dále modifikovat finální cenu (viz Partneři)

---

## 12. Sklad

### 12.1 Skladové položky

- **Kde:** Boční menu → "Sklad" → "Skladové položky" (`/stock-items`)
- **K čemu slouží:** Evidence zásob a inventáře

**Co vidíte v seznamu:**
- Název položky a popis
- Dostupné množství
- Minimální množství (prahová hodnota pro upozornění)
- Jednotka (kg, l, ks, g atd.)
- Cena za jednotku
- Dodavatel

**Upozornění na nízký stav:**
- Nahoře na stránce se zobrazuje karta s položkami pod minimálním množstvím
- Tyto položky jsou barevně zvýrazněné

**Formulář položky:**
- Název (s automatickým doplňováním z receptur a existujících položek)
- Popis
- Jednotka (výběr: kg, l, ks, g atd.)
- Dostupné množství
- Minimální množství
- Cena za jednotku
- Dodavatel (s automatickým doplňováním)

**Hromadné akce (admin):**
- Změna dodavatele
- Smazání položek

### 12.2 Pohyby skladu

- **Kde:** Boční menu → "Sklad" → "Pohyby" (`/stock-movements`)
- **K čemu slouží:** Historie příjmů a výdejů ze skladu

**Typy pohybů:**
- **IN** - příjem zboží
- **OUT** - výdej zboží
- **ADJUSTMENT** - korekce/inventura

**Co vidíte:**
- Datum pohybu
- Skladová položka
- Typ pohybu
- Množství
- Důvod/poznámka
- Kdo pohyb provedl

### 12.3 Požadavky na zásoby

- **Kde:** Boční menu → "Sklad" → "Požadavky" (`/stock-requirements`)
- **K čemu slouží:** Automatický výpočet potřebných zásob na základě naplánovaných akcí

**Jak to funguje:**
1. Systém vezme naplánované akce v daném období
2. Podle receptur a počtu hostů vypočítá potřebné suroviny
3. Porovná s aktuálním stavem skladu
4. Zobrazí, co chybí

**Filtry:**
- Datum od-do (pro jaké období počítat)

### 12.4 Příjem zboží

- **Kde:** Boční menu → "Sklad" → "Příjem" (`/stock/receive`)
- **K čemu slouží:** Zápis nově přijatého zboží do skladu

---

## 13. Receptury

- **Kde:** Boční menu → "Receptury" (`/recipes`)
- **K čemu slouží:** Správa kuchařských receptur s vazbou na skladové položky

### Seznam receptur

**Co vidíte:**
- Název receptury
- Popis
- Počet porcí
- Hmotnost porce
- Počet ingrediencí
- Propojená jídla z menu

### Detail receptury (dialog)
- Tabulka ingrediencí: název suroviny, množství, jednotka, dodavatel, cena za jednotku
- Informace o porcích
- Seznam menu, která recepturu využívají

### Vytvoření / Úprava receptury

**Formulář:**
- Název
- Popis
- Počet porcí
- Hmotnost porce (g)
- Seznam ingrediencí - pro každou: skladová položka, množství

### Import z Excelu
- Tlačítko "Import z Excelu" na stránce receptur
- Nahraje soubor .xlsx nebo .xls
- Systém zpracuje receptury a ingredience
- Vrátí výsledek importu (kolik přidáno, kolik přeskočeno)

### Propojení receptur s menu
- Receptury lze propojit s jídly z nabídky
- Nastavení: kolik porcí receptury odpovídá jednomu servírování jídla
- Typ chodu (předkrm, hlavní chod, dezert atd.)

---

## 14. Partneři

- **Kde:** Boční menu → "Partneři" (`/partners`)
- **K čemu slouží:** Správa obchodních partnerů (hotely, recepce, distributoři)

### Seznam partnerů

**Co vidíte:**
- Název partnera
- Typ (Hotel, Recepce, Distributor, Ostatní)
- Kontaktní osoba a e-mail
- Cenový model (Default, Custom, Flat)
- Fakturační období (Za rezervaci, Měsíčně, Čtvrtletně)
- Výše provize (%)
- Aktivní/neaktivní

### Vytvoření / Úprava partnera (`/partners/new`, `/partners/:id/edit`)

**Formulář obsahuje:**

1. **Základní údaje:**
   - Název partnera (povinné)
   - Typ partnera (povinné): Hotel, Recepce, Distributor, Ostatní
   - Kontaktní osoba, e-mail, telefon
   - Adresa
   - IČ, DIČ
   - Bankovní účet
   - Poznámky
   - Aktivní (ano/ne)

2. **Cenový model:**
   - **Default** - používají se standardní ceny z cenníku
   - **Custom** - vlastní ceny menu (JSON konfigurace)
   - **Flat** - paušální cena za osobu (dospělý/dítě/kojenec zvlášť)

3. **Provizní nastavení:**
   - Výše provize (%)
   - Provize za osobu (fixní částka)
   - Způsob platby
   - Fakturační období (za rezervaci, měsíčně, čtvrtletně)
   - Fakturační e-mail
   - Fakturační údaje (firma, adresa)

4. **Detekce partnera:**
   - Detekční e-maily - seznam e-mailů, při jejichž použití se partner automaticky rozpozná
   - Detekční klíčová slova - klíčová slova pro automatické přiřazení

**Jak automatická detekce funguje:**
Když přijde nová rezervace, systém porovná e-mail a kontaktní údaje se seznamem detekčních pravidel. Pokud najde shodu, automaticky přiřadí partnera a aplikuje jeho cenový model.

**Další funkce:**
- Zobrazení rezervací partnera s přehledovými statistikami
- Výpočet cen podle cenového modelu partnera
- Hromadné akce: aktivace, deaktivace, smazání

---

## 15. Vouchery

- **Kde:** Boční menu → "Vouchery" (`/vouchers`)
- **K čemu slouží:** Správa slevových kódů a voucherů

### Seznam voucherů

**Co vidíte:**
- Kód voucheru (unikátní)
- Typ slevy
- Hodnota slevy
- Maximální počet použití
- Aktuální počet použití
- Platnost od-do
- Propojený partner
- Aktivní/neaktivní

### Vytvoření / Úprava voucheru

**Formulář:**
- Kód voucheru (unikátní textový kód)
- Typ voucheru (procentuální sleva, fixní částka apod.)
- Hodnota slevy
- Maximální počet použití
- Platnost od (datum)
- Platnost do (datum)
- Přiřazení k partnerovi
- Poznámky
- Aktivní (ano/ne)

### Detail voucheru
- Přehled základních údajů
- Historie uplatnění (kdo, kdy, jaká sleva, původní částka, konečná částka)

### Vouchery u akcí
- Vouchery lze přiřadit i přímo k akcím (v záložce Vouchery editace akce)
- Validace voucheru při akci s možností zaznamenání

---

## 16. Provize

- **Kde:** Boční menu → "Provize" (`/commission-logs`)
- **K čemu slouží:** Sledování a správa provizí partnerům

### Co vidíte v seznamu:
- Datum
- Název partnera
- Částka transakce (základ)
- Výše provize
- Přiřazený voucher (pokud byl použit)
- Status platby (Zaplaceno / Nezaplaceno)
- Datum zaplacení

### Statistické karty:
- **Celkem nezaplacené provize** - kolik dlužíte partnerům
- **Celkem zaplacené provize** - kolik už bylo vyplaceno
- **Celkový součet**

### Akce:
- **Označit jako zaplaceno** - u nezaplacených provizí tlačítko pro zaznamenání platby
- **Filtrování** - podle statusu platby (zaplaceno/nezaplaceno)
- **Vyhledávání** - podle jména partnera

---

## 17. Personál

- **Kde:** Boční menu → "Personál" → "Zaměstnanci" (`/staff`)
- **K čemu slouží:** Evidence zaměstnanců a externích pracovníků

### Seznam personálu

**Co vidíte:**
- Jméno a příjmení (nebo název skupiny/kapely)
- Pozice/role
- Kontakt (e-mail, telefon)
- Hodinová sazba a fixní sazba
- Aktivní/neaktivní
- Označení skupiny (s počtem členů)

**Vyhledávání:** Podle jména, e-mailu nebo pozice

### Vytvoření / Úprava zaměstnance (`/staff/new`, `/staff/:id/edit`)

**Záložka Profil:**

1. **Typ:**
   - Jednotlivec - standardní zaměstnanec
   - Skupina/Kapela - hudební skupina nebo tým s fixní cenou

2. **Základní údaje:**
   - Jméno, příjmení (u skupiny: název, kontaktní osoba, počet členů)
   - Pozice/role
   - Datum narození (pouze jednotlivci)

3. **Kontaktní údaje:**
   - E-mail, telefon, adresa
   - Kontakt na nouzovou osobu (pouze jednotlivci)

4. **Sazby:**
   - Hodinová sazba (Kč/hod)
   - Fixní sazba (Kč za akci)

5. **Poznámky a status:**
   - Textové poznámky
   - Aktivní/neaktivní přepínač

**Záložka Historie práce:**
- Souhrnné statistiky: celkem akcí, celkem hodin, celkem vyděláno, nezaplacené částky
- Tabulka přiřazení k akcím:
  - Datum akce, název, pozice, odpracované hodiny, částka
  - Status platby (zaplaceno / částečně / nezaplaceno)
  - Status docházky

### Hromadné akce (admin):
- Aktivace / deaktivace zaměstnanců
- Smazání

---

## 18. Docházka personálu

- **Kde:** Boční menu → "Personál" → "Docházka" (`/staff-attendance`)
- **K čemu slouží:** Evidence odpracovaných hodin a sledování plateb

### Co vidíte v seznamu:
- Datum
- Jméno zaměstnance
- Odpracované hodiny
- Vypočtená částka
- Propojená akce (pokud je)
- Poznámky
- Status platby (zaplaceno/nezaplaceno)
- Datum zaplacení

### Statistické karty:
- **Celkem nezaplacené hodiny** (s přepočtem na Kč)
- **Celkový počet záznamů**

### Přidání záznamu docházky

**Dialog obsahuje:**
- Výběr zaměstnance (z aktivních)
- Výběr akce (volitelné)
- Datum
- Odpracované hodiny
- Poznámky

**Automatický výpočet:**
- Systém automaticky vypočítá částku podle sazby zaměstnance a odpracovaných hodin

### Označení platby
- U každého záznamu tlačítko "Označit jako zaplaceno"
- Možnost přidat poznámku k platbě
- Automaticky se nastaví datum zaplacení

### Filtry:
- Podle statusu platby (zaplaceno/nezaplaceno)
- Vyhledávání podle jména zaměstnance

---

## 19. Vzorce pro personál

- **Kde:** Boční menu → "Personál" → "Vzorce" (`/staffing-formulas`)
- **K čemu slouží:** Automatický výpočet potřebného personálu podle počtu hostů

### Co vidíte:
- Kategorie personálu (číšníci, kuchaři, barmani, uklízeči atd.)
- Poměr (např. 1:25 = 1 osoba na 25 hostů)
- Popis
- Aktivní/neaktivní

### Jak to funguje:
1. Definujete vzorce pro každou kategorii personálu
2. Při plánování akce systém automaticky doporučí počet personálu
3. Např. pro akci se 100 hosty a poměrem 1:25 doporučí 4 číšníky

### Skupiny zobrazení:
- **Aktivní vzorce** - používané pro výpočty
- **Neaktivní vzorce** - pozastavené

### Statistické karty:
- Celkem vzorců
- Aktivních
- Neaktivních

### Akce:
- Přidat nový vzorec
- Upravit vzorec
- Smazat vzorec
- Zapnout/vypnout vzorec

---

## 20. Pokladna

- **Kde:** Boční menu → "Pokladna" (`/cashbox`)
- **K čemu slouží:** Správa hotovostních financí - hlavní pokladna a pokladny akcí

### Typy pokladen:

1. **Hlavní pokladna (MAIN)**
   - Jedna centrální pokladna pro celý provoz
   - Sleduje celkový hotovostní stav
   - Lze skrýt pro ne-adminovské uživatele (nastavení v CompanySettings)

2. **Pokladny akcí (EVENT)**
   - Automaticky vytvořená pokladna pro každou akci
   - Oddělené finance pro konkrétní event
   - Po ukončení akce se uzavře a zůstatek převede do hlavní pokladny

### Funkce hlavní pokladny:

**Přehled:**
- Aktuální zůstatek
- Počáteční zůstatek
- Stav (otevřená/uzavřená/zamčená)

**Pohyby (příjmy a výdaje):**
- Typ pohybu: INCOME (příjem) nebo EXPENSE (výdej)
- Kategorie (z číselníku kategorií)
- Částka a měna (CZK)
- Popis
- Způsob platby
- Reference (např. číslo rezervace)
- Propojení se zaměstnancem nebo akcí
- Kdo pohyb vytvořil

**Úprava zůstatku:**
- Pouze super admin
- Zadáte nový zůstatek a důvod
- Vytvoří se auditní záznam

**Finanční report:**
- Filtr podle data (od-do)
- Souhrn příjmů a výdajů za období
- Detail jednotlivých pohybů

### Funkce pokladny akce:

- Stejné jako hlavní pokladna, ale omezené na jednu akci
- Převody mezi pokladnami (z akce do hlavní a zpět)
- Vyúčtování po akci

### Převody mezi pokladnami:
- Lze převádět peníze z hlavní pokladny do pokladny akce a zpět
- Status převodu: PENDING → CONFIRMED / REJECTED
- Auditní záznam o každém převodu

### Uzávěrka pokladny:
- Očekávaný stav (součet pohybů)
- Skutečný stav (napočítané hotovosti)
- Rozdíl (manko/přebytek)
- Poznámky
- Kdo uzávěrku provedl

### Auditní log:
- Každá operace s pokladnou je zaznamenána
- Typ akce, entita, změněná data (JSON)
- Popis, IP adresa, kdo provedl, kdy

### Mazání akce s pokladnou:
- Pokud má akce pokladnu s nenulovým zůstatkem, nelze ji jednoduše smazat
- Admin může provést "force delete" - zůstatek se přesune do hlavní pokladny
- Musí být nulový počet nedokončených převodů

---

## 21. Doprava

- **Kde:** Boční menu → "Doprava" (`/transport`)
- **K čemu slouží:** Správa přepravních společností, vozidel a řidičů

### Přepravní společnosti (`/transport`)

**Co vidíte:**
- Název společnosti
- Kontaktní osoba, e-mail, telefon
- Adresa
- IČ, DIČ
- Bankovní účet
- Aktivní/neaktivní
- Počet vozidel a řidičů
- Statistiky (počet přeprav)

### Vytvoření / Úprava společnosti (`/transport/new`, `/transport/:id/edit`)

**Formulář:**
- Název firmy
- Kontaktní osoba
- E-mail, telefon
- Adresa
- IČ, DIČ
- Bankovní účet
- Aktivní (ano/ne)
- Poznámky

### Vozidla
- Seznam vozidel přepravní společnosti
- Pro každé vozidlo: SPZ (unikátní), typ (BUS, VAN atd.), značka, model, kapacita, barva, rok výroby
- Aktivní/neaktivní

### Řidiči
- Seznam řidičů přepravní společnosti
- Pro každého řidiče: jméno, příjmení, telefon, e-mail, číslo ŘP, kategorie ŘP
- Aktivní/neaktivní

### Přiřazení dopravy:
- K rezervacím (záložka Transfer v editaci rezervace)
- K akcím (záložka Doprava v editaci akce)
- Výběr: společnost → vozidlo → řidič → čas → místa → cena

---

## 22. Areál (Venue)

### 22.1 Budovy a místnosti

- **Kde:** Boční menu → "Areál" → "Budovy" (`/venue/buildings`)
- **K čemu slouží:** Evidence prostor pro konání akcí

**Budovy:**
- Název, popis, pořadí, aktivní/neaktivní
- Každá budova obsahuje seznam místností

**Místnosti:**
- Název, barva (pro vizuální rozlišení)
- Rozměry (šířka × výška v metrech) - důležité pro floor plany
- Kapacita
- Tvarová data (JSON pro složité tvary)
- Pořadí zobrazení

**Akce:**
- Přidat budovu / místnost
- Upravit / smazat (s upozorněním na kaskádové mazání)

### 22.2 Šablony floor planů

- **Kde:** Boční menu → "Areál" → "Šablony" (`/venue/templates`)
- **K čemu slouží:** Předdefinované rozložení stolů a prvků pro akce

**Seznam šablon:**
- Název šablony
- Popis
- Přiřazená místnost
- Výchozí šablona (ano/ne)
- Kdo vytvořil, kdy

**Akce:**
- Vytvořit novou šablonu
- Upravit šablonu
- Smazat šablonu
- Označit jako výchozí

### 22.3 Designér šablon

- **Kde:** Kliknutí na "Upravit" u šablony (`/venue/templates/:id/designer`)
- **K čemu slouží:** Vizuální editor pro rozložení stolů a prvků

**Funkce:**
- Drag-and-drop umisťování stolů
- Různé tvary stolů (kulaté, obdélníkové, oválné, čtvercové)
- Vizualizace rozměrů místnosti
- Přidávání dalších prvků (podium, bar, dekorace)
- Otočení prvků
- Uzamčení pozice
- Barevné rozlišení
- Uložení jako šablona pro opakované použití

---

## 23. Správa systému (Admin)

### 23.1 Uživatelé

- **Kde:** Boční menu → "Správa" → "Uživatelé" (`/users`)
- **Oprávnění:** `users.read`, `users.create`, `users.update`
- **K čemu slouží:** Správa uživatelských účtů

**Co vidíte:**
- Uživatelské jméno, e-mail
- Role (přiřazené)
- Super admin (ano/ne)
- Poslední přihlášení (datum, IP adresa)

**Akce:**
- Vytvořit uživatele (e-mail + heslo, povinné)
- Upravit uživatele (jméno, e-mail, heslo, role)
- Smazat uživatele

### 23.2 Role

- **Kde:** Boční menu → "Správa" → "Role" (`/roles`)
- **Oprávnění:** `permissions.read`, `permissions.update`
- **K čemu slouží:** Definice rolí a přiřazení oprávnění

**Co vidíte:**
- Název role, zobrazované jméno, popis
- Priorita
- Systémová role (nelze smazat)
- Seznam přiřazených oprávnění

**Akce:**
- Vytvořit novou roli
- Upravit roli (u systémových rolí pouze oprávnění)
- Smazat vlastní role
- Přiřadit oprávnění k roli

### 23.3 Nastavení firmy

- **Kde:** Boční menu → "Správa" → "Nastavení" (`/settings`)
- **K čemu slouží:** Konfigurace firemních údajů a systémových parametrů

**Záložka Firma:**
- Název firmy
- IČ, DIČ
- Adresa (ulice, město, PSČ, země)
- E-mail, telefon, web
- Logo (base64)
- Registrační informace
- Plátce DPH (ano/ne)

**Záložka Bankovní údaje:**
- Číslo bankovního účtu
- Kód banky
- Název banky
- IBAN
- SWIFT

**Záložka Fakturace:**
- Prefix faktur (výchozí: "FG")
- Další číslo faktury
- Prefix zálohových faktur (výchozí: "ZF")
- Další číslo zálohové faktury
- Splatnost (dní, výchozí: 14)
- Výchozí sazba DPH (%, výchozí: 21)
- Patička faktur (text)
- Skrytí hlavní pokladny (pro ne-adminy)

---

## 24. Číselníky a nastavení

### 24.1 Typy rezervací

- **Kde:** Boční menu → "Správa" → "Typy rezervací" (`/reservation-types`)
- **K čemu slouží:** Definice kategorií rezervací

**Pro každý typ:**
- Název
- Kód (unikátní, neměnný po vytvoření)
- Barva (pro vizuální rozlišení)
- Pořadí zobrazení
- Poznámka
- Systémový typ (nelze smazat)

### 24.2 Kategorie pokladny

- **Kde:** Boční menu → "Správa" → "Kategorie pokladny" (`/cash-categories`)
- **K čemu slouží:** Definice kategorií příjmů a výdajů v pokladně

**Typy kategorií:**
- **INCOME** - příjmové kategorie (tržby, přijaté zálohy, provize atd.)
- **EXPENSE** - výdajové kategorie (nákup surovin, mzdy, nájem atd.)
- **BOTH** - použitelné pro obojí

**Automatické řazení:** Podle frekvence použití (nejčastěji používané nahoře)

### 24.3 Blokovaná data

- **Kde:** Boční menu → "Správa" → "Blokovaná data" (`/disabled-dates`)
- **K čemu slouží:** Zablokování dat, kdy nelze vytvářet rezervace

**Pro každé blokované období:**
- Datum od-do (nebo jeden den)
- Důvod blokace
- Projekt (volitelné - např. "rekonstrukce kuchyně")

### 24.4 Tagy akcí

Automatický systém štítků pro kategorizaci akcí:
- Tagy se vytvářejí automaticky při použití
- Řazení podle popularity (počet použití)
- Vyhledávání a autocomplete při přidávání tagů k akci

---

## 25. Oprávnění a role

### Jak systém oprávnění funguje

Systém používá hierarchický model oprávnění:

1. **Oprávnění (Permission)** - atomická jednotka, definuje jednu akci v jednom modulu
   - Formát: `modul.akce` (např. `reservations.read`, `events.create`)
   - Akce: `read`, `create`, `update`, `delete`

2. **Role** - sada oprávnění
   - Můžete vytvořit vlastní role s libovolnou kombinací oprávnění
   - Systémové role nelze smazat (pouze upravit oprávnění)

3. **Uživatel** - může mít:
   - Jednu nebo více rolí (dědí všechna oprávnění rolí)
   - Individuální oprávnění navíc (grant/revoke)
   - Status **Super Admin** = všechna oprávnění

### Moduly oprávnění:
- `reservations` - Rezervace
- `events` - Akce
- `payments` - Platby
- `invoices` - Faktury
- `contacts` - Kontakty
- `foods` - Jídla
- `drinks` - Nápoje
- `stock_items` - Sklad
- `stock_movements` - Pohyby skladu
- `recipes` - Receptury
- `partners` - Partneři
- `vouchers` - Vouchery
- `staff` - Personál
- `staffing_formulas` - Vzorce personálu
- `cashbox` - Pokladna
- `transport` - Doprava
- `users` - Uživatelé
- `permissions` - Oprávnění
- `reservation_types` - Typy rezervací
- `reservation_foods` - Jídla rezervací
- `food_pricing` - Cenové přepisy jídel
- `disabled_dates` - Blokovaná data

### Speciální role:
- **ROLE_ADMIN** - administrátor (může registrovat nové uživatele)
- **ROLE_SUPER_ADMIN** - super administrátor (má přístup ke všemu, hromadné operace, force delete, úpravy zůstatků)

### Matice oprávnění:
- Pro každého uživatele lze zobrazit matici oprávnění (`/api/permissions/users/{id}/matrix`)
- Matice ukazuje zdroj každého oprávnění (z které role pochází, nebo zda je individuální)

---

## Časté otázky a postupy

### Jak založit pokladnu?
Hlavní pokladna se inicializuje automaticky při prvním přístupu do sekce Pokladna. Pokladny akcí se vytvářejí automaticky s každou novou akcí. Nastavení hlavní pokladny (skrytí pro ne-adminy) je v **Správa → Nastavení → záložka Fakturace**.

### Jak vytvořit rezervaci z webu?
Rezervace z webu přicházejí automaticky přes API (`source: "WEB"`). V administraci je můžete vytvářet ručně přes **Rezervace → Nová rezervace** (`source: "ADMIN"`).

### Jak odeslat platební odkaz zákazníkovi?
V seznamu rezervací u příslušné rezervace klikněte na tlačítko pro odeslání platebního e-mailu. Systém vytvoří platbu v Comgate a odešle zákazníkovi e-mail s odkazem na platební bránu.

### Jak vystavit fakturu k rezervaci?
**Faktury → Nová faktura** → vyberte rezervaci. Systém automaticky vyplní odběratele a položky. Zálohovou fakturu vystavíte volbou typu DEPOSIT.

### Jak přidat nového zaměstnance?
**Personál → Zaměstnanci → Nový zaměstnanec**. Vyplňte profil, nastavte hodinovou nebo fixní sazbu. Pro hudební skupiny/kapely zvolte typ "Skupina".

### Jak sledovat odpracované hodiny?
**Personál → Docházka** - zde vidíte všechny záznamy. Nový záznam přidáte tlačítkem "Přidat docházku". Zaplacené hodiny označíte tlačítkem "Označit jako zaplaceno".

### Jak zjistit, kolik personálu potřebuji na akci?
Systém automaticky doporučí počet na základě **vzorců** (**Personál → Vzorce**). Na dashboardu akce v kartě "Staff Planning" vidíte doporučení vs. skutečný stav.

### Jak nastavit cenový přepis pro konkrétní datum?
**Cenník** → sekce "Datové přepisy" → přidejte nový přepis s datem, cenami a důvodem.

### Jak importovat receptury?
**Receptury** → tlačítko "Import z Excelu" → nahrajte soubor .xlsx/.xls s recepturami.

### Jak fungují partnerské ceny?
1. Vytvořte partnera v sekci **Partneři**
2. Nastavte cenový model (Default/Custom/Flat)
3. Nastavte detekční e-maily/klíčová slova
4. Systém automaticky rozpozná rezervace od partnera a aplikuje jeho ceny

### Jak vytvořit floor plan pro akci?
1. Nejprve vytvořte budovy a místnosti v **Areál → Budovy**
2. Volitelně vytvořte šablonu v **Areál → Šablony** a navrhněte rozložení v **Designéru**
3. V editaci akce na záložce **Stoly** můžete rozmístit stoly a načíst šablonu

### Jak uzavřít pokladnu?
V sekci **Pokladna** na detailu pokladny (hlavní nebo akce) proveďte uzávěrku - zadejte skutečný stav hotovosti. Systém porovná s očekávaným stavem a zaznamená rozdíl.

### Jak převést peníze mezi pokladnami?
Na dashboardu akce nebo v pokladně akce použijte funkci převodu. Zadejte částku a popis. Převod musí být potvrzen.

### Jak zablokovat datum pro rezervace?
**Správa → Blokovaná data → Přidat** → zadejte datum (nebo rozsah), důvod a volitelně projekt.

### Jak přidat nového uživatele?
**Správa → Uživatelé → Vytvořit uživatele** → zadejte e-mail a heslo. Poté přiřaďte role přes **Správa → Role** nebo individuální oprávnění.

### Kde najdu log přihlášení?
Přes API endpoint `/api/user-login-logs` (pouze admin). Zobrazuje: čas, IP adresu, user agent.

### Jak nastavit údaje na fakturách?
**Správa → Nastavení** → záložky Firma, Bankovní údaje a Fakturace. Tyto údaje se automaticky přenášejí jako dodavatel na všechny faktury.
