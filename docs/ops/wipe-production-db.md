# Smazání produkční databáze (wipe)

**⚠️ DESTRUKTIVNÍ OPERACE — neexistuje návrat zpět bez zálohy.**

Tento postup smaže **všechny tabulky** ve schématu `public` (včetně `doctrine_migration_versions`), ignoruje cizí klíče díky `CASCADE` a připraví DB k čisté migraci ze schématu v kódu.

---

## Kdy použít

- Kompletní reset prostředí (před znovunasazením od nuly)
- Zbavení se nekonzistentních seed dat
- Plánovaný přechod na nové schéma bez historie

**Nepoužívat** pro běžnou údržbu. Pro drobné čištění použij `doctrine:migrations:execute --down` nebo cílený DELETE.

---

## Předpoklady

- PostgreSQL (`psql` klient dostupný na stroji s přístupem k produkční DB)
- Nastavená proměnná `DATABASE_URL`, případně `PGHOST` / `PGUSER` / `PGPASSWORD` / `PGDATABASE`
- Přístup k aplikačnímu serveru pro spuštění `php bin/console doctrine:migrations:migrate`

---

## Postup

### 1. Zastav aplikaci
Aby nikdo do DB nepsal mezi smazáním a znovu-migrací:

```bash
# příklad pro systemd
sudo systemctl stop folkloregardenadmin

# nebo docker / nginx / php-fpm dle prostředí
```

### 2. Zálohuj (povinné)

```bash
pg_dump -Fc "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).dump
```

Ověř, že soubor má smysluplnou velikost (ne pár kB):

```bash
ls -lh backup_*.dump
```

### 3. Spusť wipe skript

SQL skript leží v [`sql/wipe_all_tables.sql`](../../sql/wipe_all_tables.sql).

```bash
cd /path/to/folkloregardenadmin
psql "$DATABASE_URL" -f sql/wipe_all_tables.sql
```

Výstup na konci:

```
 tablename
-----------
(0 rows)
```

Pokud je seznam prázdný, schéma je čisté.

### 4. Spusť migrace znovu

```bash
cd api
php bin/console doctrine:migrations:migrate --no-interaction --env=prod
```

Doctrine projde všechny migrace v `api/migrations/` a vytvoří tabulky od nuly.

### 5. (volitelné) Nahraj seed data / admin uživatele

```bash
# Seed uživatelských rolí + oprávnění
php bin/console app:seed-permissions --env=prod

# Další seedy dle potřeby
```

### 6. Spusť aplikaci

```bash
sudo systemctl start folkloregardenadmin
```

### 7. Smoke test

- Přihlášení admina
- Založení testovací rezervace
- Výpis událostí na `/events`

---

## Rollback

Pokud něco selže, obnov ze zálohy **na čisté DB**:

```bash
# Smaž aktuální (poškozený) stav
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Obnov ze zálohy
pg_restore -d "$DATABASE_URL" --clean --if-exists --no-owner backup_YYYYMMDD_HHMMSS.dump
```

---

## Proč `DROP TABLE ... CASCADE` a ne `TRUNCATE`?

| Operace | Výsledek | Kdy použít |
|---------|----------|-----------|
| `DROP SCHEMA public CASCADE; CREATE SCHEMA public` | Smaže všechno včetně typů, sekvencí, funkcí, rolí. | Nejčistší reset. Vyžaduje mít práva vytvořit schéma. |
| **`DROP TABLE ... CASCADE`** (tento skript) | Smaže všechny tabulky, indexy a vazby, ale schéma `public` + granty zůstanou. | Doporučené — funguje i s omezenými právy. |
| `TRUNCATE ... CASCADE` | Vyprázdní data, nechá strukturu i migrace. | Pokud chceš ponechat strukturu a jen data smazat. |

Variantu A (`DROP SCHEMA`) a B (`TRUNCATE`) najdeš zakomentované v `sql/wipe_all_tables.sql` jako alternativy.

---

## Bezpečnostní checklist před spuštěním

- [ ] Jsem si jist, že cílová DB je ta správná (`echo $DATABASE_URL | sed 's/:.*@/@/'`)
- [ ] Záloha existuje a má nenulovou velikost
- [ ] Aplikace je zastavená (nikdo nepíše)
- [ ] Vím, kde jsou seed commandy pro doplnění admin uživatele
- [ ] Mám plán B pro rollback ze zálohy
