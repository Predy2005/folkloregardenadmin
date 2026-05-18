# Partner API — kompletní dokumentace

Externí integrace pro partnery (cestovní kanceláře, hotely, průvodci),
autentizované přes API klíč. Partneři mohou přes vlastní systémy vytvářet
rezervace, číst stav svých rezervací a rušit je.

## 1. Co to je

Folklore Garden má **dva** světy uživatelů:

| Svět | Kdo | Jak se přihlašuje | Co vidí |
|---|---|---|---|
| **Admin UI** | Personál, manažeři, super-admin | `/auth/login` → JWT token | Vše podle role/permissions (viz CLAUDE.md sekce Authentication) |
| **Partner API** | Externí systémy partnerů | `X-API-Key` HTTP hlavička | **Jen své** rezervace, profile, omezené operace |

Partneři **nikdy nemají přístup do admin UI**. Komunikují čistě přes HTTP API
z vlastních systémů (rezervační widget na hotelovém webu, booking platforma
cestovní kanceláře, server-to-server integrace).

## 2. Architektura — vysoký přehled

```
┌──────────────────────┐
│ Partner systém       │
│ (hotel, CK, widget)  │
└──────────┬───────────┘
           │ HTTPS + X-API-Key: fgsk_...
           ▼
┌──────────────────────────────────────────────────────────┐
│ Symfony API (api/)                                       │
│                                                          │
│  ┌─────────────────┐  ┌────────────────────────────────┐ │
│  │ partner_api     │  │ PartnerApiKeyAuthenticator     │ │
│  │ firewall        │─▶│  1. čte X-API-Key              │ │
│  │ ^/api/partner-  │  │  2. SHA-256 hash               │ │
│  │   api|doc/      │  │  3. lookup partner.api_key_hash│ │
│  │   partner       │  │  4. audit api_key_last_used_at │ │
│  └─────────────────┘  │  5. vytvoří PartnerSecurityUser│ │
│                       └────────────┬───────────────────┘ │
│                                    │ ROLE_PARTNER         │
│                                    ▼                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │ PartnerApiController (#[IsGranted('ROLE_PARTNER')])│  │
│  │   GET    /me                                       │  │
│  │   GET    /reservations                             │  │
│  │   GET    /reservations/{id}                        │  │
│  │   POST   /reservations                             │  │
│  │   PATCH  /reservations/{id}/cancel                 │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Ownership: každý read/write filtruje na                 │
│             reservation.partner_id = current.id          │
└──────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌──────────────────────────┐
                    │ PostgreSQL — partner     │
                    │   api_key_hash (SHA-256) │
                    │   api_key_last4          │
                    │   api_key_generated_at   │
                    │   api_key_last_used_at   │
                    └──────────────────────────┘
```

## 3. Co vidí kdo

### 3a. Admin (`ROLE_ADMIN` nebo vyšší)

- **Plný Swagger** na `GET /api/doc` (po JWT loginu) — všechny endpointy
  napříč aplikací včetně partner-api.
- **Správa partner API klíčů** v UI `/partners/{id}/edit` → karta **API klíč**:
  - **Vygenerovat** (partner ho zatím nemá) — Dialog s plaintext klíčem,
    auto-select po kliku, copy button. **Klíč se ukáže jen jednou.**
  - **Rotovat** — invaliduje starý, vygeneruje nový. Stávající integrace
    partnera okamžitě přestanou fungovat.
  - **Zneplatnit** — smaže hash z DB. Partner se nemůže autentizovat dokud
    nedostane nový klíč.
  - Display: `Klíč končí na ...XXXX`, `Vytvořen DD.MM.YYYY HH:MM`,
    `Naposled použit DD.MM.YYYY HH:MM` (nebo `Klíč zatím nepoužit`).
- **Backend endpointy pro admina** (gate `partners.update`):
  - `POST /api/partner/{id}/api-key` — generate/rotate, vrací plaintext
  - `DELETE /api/partner/{id}/api-key` — revoke
- **Plaintext klíče nevidí nikdo zpětně** — admin ho musí předat partnerovi
  bezpečným kanálem (signal, e-mail s expirací, šifrovaný kanál).

### 3b. Partner (`ROLE_PARTNER` — auth via `X-API-Key`)

| Endpoint | Co dostane |
|---|---|
| `GET /api/partner-api/me` | Vlastní profile + timestamps audit klíče |
| `GET /api/partner-api/reservations?limit=50&offset=0` | List **vlastních** rezervací (filter `partnerId = current`), order date DESC, paginace 1–200 |
| `GET /api/partner-api/reservations/{id}` | Detail vlastní rezervace + osoby. Cizí → **404** (ne 403, neunikne info o existenci) |
| `POST /api/partner-api/reservations` | Vytvořit rezervaci pro sebe. Server vynutí `partnerId = current`, klient ho **nepřebije**. Status nastaven na `RECEIVED`, source `PARTNER_API`. |
| `PATCH /api/partner-api/reservations/{id}/cancel` | Zrušit vlastní rezervaci. Whitelist statusů: `RECEIVED`, `CONFIRMED`, `WAITING_PAYMENT`. Stavy `PAID`/`AUTHORIZED` vrací **409** (refund je admin-only). |
| `GET /api/doc/partner` | Vlastní Swagger UI — gated **HTTP Basic Auth** (`swagger_username` + heslo z `SwaggerAccessCard`). Po loginu UI **automaticky pre-fillne X-API-Key** krátkodobým alias klíčem `fgsk_swagger_*` (TTL 1h), takže "Try it out" funguje hned bez vkládání production klíče. |
| `GET /api/doc/partner.json` | OpenAPI 3.0 spec partner subsetu — gated stejně jako UI (Basic Auth). Import do Postman/Insomnia/editor.swagger.io vyžaduje login. |

**Partner NESMÍ:**
- Vidět rezervace jiných partnerů (filter `partnerId`)
- Vytvořit rezervaci s `partnerId` jiného partnera (server přepíše)
- Zrušit zaplacenou rezervaci (`PAID`/`AUTHORIZED` → 409)
- Editovat libovolná pole rezervace (PATCH/PUT general update **neexistuje** v partner-api, jen cancel)
- Vidět admin Swagger (`/api/doc` → 401)
- Vidět cizí partnery (`/api/partner/{id}` je admin endpoint, gateováno JWT)

## 4. Kde se to nastavuje (mapa souborů)

### Konfigurace
- `api/config/packages/security.yaml`
  - Provider `partner_swagger_provider` (id `App\Security\PartnerSwaggerUserProvider`)
  - Firewall `partner_api` (pattern `^/api/partner-api`, custom_authenticator `PartnerApiKeyAuthenticator`)
  - Firewall `partner_swagger_ui` (pattern `^/api/doc/partner`, `http_basic`, provider `partner_swagger_provider`)
  - Firewall `admin_swagger_ui` (pattern `^/api/doc`, `http_basic`, provider `app_user_provider`)
  - access_control: `^/api/partner-api → ROLE_PARTNER`, `^/api/doc/partner → ROLE_PARTNER_SWAGGER`, `^/api/doc → ROLE_ADMIN`
- `api/config/packages/nelmio_api_doc.yaml` — Swagger areas `default` (admin) a `partner` (path_pattern `^/api/partner-api`)
- `api/config/routes/nelmio_api_doc.yaml` — 4 swagger routes

### Kód
- `api/src/Entity/Partner.php` — DB sloupce `apiKeyHash`, `apiKeyLast4`, `apiKeyGeneratedAt`, `apiKeyLastUsedAt` + `swaggerUsername`, `swaggerPasswordHash`, `swaggerCredentialsGeneratedAt`
- `api/src/Security/PartnerSecurityUser.php` — Symfony `UserInterface` wrapper kolem Partner pro X-API-Key auth, vrací `['ROLE_PARTNER']`
- `api/src/Security/PartnerSwaggerUser.php` — wrapper pro Basic Auth do partner Swageru, vrací `['ROLE_PARTNER_SWAGGER']`, `getPassword()` = bcrypt hash z DB
- `api/src/Security/PartnerSwaggerUserProvider.php` — `UserProviderInterface` pro `partner_swagger_provider`, lookup podle `swaggerUsername` (jen aktivní partneři)
- `api/src/Security/PartnerApiKeyAuthenticator.php` — custom auth, dvě cesty: alias key (prefix `fgsk_swagger_`, HMAC verify) nebo standardní production klíč (SHA-256 lookup, audit)
- `api/src/Service/PartnerApiKeyService.php` — `generate(Partner)` / `revoke(Partner)` / `hash(string)`. Plaintext klíče vrací jednou, nikdy neukládá.
- `api/src/Service/SwaggerAccessService.php` — `generateCredentials(Partner)` / `revokeCredentials(Partner)` / `verifyPassword(Partner, plaintext)` / `issueAliasKey(Partner)` / `verifyAliasKey(string)`. APP_SECRET jako HMAC secret pro aliasy.
- `api/src/Twig/SwaggerAccessExtension.php` — Twig funkce `partner_alias_key()`, volaná z override šablony.
- `api/templates/bundles/NelmioApiDocBundle/SwaggerUi/index.html.twig` — override standardního Nelmio template; injektuje `<meta name="partner-alias-api-key">` a po `loadSwaggerUI()` zavolá `ui.preauthorizeApiKey('ApiKey', alias)`.
- `api/src/Controller/PartnerController.php` — admin endpointy pro správu klíčů (`POST/DELETE /api/partner/{id}/api-key`)
- `api/src/Controller/PartnerApiController.php` — 5 partner-facing endpointů + OpenAPI annotace

### UI (admin)
- `client/src/modules/partners/components/edit/ApiKeyCard.tsx` — karta v `/partners/{id}/edit` profile tabu

### Migrace
- `api/migrations/Version20260515093000.php` + `api/prod_migrations/20260515093000_partner_api_key.php` — schema
- `api/migrations/Version20260515094500.php` + `api/prod_migrations/20260515094500_partner_api_key_last_used.php` — audit sloupec

## 5. Bezpečnostní model

### 5a. Generování klíče
1. Admin klikne **Vygenerovat klíč** v UI
2. `PartnerApiKeyService::generate()`:
   - `bin2hex(random_bytes(24))` → 48 hex znaků
   - Prefix `fgsk_` (Folklore Garden Service Key)
   - SHA-256 hash plaintext → uloženo do `partner.api_key_hash`
   - Last 4 znaky plaintextu → `partner.api_key_last4` (display only)
   - `partner.api_key_generated_at = NOW()`
3. **Plaintext se vrátí adminovi v API response jednou** — pak je v paměti GC a v DB jen hash.

### 5b. Autentizace
1. Partner pošle `X-API-Key: fgsk_...` v hlavičce
2. `PartnerApiKeyAuthenticator::authenticate()`:
   - `hash('sha256', $plaintext)` → 64 hex znaků
   - Dohledání přes `partner_repository.findOneBy(['apiKeyHash' => $hash])`
   - Pokud nenajde nebo `!isActive` → `CustomUserMessageAuthenticationException` → 401 JSON
   - Audit: `partner.api_key_last_used_at = NOW()`, flush
   - Vrátí `PartnerSecurityUser($partner)` jako autentizovaný user
3. Symfony dál tečuje `ROLE_PARTNER` přes `PartnerSecurityUser::getRoles()`.

### 5c. Ownership check
Každý read/write endpoint, který se dotýká rezervace, používá `findOwnedReservation($id)`:
```php
$r = $this->reservations->find($id);
if (!$r) return null;
if ($r->getPartnerId() !== $this->currentPartner()->getId()) return null;
return $r;
```
Cizí rezervace vrátí 404 (ne 403), aby útočník neviděl, zda ID existuje.

### 5d. Audit & rotace
- Každá úspěšná auth zapíše `api_key_last_used_at` — admin v UI vidí "Naposled
  použit X" a může detekovat dlouho neaktivní klíče
- Pokud klíč unikne: admin v UI klikne **Rotovat** → starý hash je přepsán
  novým, partner přestane mít přístup, dokud nedostane nový klíč
- DB index `uniq_partner_api_key_hash WHERE api_key_hash IS NOT NULL` —
  partial unique, nekonfliktuje partnery bez klíče

## 6. Příklady použití (curl)

```bash
KEY="fgsk_..."

# 1. Kdo jsem
curl -H "X-API-Key: $KEY" https://api.folkloregarden.cz/api/partner-api/me

# 2. Moje rezervace
curl -H "X-API-Key: $KEY" \
  "https://api.folkloregarden.cz/api/partner-api/reservations?limit=20&offset=0"

# 3. Nová rezervace
curl -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -X POST https://api.folkloregarden.cz/api/partner-api/reservations \
  -d '{
    "date": "2026-08-20",
    "contactName": "Anna Nowak",
    "contactPhone": "+48123456789",
    "contactNationality": "PL",
    "contactEmail": "anna@hotel.pl",
    "contactNote": "VIP, allergie na ořechy",
    "persons": [
      {"type": "adult", "menu": "MAIN_MENU"},
      {"type": "adult", "menu": "MAIN_MENU"},
      {"type": "child", "menu": "CHILDREN_MENU"}
    ]
  }'

# 4. Detail
curl -H "X-API-Key: $KEY" \
  https://api.folkloregarden.cz/api/partner-api/reservations/707

# 5. Storno
curl -H "X-API-Key: $KEY" -X PATCH \
  https://api.folkloregarden.cz/api/partner-api/reservations/707/cancel

# 6. Stáhnout OpenAPI spec do souboru (lze importovat do Postman/Insomnia)
curl -H "X-API-Key: $KEY" \
  https://api.folkloregarden.cz/api/doc/partner.json \
  -o partner-api.json
```

## 7. Troubleshooting

### "Chybí nebo prázdná X-API-Key hlavička" (401)
- Nezapomněl jsi v shellu `export KEY="fgsk_..."`?
- Nový terminál = prázdný env. Ověř: `echo "len=${#KEY}"`.

### "Neplatný nebo zneplatněný API klíč" (401)
- Klíč byl rotován / zneplatněn → admin v UI vygeneruje nový a předá
- Klíč je správný, ale partner má `isActive = false` → admin v UI aktivuje

### "Rezervace nenalezena" (404 na vlastní rezervaci)
- Rezervace nemá `partnerId = current` — možná byla vytvořena ručně adminem
  bez napárování na partnera. Admin v `/reservations/{id}/edit` může partnera doplnit.

### "Rezervaci ve stavu `PAID` nelze zrušit" (409)
- Zaplacené rezervace mají refund flow přes admin UI. Partner musí poslat
  request o storno adminovi mimo API.

### Swagger UI v prohlížeči vrací 401
- Partner musí mít vygenerované **Swagger credentials** (`SwaggerAccessCard` v `/partners/{id}/edit`). Bez nich `/api/doc/partner` vrátí Basic Auth challenge a partner nemá co zadat.
- Když se UI po loginu načte, ale "Try it out" stejně vrací 401: alias klíč nemusel doexpirovat. Refresh stránky vystaví nový alias (TTL 1h od loginu).
- Admin Swagger (`/api/doc`) — přihlas se **stejným adminským username/heslem**, které používáš pro frontend login. Pokud máš `ROLE_MANAGER` nebo nižší, dostaneš 403; jen `ROLE_ADMIN`+.

### Swagger UI ukáže jen "NelmioApiDocBundle" nebo prázdnou stránku
- Strict CSP blokuje `cdn.jsdelivr.net` (odkud Nelmio servíruje swagger-ui-bundle.js a CSS). `SecurityHeadersListener` má výjimku pro `^/api/doc*` paths — pokud výjimka chybí (např. po merge konfliktu nebo refactoru listeneru), nahodí se jen alt text loga.
- Ověř v DevTools → Network: musíš vidět 200 na `swagger-ui-bundle.js` z jsdelivr. Pokud jsou requesty červené s "Refused to load… violates CSP", oprav listener.
- Inline `<script>` v `templates/bundles/NelmioApiDocBundle/SwaggerUi/index.html.twig` potřebuje `script-src 'unsafe-inline'`. Bez něj `loadSwaggerUI()` neběží a UI je prázdné.

### Klíč existuje, ale `last_used_at` se neaktualizuje
- Možná posíláš na cache-d endpoint nebo přes proxy bez `X-API-Key` propagace
- Ověř raw curl proti aplikaci přímo, sleduj Symfony log
- Migrace `Version20260515094500` musí být aplikovaná, jinak sloupec neexistuje

## 8. Lifecycle scénáře

### Onboarding nového partnera
1. Admin vytvoří `Partner` entitu v `/partners` (jméno, kategorie, atd.)
2. Otevře `/partners/{id}/edit` → karta API klíč → **Vygenerovat**
3. Zkopíruje plaintext z dialogu
4. Předá partnerovi bezpečným kanálem (např. PGP-encrypted email)
5. Partner si nakonfiguruje svůj systém s tímto klíčem
6. Partner zavolá `GET /api/partner-api/me` jako smoke test → 200
7. Admin v UI vidí "Naposled použit X" → integrace funguje

### Onboarding interaktivní dokumentace (Swagger UI)
1. V `/partners/{id}/edit` → karta **Swagger UI přístup** → **Vygenerovat přístup**
2. Dialog ukáže `username` + plaintext heslo (oba copy buttony, **uvidíš jen jednou**)
3. Pošli partnerovi: `https://api.folkloregarden.cz/api/doc/partner` + credentials
4. Partner otevře URL, prohlížeč ho vyzve k Basic Auth → vyplní username/heslo
5. Swagger UI se načte a **automaticky vyplní X-API-Key** krátkodobým alias klíčem (TTL 1h)
6. Partner může rovnou klikat "Try it out" — všechny endpointy fungují bez vkládání production klíče
7. Pokud session vyexspiruje (po 1h), partner refreshne stránku → nový alias

### Klíč unikl / partner žádá rotaci
1. Admin otevře `/partners/{id}/edit` → karta API klíč → **Rotovat**
2. Potvrdí AlertDialog — starý klíč je okamžitě neaktivní
3. Zkopíruje nový plaintext a předá partnerovi
4. Partner aktualizuje konfiguraci

### Ukončení spolupráce s partnerem
1. Admin **Zneplatnit** v UI — klíč smazán z DB
2. Doporučeno taky `partner.isActive = false` aby nedošlo k případné
   reaktivaci klíče omylem
3. Existující rezervace partnera zůstávají v DB, jen nejdou modifikovat
   přes API

## 9. Plánovaná rozšíření (out of scope nyní)

- **Per-key rate limiting** (např. 60 req/min na klíč)
- **Webhook notifikace partnerům** (event "rezervace.confirmed" / "platba.přijata")
- **Více klíčů na partnera** (pro multi-environment integrace — test/prod)
- **Read-only klíče** (jen GET, ne POST/PATCH)
- **IP whitelist** per klíč
- **Granulární partner permissions** (zatím všichni partneři mají stejný scope)
