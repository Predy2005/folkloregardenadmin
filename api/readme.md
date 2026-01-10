Folklore Garden API – Dokumentace (api/src)

Tento dokument popisuje připravené entity, repository (včetně klíčových metod), controllery a dostupné endpointy v části aplikace api/src.

Obsah
- Jak spustit projekt (lokálně)
- Přehled entit (modelů) a jejich polí/vztahů
- Repository a jejich důležité metody
- Controllery a API endpointy (cesty, metody, stručný popis, vstupy/výstupy)
- Poznámky k bezpečnosti, e‑mailům a platbám

Jak spustit projekt
- Požadavky: PHP 8.2+, Composer, PostgreSQL (nebo DB dle nastavení), rozumně nastavené .env proměnné.
- Instalace závislostí: composer install (v adresáři api)
- Migrace DB:
  - php bin/console doctrine:migrations:diff
  - php bin/console doctrine:migrations:migrate
- Revize entit (generování getterů/setterů apod.): php bin/console make:entity --regenerate App\Entity
- Obnovení schématu bez smazání dat: použijte standardní migrace. Pokud je nutné kompletní přegenerování:
  - php bin/console doctrine:schema:drop --force --full-database
  - php bin/console doctrine:schema:create
  - následně diff + migrate (viz výše)
- Lokální server: php -S localhost:8000 -t public

Pozn.: Přístupové údaje, SMTP, Comgate apod. nastavujte pomocí prostředí (.env/.env.local). Do repozitáře nepatří produkční tajemství.

Přehled entit (App\Entity)
1) Reservation
- Tabulka: reservation
- Pole
  - id: int (PK)
  - date: date – datum představení/rezervace
  - status: string(20) – výchozí "RECEIVED"; další hodnoty např. WAITING_PAYMENT, PAID, CANCELLED, AUTHORIZED, CONFIRMED
  - contactName, contactEmail, contactPhone, contactNationality: základní kontaktní údaje
  - clientComeFrom: odkud klient přišel (např. „Hotelová recepce / Leták“, „jiné“)
  - contactNote: poznámka (TEXT, nullable)
  - invoiceSameAsContact: bool
  - invoiceName, invoiceCompany, invoiceIc, invoiceDic, invoiceEmail, invoicePhone: fakturační údaje (nullable)
  - transferSelected: bool
  - transferCount: int|null – počet osob pro transfer
  - transferAddress: string|null – adresa pro transfer
  - agreement: bool – souhlas s podmínkami
  - createdAt, updatedAt: datetime
- Vztahy
  - persons: OneToMany -> ReservationPerson (cascade persist/remove)
  - payments: OneToMany -> Payment (cascade persist/remove)

2) ReservationPerson
- Tabulka: reservation_person
- Pole
  - id: int (PK)
  - reservation: ManyToOne -> Reservation (onDelete: CASCADE)
  - type: string(20) – "adult" | "child" | "infant"
  - menu: string – kód jídla (viz App\Enum\FoodMenu)
  - price: decimal(10,2) – vypočtená cena osoby (základ + případný příplatek za jídlo)

3) Payment
- Pole
  - id: int (PK)
  - transactionId: string – ID transakce Comgate
  - status: string – stav platby (PAID, CANCELLED, AUTHORIZED, PENDING, CREATED...)
  - reservationReference: string – referenční ID (ID rezervace)
  - createdAt: datetime
  - amount: float – uložená částka (viz poznámky k haléřům)
  - updatedAt: datetime|null
  - reservation: ManyToOne -> Reservation (nullable)

4) ReservationFoods
- Pole
  - id: int (PK)
  - name: string – název položky (např. "Standardní menu - Tradiční")
  - description: text|null
  - price: int – doplatek za jídlo (Kč)
  - isChildrenMenu: bool – zda je určené dětem
- Pomocná metoda loadReservationFoods(EntityManagerInterface): naplnění výchozími položkami

5) DisabledDates
- Pole
  - id: int (PK)
  - dateFrom: date – začátek blokace
  - dateTo: date|null – konec blokace (pokud není, blokuje se 1 den)
  - reason: string|null – důvod
  - project: string|null – např. "reservations"

6) User
- Tabulka: user (quoted – rezervované slovo)
- Pole
  - id: int (PK)
  - username: string(180) unique
  - email: string unique
  - password: string (hash)
  - roles: json
  - lastLoginAt: datetime|null
  - lastLoginIp: string(45)|null
  - createdAt, updatedAt: datetime
  - resetToken: string(64)|null, resetTokenExpiresAt: datetime|null

7) UserLoginLog
- Pole
  - id: int (PK)
  - user: ManyToOne -> User (onDelete: CASCADE)
  - loginAt: datetime
  - ipAddress: string(45)|null
  - userAgent: string(255)|null

Enum a konfigurace
- App\Enum\FoodMenu: výčet menu (kódy jako řetězce: "5", "6", ..., prázdný pro "Bez jídla").
  - getLabel(): zobrazený název položky
  - getPrice(): doplatek (Kč); standardní menu 0 Kč, speciální +75 Kč
- App\Config\SpecialDateRules: logika výpočtu cen, povolených menu a ceny transferu podle data (používá se v ReservationControlleru).

Repository (App\Repository)
- ReservationRepository
  - getReservationDetail(int $reservationId): ?array – vrací rezervaci s osobami; joinuje menu dle názvu (ReservationFoods) pro obohacení.
- ReservationPersonRepository
  - Základní CRUD (od ServiceEntityRepository).
- ReservationFoodsRepository
  - findChildrenMenus(): array – všechny dětské menu
  - findByFoodName(string $name): array – vyhledání dle části názvu
- DisabledDatesRepository
  - findByProject($project): array – disabled data pro projekt (seřazení vzestupně)
  - findOneByDate($date): ?DisabledDates – zde se očekává hledání záznamu pro daný den
- PaymentRepository, UserRepository, UserLoginLogRepository
  - Základní CRUD metody.

Controllery a API endpointy (App\Controller)
1) ApiController
- GET /api – základní odpověď
- GET /api/test – jednoduchý test dostupnosti API

2) AuthController
- POST /auth/register
  - Body JSON: { email: string, password: string }
  - Výstup: { status, token } – JWT token
- POST /auth/login
  - Obsluhuje security systém (nepřímá akce v metodě)
- POST /auth/logout – odpoví 200 OK
- POST /auth/forgot-password
  - Body: { email }
  - Nastaví resetToken (+ expiraci) uživateli; vrací { resetToken }
- POST /auth/reset-password
  - Body: { resetToken, newPassword }
  - Změní heslo po kontrole platnosti tokenu
- GET /auth/user
  - Návrat: informace o přihlášeném uživateli (id, email, username, roles) nebo 401

3) UserController
- GET /api/users – seznam uživatelů (id, username, email, roles, lastLoginAt, lastLoginIp)
- POST /api/users – vytvoření uživatele
  - Body (volitelné klíče): username, email, name?, role, password
- PUT|PATCH /api/users/{id} – úprava uživatele (stejná pole jako výše)
- DELETE /api/users/{id} – smazání uživatele

4) UserLoginLogController
- GET /api/user-login-logs – seznam logů přihlášení (id, userId, loginAt, ipAddress, userAgent)

5) ReservationFoodsController
- GET /api/reservation-foods – seznam jídel
- POST /api/reservation-foods – vytvoření jídla
  - Body: { name, description?, price, isChildMenu }
- PUT|PATCH /api/reservation-foods/{id} – úprava jídla
- DELETE /api/reservation-foods/{id} – smazání jídla

6) DisabledDatesController (prefix /api/disable-dates)
- GET /api/disable-dates – přehled blokovaných dat
- POST /api/disable-dates – vytvoření blokace
  - Body: buď { date } pro 1 den, nebo { dateFrom, dateTo? }, volitelně { reason, project }
- PUT /api/disable-dates/{id} – úprava záznamu (date/dateFrom/dateTo, reason, project)
- DELETE /api/disable-dates/{id} – smazání

7) PaymentController
- POST /api/payment/create – vytvoření platby u Comgate
  - Body: { price: int, label: string, refId: int, email: string, method?: string }
  - Vytvoří Payment, uloží transId, vrátí { redirect } URL na platební bránu
- POST /payment/notify a POST /api/payment/notify – notifikace z Comgate
  - Přijme data, ověří stav pomocí Comgate API, uloží/aktualizuje Payment a vrátí { message: "OK" }
- GET /api/payment/status/{refId} – dotaz na stav platby dle refId (ID rezervace)
- GET /api/payment/list – filtrace a výpis plateb; zahrnuje vybraná pole z rezervace
  - Query parametry: dateFrom, dateTo, status, search
- POST|GET /payment/result – HTML stránka s výsledkem platby (OK i při chybě kvůli redirectu z brány)
- POST /payment/status – technický endpoint pro příjem stavů s kontrolou podpisu (digest)
- GET /api/payment/test-create – testovací vytvoření platby (100 Kč)

8) ReservationController
- GET /api/reservations – seznam všech rezervací (s osobami a platbami, řazeno dle createdAt DESC)
- GET /api/reservation/{id} – detail rezervace včetně osob, plateb a seznamu jídel
- POST /reservations – vytvoření rezervace (veřejný endpoint formuláře)
  - Vstupní JSON (zkráceně):
    - date: YYYY-MM-DD
    - contact: { name, email, phone, nationality, note?, clientComeFrom? }
    - invoice: { sameAsContact: bool, name?, company?, ico?, dic?, email?, phone? }
    - transfer: { selected: bool, count?, address? }
    - persons: [ { type: "adult|child|infant", menu: string-kód }, ... ]
    - agreement: bool
    - withPayment: bool, paymentMethod?: "ALL|CARD|..."
  - Logika:
    - Není možné vytvořit rezervaci na dnešní den po 18:00 (Europe/Prague)
    - Ověření e‑mailu
    - Výpočet ceny:
      - Základní cena podle typu osoby a data (SpecialDateRules)
      - Příplatek za jídlo (FoodMenu::getPrice)
      - Transfer: count × cena za osobu (SpecialDateRules)
    - Povolená menu pro vybrané dny (SpecialDateRules::getAllowedMenus)
    - Pokud withPayment = true, volá se /api/payment/create a vrací se { redirect } URL
    - Po vytvoření se odesílá potvrzovací e‑mail (viz níže)

9) SmartDriveController (prefix /smart-drive)
- GET /smart-drive/ – jednoduché OK
- GET|POST /smart-drive/assign – odešle FCM notifikaci (vyžaduje deviceToken a payload)
- GET /smart-drive/overview – ukázkový přehled jízd

10) TestReservationEmailController
- GET /api/test/reservation-email – odešle testovací potvrzovací e‑mail (HTML) s demo daty

E‑maily
- K odesílání slouží Symfony Mailer (MAILER_DSN v prostředí). Potvrzení rezervace je odesíláno z adresy info@folkloregarden.cz na info@folkloregarden.cz a v kopii na e‑mail zákazníka.
- Šablona e‑mailu je generována v ReservationController::generateConfirmationEmail(). Lokalizace položek jídel dle FoodMenu, ceny dle SpecialDateRules, podpora CZ/EN (dle národnosti).

Platby (Comgate)
- Konfigurace se čte z prostředí: COMGATE_MERCHANT, COMGATE_SECRET, COMGATE_URL, COMGATE_NOTIFY_URL, COMGATE_TEST.
- Vytvoření platby vrací redirect URL na platební bránu. Stav se potvrzuje přes notify/status endpoints.
- Ceny: v kódu se používá integer cena v korunách pro součty a předává se Comgate jako integer v haléřích (pozor na převody v integračním kódu).

Bezpečnost a autentizace
- JWT (LexikJWTAuthenticationBundle). Klíče jsou v config/jwt (cesty v .env). Endpoints pro registraci, přihlášení, reset hesla viz AuthController.
- CORS nastaven přes nelmio/cors-bundle (viz .env a konfigurace).

Poznámky
- Prosím uchovávejte tajné hodnoty pouze v .env.local alebo v prostředí serveru. Do repozitáře je neukládejte.
- Pokud rozšíříte entity, spusťte migrace (viz výše) a doplňte případné validace.
- Některé repository metody jsou záměrně minimalistické a lze je dále specializovat dle potřeb administrace.
